import { supabase } from '../supabase';

export const EVIDENCE_BUCKET = 'athlete-evidence';
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const extensions = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const columns = 'id,athlete_id,evidence_kind,evidence_label,storage_bucket_id,storage_object_path,official_url,approval_status,created_at';
const required = (value, code) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
};

const normalize = (row) => {
  if (!row?.id || !row.evidence_kind || !row.evidence_label) throw new Error('INVALID_EVIDENCE_DATA');
  return {
    id: row.id,
    athleteId: row.athlete_id,
    kind: row.evidence_kind,
    label: row.evidence_label,
    bucketId: row.storage_bucket_id || null,
    objectPath: row.storage_object_path || null,
    officialUrl: row.official_url || null,
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
  };
};

const rpcRow = (data) => normalize(Array.isArray(data) ? data[0] : data);
const mark = (error, operation) => {
  try { error.evidenceOperation = operation; } catch { /* Preserve the original Supabase error. */ }
  return error;
};

export const listAthleteEvidence = async (athleteId) => {
  const { data, error } = await supabase.from('source_documents').select(columns)
    .eq('athlete_id', required(athleteId, 'ATHLETE_ID_REQUIRED')).not('evidence_kind', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw mark(error, 'list');
  return Array.isArray(data) ? data.map(normalize) : [];
};

export const uploadPrivateEvidence = async ({ athleteId, label, file, userId }) => {
  const requestedAthleteId = required(athleteId, 'ATHLETE_ID_REQUIRED');
  const requestedLabel = required(label, 'EVIDENCE_LABEL_REQUIRED');
  const ownerId = required(userId, 'USER_ID_REQUIRED');
  if (!file || typeof file.arrayBuffer !== 'function' || !EVIDENCE_MIME_TYPES.has(file.type)) throw new Error('INVALID_EVIDENCE_FILE');
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_EVIDENCE_BYTES) throw new Error('INVALID_EVIDENCE_SIZE');
  if (!globalThis.crypto?.subtle || typeof globalThis.crypto.randomUUID !== 'function') throw new Error('CRYPTO_UNAVAILABLE');

  const bytes = await file.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const path = `${ownerId}/${globalThis.crypto.randomUUID()}.${extensions[file.type]}`;
  const { error: uploadError } = await supabase.storage.from(EVIDENCE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) throw mark(uploadError, 'upload');

  const { data, error } = await supabase.rpc('create_athlete_evidence_source', {
    requested_athlete_id: requestedAthleteId,
    requested_evidence_kind: 'private_object',
    requested_evidence_label: requestedLabel,
    requested_storage_bucket_id: EVIDENCE_BUCKET,
    requested_storage_object_path: path,
    requested_official_url: null,
    requested_checksum: checksum,
  });
  if (error) {
    let cleanupError;
    try {
      const { error: removeError } = await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
      cleanupError = removeError;
    } catch (caught) { cleanupError = caught; }
    if (cleanupError) {
      try { error.evidenceCleanupError = cleanupError; } catch { /* Preserve the original registration error. */ }
    }
    throw mark(error, 'register-upload');
  }
  return rpcRow(data);
};

export const createOfficialEvidence = async ({ athleteId, label, officialUrl }) => {
  const url = required(officialUrl, 'OFFICIAL_URL_REQUIRED');
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname) throw new Error();
  } catch {
    throw new Error('INVALID_OFFICIAL_URL');
  }
  const { data, error } = await supabase.rpc('create_athlete_evidence_source', {
    requested_athlete_id: required(athleteId, 'ATHLETE_ID_REQUIRED'),
    requested_evidence_kind: 'official_url',
    requested_evidence_label: required(label, 'EVIDENCE_LABEL_REQUIRED'),
    requested_storage_bucket_id: null,
    requested_storage_object_path: null,
    requested_official_url: url,
    requested_checksum: null,
  });
  if (error) throw mark(error, 'create-official');
  return rpcRow(data);
};

export const reviewAthleteEvidence = async (sourceDocumentId, decision) => {
  if (!['approved', 'rejected'].includes(decision)) throw new Error('INVALID_EVIDENCE_DECISION');
  const { data, error } = await supabase.rpc('review_athlete_evidence', {
    requested_source_document_id: required(sourceDocumentId, 'SOURCE_DOCUMENT_ID_REQUIRED'),
    requested_decision: decision,
  });
  if (error) throw mark(error, 'review');
  return rpcRow(data);
};

export const createEvidenceSignedUrl = async ({ bucketId, objectPath }) => {
  if (required(bucketId, 'BUCKET_REQUIRED') !== EVIDENCE_BUCKET) throw new Error('INVALID_EVIDENCE_BUCKET');
  const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET)
    .createSignedUrl(required(objectPath, 'OBJECT_PATH_REQUIRED'), 60);
  if (error || !data?.signedUrl) throw mark(error || new Error('SIGNED_URL_FAILED'), 'signed-url');
  return data.signedUrl;
};

export const formatEvidenceError = (error) => {
  const message = `${error?.code || ''} ${error?.message || error || ''}`.toLowerCase();
  if (error?.evidenceCleanupError) return 'No fue posible registrar la prueba privada ni retirar el archivo cargado. Avisá a un administrador para que revise el almacenamiento.';
  if (message.includes('evidence_label_required')) return 'Ingresá una etiqueta para identificar la prueba.';
  if (message.includes('invalid_evidence_file')) return 'Seleccioná un archivo PDF, JPEG, PNG o WebP válido.';
  if (message.includes('invalid_evidence_size')) return 'El archivo debe pesar más de 0 bytes y hasta 10 MiB.';
  if (message.includes('invalid_official_url') || message.includes('official_url_required')) return 'Ingresá un enlace oficial HTTPS válido.';
  if (message.includes('42501') || message.includes('permission') || message.includes('administrator')) return 'No tenés autorización para realizar esta acción.';
  if (error?.evidenceOperation === 'list') return 'No fue posible cargar las pruebas. Intentá nuevamente.';
  if (error?.evidenceOperation === 'register-upload') return 'No fue posible registrar la prueba privada. Se intentó retirar el archivo cargado de forma segura.';
  if (error?.evidenceOperation === 'signed-url') return 'No fue posible abrir la prueba privada. Intentá nuevamente.';
  return 'No fue posible completar la operación de evidencias. Intentá nuevamente.';
};
