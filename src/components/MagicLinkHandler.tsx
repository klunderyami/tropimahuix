import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoginLink, completeLogin } from '../firebase';

export const MagicLinkHandler: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const link = window.location.href;
    if (!isLoginLink(link)) {
      setError('Enlace de inicio de sesión inválido o caducado.');
      return;
    }

    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Por favor, introduce tu correo electrónico para confirmar el inicio de sesión.');
    }

    if (!email) {
      setError('Se requiere un correo electrónico para iniciar sesión.');
      return;
    }

    completeLogin(email, link)
      .then(() => {
        window.localStorage.removeItem('emailForSignIn');
        navigate('/');
      })
      .catch((err) => {
        console.error('Error completing sign-in:', err);
        setError('Error al iniciar sesión. El enlace puede ser inválido o haber caducado. Por favor, inténtalo de nuevo.');
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 text-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error de Autenticación</h1>
          <p className="text-stone-700 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-full bg-brand-orange text-white font-semibold hover:bg-orange-600 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50">
      <div className="flex items-center gap-4">
        <svg className="animate-spin h-8 w-8 text-brand-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-xl font-semibold text-stone-700">Iniciando sesión...</span>
      </div>
    </div>
  );
};
