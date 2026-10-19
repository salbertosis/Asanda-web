import { supabase } from '../supabase.js';
import { parseCsvFallback, parseHy3 } from './hy3Parser.js';
import { mappingPayload, reconcileHy3Preview } from './hy3Reconciliation.js';
import { buildHy3SnapshotDto } from './hy3Snapshot.js';

const id = (value, code) => { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.trim())) throw new Error(code); return value.trim(); };
const rows = (value) => Array.isArray(value) ? value : [];
const read = async (query) => { const { data, error } = await query; if (error) throw error; return data; };
const MAPPING_COLUMNS = 'id,provider,source_organization,external_code,mapping_kind,organization_id,athlete_id,resolution_status';

const normalizeMapping = (value) => ({
  id: typeof value?.id === 'string' ? value.id : '', provider: String(value?.provider || ''), source_organization: String(value?.source_organization || ''),
  external_code: String(value?.external_code || ''), mapping_kind: value?.mapping_kind, organization_id: value?.organization_id || null,
  athlete_id: value?.athlete_id || null, resolution_status: value?.resolution_status === 'resolved' ? 'resolved' : value?.resolution_status === 'rejected' ? 'rejected' : 'pending',
});

export const listResultCompetitions = async () => rows(await read(supabase.from('competitions').select('id,name,revision,status,starts_on,ends_on').order('starts_on').order('name')));

export const getResultReferences = async (competitionId) => {
  const competitionKey = id(competitionId, 'COMPETITION_REQUIRED');
  const [competition, events, athletes, organizations, mappings] = await Promise.all([
    read(supabase.from('competitions').select('id,name,revision,status').eq('id', competitionKey).maybeSingle()),
    read(supabase.from('competition_events').select('id,competition_id,event_definition_id,category_id,competitive_sex,round,sequence_number,status,event_definition:event_definitions(id,code,name,distance_metres,stroke,relay_size)').eq('competition_id', competitionKey).order('sequence_number')),
    read(supabase.from('athletes').select('id,display_name,publication_status').order('display_name')),
    read(supabase.from('organizations').select('id,name,short_name,organization_type,publication_status').eq('organization_type', 'club').order('name')),
    read(supabase.from('source_mappings').select(MAPPING_COLUMNS).eq('provider', 'hy-tek').order('source_organization').order('external_code')),
  ]);
  if (!competition) throw new Error('COMPETITION_NOT_FOUND');
  return { competition, events: rows(events), athletes: rows(athletes), organizations: rows(organizations), mappings: rows(mappings).map(normalizeMapping) };
};

export const saveResultMapping = async (values) => {
  const payload = mappingPayload(values); const mappingId = values.id ? id(values.id, 'MAPPING_REQUIRED') : null;
  const query = mappingId ? supabase.from('source_mappings').update(payload).eq('id', mappingId) : supabase.from('source_mappings').insert(payload);
  return normalizeMapping(await read(query.select(MAPPING_COLUMNS).single()));
};

const runWorker = (message) => new Promise((resolve, reject) => {
  if (typeof Worker !== 'function') { resolve(message.format === 'csv' ? parseCsvFallback(message.text) : parseHy3(message.bytes)); return; }
  const worker = new Worker(new URL('../../workers/hy3Import.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => { worker.terminate(); resolve(data); };
  worker.onerror = () => { worker.terminate(); reject(new Error('WORKER_FAILED')); };
  worker.postMessage(message, message.bytes ? [message.bytes] : []);
});

const digestText = async (value) => {
  if (!globalThis.crypto?.subtle || typeof TextEncoder !== 'function') throw new Error('CHECKSUM_UNAVAILABLE');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const submitChecksum = async ({ checksum, rows: sanitizedRows, correctionReason, correctionEvidence, sourceType }) => {
  const sourceChecksum = typeof checksum === 'string' && /^[a-f0-9]{64}$/i.test(checksum) ? checksum.toLowerCase() : '';
  if (sourceChecksum && !correctionReason && !correctionEvidence && sourceType !== 'manual') return sourceChecksum;
  return digestText(JSON.stringify({ sourceChecksum, sanitizedRows, correctionReason: correctionReason || null, correctionEvidence: correctionEvidence || null, sourceType }));
};

export const parseResultFile = async (file) => {
  if (!file || typeof file.name !== 'string') throw new Error('FILE_REQUIRED');
  if (/\.csv$/i.test(file.name)) return runWorker({ type: 'parse', format: 'csv', text: await file.text() });
  const buffer = await file.arrayBuffer(); return runWorker({ type: 'parse', bytes: buffer });
};

export const reconcileResultPreview = (parsed, references, options) => {
  if (!parsed?.ok || !parsed.preview) return parsed;
  return { ...parsed, reconciliation: reconcileHy3Preview(parsed.preview, references, options) };
};

export const previewResultFile = async (competitionId, file, options = {}) => {
  const [parsed, references] = await Promise.all([parseResultFile(file), getResultReferences(competitionId)]);
  return { ...reconcileResultPreview(parsed, references, options), references };
};

export const importHy3CompetitionSnapshot = async (parsed, preview = parsed?.preview) => {
  if (!parsed?.ok || !parsed.preview) throw new Error(parsed?.code || 'invalid-input');
  const sourceChecksum = typeof parsed.checksum === 'string' && /^[a-f0-9]{64}$/i.test(parsed.checksum)
    ? parsed.checksum.toLowerCase()
    : null;
  if (!sourceChecksum) throw new Error('CHECKSUM_UNAVAILABLE');
  const built = buildHy3SnapshotDto(preview);
  if (!built.ok) throw new Error(built.code);
  const { data, error } = await supabase.rpc('import_competition_result_snapshot', {
    requested_payload: built.payload,
    requested_source_checksum: sourceChecksum,
  });
  if (error) throw error;
  const saved = Array.isArray(data) ? data[0] : data;
  if (!saved?.import_id || !saved.competition_name || !Number.isInteger(saved.event_count) || !Number.isInteger(saved.result_count)) throw new Error('IMPORT_RESPONSE_INVALID');
  return {
    importId: saved.import_id,
    competitionName: saved.competition_name,
    eventCount: saved.event_count,
    resultCount: saved.result_count,
  };
};

export const commitResultImport = async ({ competitionId, expectedRevision, sanitizedRows, checksum, mappings = [], correctionReason = null, correctionEvidence = null, sourceType = 'hy3' }) => {
  if (!id(competitionId, 'COMPETITION_REQUIRED') || !Number.isInteger(expectedRevision) || expectedRevision < 1) throw new Error('REVISION_REQUIRED');
  if (!Array.isArray(sanitizedRows) || sanitizedRows.length === 0) throw new Error('RESULT_ROWS_REQUIRED');
  if (!Array.isArray(mappings) || mappings.some((mapping) => !mapping?.id || mapping.resolutionStatus === 'pending')) throw new Error('MAPPING_REQUIRED');
  if (!['hy3', 'csv', 'manual'].includes(sourceType)) throw new Error('SOURCE_TYPE_INVALID');
  if (correctionReason != null && (typeof correctionReason !== 'string' || !correctionReason.trim() || correctionReason.length > 2000)) throw new Error('CORRECTION_REASON_REQUIRED');
  if (correctionEvidence != null && (typeof correctionEvidence !== 'string' || !correctionEvidence.trim() || correctionEvidence.length > 4000)) throw new Error('CORRECTION_EVIDENCE_REQUIRED');
  if (sourceType === 'manual' && (!correctionReason?.trim() || !correctionEvidence?.trim())) throw new Error('CORRECTION_EVIDENCE_REQUIRED');
  if ((correctionReason && !correctionEvidence) || (!correctionReason && correctionEvidence)) throw new Error('CORRECTION_EVIDENCE_REQUIRED');
  const sourceChecksum = await submitChecksum({ checksum, rows: sanitizedRows, correctionReason, correctionEvidence, sourceType });
  const { data, error } = await supabase.rpc('commit_result_import', {
    requested_competition_id: competitionId,
    requested_expected_revision: expectedRevision,
    requested_sanitized_rows: sanitizedRows,
    requested_source_checksum: sourceChecksum,
    requested_mappings: mappings.filter((mapping) => mapping?.id).map(({ id: mappingId }) => ({ id: mappingId })),
    requested_correction_reason: correctionReason?.trim() || null,
    requested_source_type: sourceType,
    requested_correction_evidence: correctionEvidence?.trim() || null,
  });
  if (error) throw error;
  return { batchId: data, checksum: sourceChecksum };
};

export const formatResultImportError = (error) => {
  const message = String(error?.ok === false ? error.code : error?.message || error?.code || error || '').toLowerCase();
  if (message.includes('unsupported-version')) return 'El archivo HY3 usa una versión no compatible. No se habilitó la importación.';
  if (message.includes('malformed') || message.includes('invalid-record') || message.includes('invalid-input')) return 'El archivo no respeta el formato HY3 fijo. No se habilitó la importación.';
  if (message.includes('provisional')) return 'El archivo contiene resultados provisionales. Finalizalos antes de importar y publicar.';
  if (message.includes('unsupported-course')) return 'Las piscinas en yardas o con longitud desconocida no son compatibles con esta publicación.';
  if (message.includes('snapshot-metadata-incomplete')) return 'Completá los datos básicos de competencia, fechas, sede y piscina antes de publicar.';
  if (message.includes('snapshot-')) return 'La vista previa contiene datos deportivos inválidos o referencias incompletas.';
  if (message.includes('23505') || message.includes('duplicate') || message.includes('already imported') || message.includes('unique constraint')) return 'Esta competencia o este archivo ya fue importada y publicada.';
  if (message.includes('42501') || message.includes('permission') || message.includes('content editor') || message.includes('unauthorized')) return 'No tenés autorización activa de editor para importar y publicar resultados.';
  if (message.includes('pgrst202') || message.includes('function missing') || message.includes('rpc unavailable')) return 'La función de importación todavía no está disponible. Intentá nuevamente más tarde.';
  if (message.includes('mapping')) return 'Resolvé todas las identidades de equipos y atletas antes de continuar.';
  if (message.includes('revision') || message.includes('changed')) return 'La competencia cambió mientras revisabas el archivo. Generá una vista previa nueva.';
  if (message.includes('checksum_unavailable')) return 'No se pudo generar el checksum local. No es seguro publicar este archivo.';
  if (message.includes('checksum')) return 'Este archivo ya fue importado para la competencia seleccionada.';
  if (message.includes('correction') || message.includes('evidence')) return 'Las correcciones requieren un motivo y una evidencia de auditoría.';
  if (message.includes('atomic') || message.includes('result rows') || message.includes('failed event')) return 'No se importó ningún resultado: la validación transaccional rechazó la operación completa.';
  if (message.includes('competition')) return 'Seleccioná una competencia válida con un programa cargado.';
  if (message.includes('worker')) return 'No se pudo procesar el archivo localmente. Intentá nuevamente.';
  if (message.includes('file')) return 'Seleccioná un archivo HY3 válido.';
  return 'No se pudo importar ni publicar. Revisá el archivo e intentá nuevamente.';
};
