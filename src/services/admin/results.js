import { supabase } from '../supabase.js';
import { parseCsvFallback, parseHy3 } from './hy3Parser.js';
import { mappingPayload, reconcileHy3Preview } from './hy3Reconciliation.js';

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

export const formatResultImportError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('unsupported-version')) return 'El archivo HY3 usa una versión no compatible. No se habilitó la importación.';
  if (message.includes('malformed') || message.includes('invalid-record')) return 'El archivo no respeta el formato HY3 fijo. No se habilitó la importación.';
  if (message.includes('mapping')) return 'Resolvé todas las identidades de equipos y atletas antes de continuar.';
  if (message.includes('competition')) return 'Seleccioná una competencia válida con un programa cargado.';
  if (message.includes('worker')) return 'No se pudo procesar el archivo localmente. Intentá nuevamente.';
  if (message.includes('file')) return 'Seleccioná un archivo HY3 o CSV válido.';
  return 'No se pudo generar la vista previa saneada. Revisá el archivo e intentá nuevamente.';
};
