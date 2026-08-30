import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAdminSession } from './AdminSessionContext';
import AthleteEvidenceForm from './AthleteEvidenceForm';
import AthleteEvidenceList from './AthleteEvidenceList';
import { createEvidenceSignedUrl, createOfficialEvidence, formatEvidenceError, listAthleteEvidence, reviewAthleteEvidence, uploadPrivateEvidence } from '../services/admin/athleteEvidence';

const AthleteEvidencePanel = ({ athleteId, onEvidenceChange }) => {
  const { profile } = useAdminSession();
  const [items, setItems] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try { setItems(await listAthleteEvidence(athleteId)); }
    catch (error) { setItems([]); setNotice({ error: true, text: formatEvidenceError(error) }); }
  };
  useEffect(() => { let active = true; listAthleteEvidence(athleteId).then((data) => { if (active) setItems(data); }).catch((error) => { if (active) { setItems([]); setNotice({ error: true, text: formatEvidenceError(error) }); } }); return () => { active = false; }; }, [athleteId]);

  const create = async (values) => {
    setBusyId('create'); setNotice(null);
    try {
      if (values.kind === 'private_object') await uploadPrivateEvidence({ athleteId, label: values.label, file: values.file, userId: profile?.id });
      else await createOfficialEvidence({ athleteId, label: values.label, officialUrl: values.officialUrl });
      setNotice({ error: false, text: 'Prueba agregada y pendiente de revisión.' }); onEvidenceChange?.(); await load(); return true;
    } catch (error) { setNotice({ error: true, text: formatEvidenceError(error) }); return false; }
    finally { setBusyId(null); }
  };

  const review = async (id, decision) => {
    setBusyId(id); setNotice(null);
    try { await reviewAthleteEvidence(id, decision); setNotice({ error: false, text: decision === 'approved' ? 'Prueba aprobada.' : 'Prueba rechazada.' }); onEvidenceChange?.(); await load(); }
    catch (error) { setNotice({ error: true, text: formatEvidenceError(error) }); }
    finally { setBusyId(null); }
  };

  const openPrivate = async (item) => {
    const popup = window.open('', '_blank');
    if (popup) popup.opener = null;
    try {
      const url = await createEvidenceSignedUrl(item);
      if (popup) popup.location.replace(url); else throw new Error('POPUP_BLOCKED');
    } catch (error) { if (popup) popup.close(); setNotice({ error: true, text: formatEvidenceError(error) }); }
  };

  return (
    <section aria-labelledby="athlete-evidence-title" className="rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-dark-surface">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-1 shrink-0 text-asanda-deep dark:text-slate-200" aria-hidden="true" /><div><h2 id="athlete-evidence-title" className="font-display text-2xl font-bold">Pruebas y evidencias</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Las pruebas privadas sólo se abren con enlaces temporales. Toda fuente queda pendiente hasta su revisión.</p></div></div>
      {notice && <p role={notice.error ? 'alert' : 'status'} className={`mt-4 rounded-md border p-3 text-sm ${notice.error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</p>}
      <AthleteEvidenceForm busy={busyId === 'create'} onSubmit={create} />
      {items === null ? <p role="status" className="mt-5 text-sm">Cargando pruebas…</p> : <AthleteEvidenceList items={items} isAdministrator={profile?.role === 'administrator'} busyId={busyId} onOpenPrivate={openPrivate} onReview={review} />}
    </section>
  );
};

export default AthleteEvidencePanel;
