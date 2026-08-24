import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAdminSession } from './AdminSessionContext';

const AdminLoginPage = () => {
  const { status, signIn, requestPasswordReset, updatePassword } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authorized') return <Navigate to="/admin" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await signIn(email.trim(), password);
    } catch {
      setMessage({ type: 'error', text: 'No fue posible iniciar sesión. Verificá tus credenciales o contactá al administrador.' });
    } finally {
      setBusy(false);
    }
  };

  const recover = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Ingresá tu correo institucional para recuperar el acceso.' });
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setMessage({ type: 'success', text: 'Si el correo está autorizado, recibirá instrucciones para restablecer la contraseña.' });
    } catch {
      setMessage({ type: 'error', text: 'No fue posible procesar la solicitud. Intentá nuevamente.' });
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (newPassword !== passwordConfirmation) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setBusy(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setPasswordConfirmation('');
      setMessage({ type: 'success', text: 'Contraseña actualizada. Ya podés iniciar sesión con tu nueva contraseña.' });
    } catch {
      setMessage({ type: 'error', text: 'No fue posible actualizar la contraseña. Solicitá un nuevo enlace e intentá nuevamente.' });
    } finally {
      setBusy(false);
    }
  };

  if (status === 'password_recovery') {
    return (
      <main className="grid min-h-screen place-items-center bg-asanda-foam px-4 py-10">
        <section className="w-full max-w-md rounded-[14px] border border-asanda-line bg-white p-6 shadow-[0_24px_60px_-38px_rgba(8,127,132,0.55)] sm:p-8" aria-labelledby="password-recovery-title">
          <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-asanda-deep text-white">
            <LockKeyhole aria-hidden="true" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Recuperación segura</p>
          <h1 id="password-recovery-title" className="mt-2 font-display text-3xl font-bold text-asanda-ink">Crear nueva contraseña</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Ingresá una contraseña nueva de al menos 8 caracteres.</p>

          <form className="mt-7 space-y-5" onSubmit={submitNewPassword}>
            <label className="block text-sm font-bold text-asanda-ink">
              Nueva contraseña
              <input className="mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            <label className="block text-sm font-bold text-asanda-ink">
              Confirmar nueva contraseña
              <input className="mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal" type="password" autoComplete="new-password" minLength={8} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
            </label>
            {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`text-sm ${message.type === 'error' ? 'text-red-700' : 'text-asanda-deep'}`}>{message.text}</p>}
            <button className="min-h-12 w-full bg-asanda-orange-strong px-4 font-bold text-white transition-colors hover:bg-[#a94320] disabled:cursor-wait disabled:opacity-70" type="submit" disabled={busy}>
              {busy ? 'Actualizando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-asanda-foam px-4 py-10">
      <section className="w-full max-w-md rounded-[14px] border border-asanda-line bg-white p-6 shadow-[0_24px_60px_-38px_rgba(8,127,132,0.55)] sm:p-8" aria-labelledby="admin-login-title">
        <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-asanda-deep text-white">
          <LockKeyhole aria-hidden="true" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Personal autorizado</p>
        <h1 id="admin-login-title" className="mt-2 font-display text-3xl font-bold text-asanda-ink">Acceso administrativo</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Ingresá con el correo institucional asignado por ASANDA.</p>

        <form className="mt-7 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-bold text-asanda-ink">
            Correo electrónico
            <input className="mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-bold text-asanda-ink">
            Contraseña
            <input className="mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`text-sm ${message.type === 'error' ? 'text-red-700' : 'text-asanda-deep'}`}>{message.text}</p>}
          <button className="min-h-12 w-full bg-asanda-orange-strong px-4 font-bold text-white transition-colors hover:bg-[#a94320] disabled:cursor-wait disabled:opacity-70" type="submit" disabled={busy}>
            {busy ? 'Verificando…' : 'Ingresar'}
          </button>
          <button className="min-h-11 w-full font-bold text-asanda-deep hover:text-asanda-orange" type="button" disabled={busy} onClick={recover}>Restablecer contraseña</button>
        </form>
      </section>
    </main>
  );
};

export default AdminLoginPage;
