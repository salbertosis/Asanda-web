import React, { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import AthleteAchievementForm from './AthleteAchievementForm';
import AthleteAchievementList from './AthleteAchievementList';
import { listAthleteEvidence } from '../services/admin/athleteEvidence';
import { createAthleteAchievement, deleteAthleteAchievement, formatAchievementError, listAthleteAchievements, publishAthleteAchievement, unpublishAthleteAchievement, updateAthleteAchievement } from '../services/admin/athleteAchievements';

const AthleteAchievementPanel = ({ athleteId, evidenceRevision }) => {
  const [items, setItems] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);
  const load = async () => {
    const [achievements, sources] = await Promise.all([listAthleteAchievements(athleteId), listAthleteEvidence(athleteId)]);
    setItems(achievements); setEvidence(sources.filter((item) => item.approvalStatus === 'approved'));
  };
  useEffect(() => { let active = true; Promise.all([listAthleteAchievements(athleteId), listAthleteEvidence(athleteId)]).then(([achievements, sources]) => { if (active) { setItems(achievements); setEvidence(sources.filter((item) => item.approvalStatus === 'approved')); } }).catch((error) => { if (active) { setItems([]); setNotice({ error: true, text: formatAchievementError(error) }); } }); return () => { active = false; }; }, [athleteId, evidenceRevision]);
  const run = async (key, action, success) => {
    setBusyId(key); setNotice(null);
    try {
      try { await action(); }
      catch (error) { setNotice({ error: true, text: formatAchievementError(error) }); return false; }
      try { await load(); setNotice({ error: false, text: success }); }
      catch { setNotice({ error: true, text: `${success} No fue posible actualizar la lista de logros.` }); }
      return true;
    }
    finally { setBusyId(null); }
  };
  const save = async (values) => {
    const edited = editing;
    const saved = await run(edited?.id || 'create', () => edited ? updateAthleteAchievement(edited.id, values) : createAthleteAchievement(athleteId, values), edited ? 'Logro actualizado.' : 'Logro agregado como borrador.');
    if (saved) setEditing(null);
    return saved;
  };
  const act = async (item, verb) => {
    const actions = { publish: [publishAthleteAchievement, 'Logro publicado.'], unpublish: [unpublishAthleteAchievement, 'Logro despublicado.'], delete: [(id) => deleteAthleteAchievement(id, item.publicationStatus), 'Logro eliminado.'] };
    const [action, message] = actions[verb];
    if (await run(item.id, () => action(item.id), message)) setEditing((current) => current?.id === item.id ? null : current);
  };
  return <section aria-labelledby="athlete-achievement-title" className="rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-dark-surface"><div className="flex items-start gap-3"><Award className="mt-1 shrink-0 text-asanda-deep dark:text-slate-200" aria-hidden="true" /><div><h2 id="athlete-achievement-title" className="font-display text-2xl font-bold">Logros deportivos</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Registrá información factual respaldada por una prueba aprobada.</p></div></div>
    {notice && <p role={notice.error ? 'alert' : 'status'} className={`mt-4 rounded-md border p-3 text-sm ${notice.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</p>}
    <AthleteAchievementForm evidence={evidence} editing={editing} busy={Boolean(busyId)} onSubmit={save} onCancel={() => setEditing(null)} />
    {items === null ? <p role="status" className="mt-5 text-sm">Cargando logros…</p> : <AthleteAchievementList items={items} approvedSourceIds={new Set(evidence.map((item) => item.id))} busyId={busyId} onEdit={setEditing} onPublish={(item) => act(item, 'publish')} onUnpublish={(item) => act(item, 'unpublish')} onDelete={(item) => act(item, 'delete')} />}
  </section>;
};

export default AthleteAchievementPanel;
