import React, { useState } from 'react';
import { auth, sendSignInLinkToEmail, actionCodeSettingsAdmin } from '../firebase';

export const LoginAdmin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettingsAdmin);
      window.localStorage.setItem('emailForSignIn', email);
      setEmailSent(true);
    } catch (err: unknown) {
      console.error('Error sending sign-in link:', err);
      setError('No se pudo enviar el enlace de inicio de sesión. Verifica el correo e inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-green-700">¡Enlace enviado!</h2>
        <p className="mt-2 text-stone-600">
          Hemos enviado un enlace de inicio de sesión a <strong>{email}</strong>.
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Por favor, revisa tu bandeja de entrada (y la carpeta de spam) para continuar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label htmlFor="admin-email-magic" className="block text-sm font-bold text-stone-700 mb-2">
          Inicio de Sesión sin Contraseña
        </label>
        <input
          id="admin-email-magic"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@administrativo.com"
          required
          className="w-full rounded-3xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition"
          disabled={isSubmitting}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-3xl bg-brand-brown px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-brown/90 disabled:bg-stone-400"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar Enlace Mágico'}
      </button>
      {error && (
        <p className="text-sm font-bold text-red-600 text-center">{error}</p>
      )}
    </form>
  );
};
