import React, { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { useAdminSession } from './AdminSessionContext';
import AthleteAchievementForm from './AthleteAchievementForm';
import AthleteAchievementList from './AthleteAchievementList';
import { deleteAthleteAchievementGroup, formatAchievementError, getAthleteAchievementReferences, listAthleteAchievements, publishAthleteAchievementGroup, saveAthleteAchievementGroup } from '../services/admin/athleteAchievements';

const AthleteAchievementPanel = ({ athleteId }) => {
  const { profile } = useAdminSession(); const administrator = profile?.role === 'administrator';
  const [items, setItems] = useState(null); const [references, setReferences] = useState({ events: [], records: [] }); const [editing, setEditing] = useState(null); const [busyId, setBusyId] = useState(null); const [notice, setNotice] = useState(null);
  const load = async (isActive = () => true) => { const [achievements, loadedReferences] = await Promise.all([listAthleteAchievements(athleteId), getAthleteAchievementReferences(athleteId)]); if (isActive()) { setItems(achievements); setReferences(loadedReferences); } };
  useEffect(() => { if (!administrator) return undefined; let active = true; setItems(null); setNotice(null); load(() => active).catch((error) => { if (active) { setItems([]); setNotice({ error: true, text: formatAchievementError(error) }); } }); return () => { active = false; }; }, [athleteId, administrator]);
  if (!administrator) return null;
  const run = async (key, action, success) => { setBusyId(key); setNotice(null); try { await action(); await load(); setNotice({ error: false, text: success }); return true; } catch (error) { setNotice({ error: true, text: formatAchievementError(error) }); return false; } finally { setBusyId(null); } };
  const save = async (values) => { const saved = await run(values.id || 'create', () => saveAthleteAchievementGroup(athleteId, values), values.id ? 'Competencia actualizada.' : 'Competencia agregada como borrador.'); if (saved) setEditing(null); return saved; };
  const act = async (item, action) => { const saved = await run(item.id, action === 'publish' ? () => publishAthleteAchievementGroup(item.id) : () => deleteAthleteAchievementGroup(item.id), action === 'publish' ? 'Competencia publicada.' : 'Competencia eliminada.'); if (saved) setEditing((current) => current?.id === item.id ? null : current); };
  return <section aria-labelledby="athlete-achievement-title" className="min-w-0 rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-dark-surface"><div className="flex items-start gap-3"><Award className="mt-1 shrink-0 text-asanda-deep dark:text-slate-200" aria-hidden="true" /><div><h2 id="athlete-achievement-title" className="font-display text-2xl font-bold">Logros deportivos</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Registrá una competencia con sus resultados oficiales. No hace falta adjuntar pruebas.</p></div></div>{notice && <p role={notice.error ? 'alert' : 'status'} className={`mt-4 rounded-md border p-3 text-sm ${notice.error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</p>}<AthleteAchievementForm events={references.events} records={references.records} editing={editing} canCreate={(items || []).length < 6} busy={Boolean(busyId)} onSubmit={save} onCancel={() => setEditing(null)} />{items === null ? <p role="status" className="mt-5 text-sm">Cargando logros…</p> : <AthleteAchievementList items={items} busyId={busyId} onEdit={setEditing} onPublish={(item) => act(item, 'publish')} onDelete={(item) => act(item, 'delete')} />}</section>;
};

export default AthleteAchievementPanel;
