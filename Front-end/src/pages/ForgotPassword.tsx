import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import ReCAPTCHA from 'react-google-recaptcha';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const recaptchaRef = useRef<any>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    // Validar reCAPTCHA
    if (!recaptchaToken) {
      setRecaptchaError('Por favor, completa el reCAPTCHA antes de continuar.');
      setLoading(false);
      return;
    }
    setRecaptchaError(null);
    try {
      const res = await authService.requestPasswordReset(email, recaptchaToken);
      const message = res.message || 'Si el correo existe, se enviará un código';
      setStatus(message);
      // Guardar código de desarrollo para facilitar pruebas si viene del backend
      if (import.meta.env.MODE === 'development' && (res as any).devCode) {
        try {
          sessionStorage.setItem('resetDevCode', String((res as any).devCode));
        } catch {}
      }
      // Redirigir a la pantalla de reset con el email precargado
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 500);
    } catch (err: any) {
      setStatus(err.response?.data?.message || 'Error solicitando recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-emerald-100 via-teal-50 to-green-100">
      <div className="max-w-md w-full bg-white border border-gray-200 shadow-xl rounded-2xl p-6">
        <h1 className="text-xl font-semibold mb-4">Recuperar contraseña</h1>
        <p className="text-sm text-gray-600 mb-4">Ingresa tu correo para recibir un código de verificación.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="tu-correo@dominio.com"
            />
          </div>
          <div>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={(token) => {
                setRecaptchaToken(token || '');
                setRecaptchaError(null);
              }}
              onExpired={() => {
                setRecaptchaToken('');
                setRecaptchaError('El reCAPTCHA expiró, por favor vuelve a verificar.');
              }}
              onErrored={() => {
                setRecaptchaError('No se pudo cargar reCAPTCHA. Verifica tu conexión o bloqueadores.');
              }}
            />
            {recaptchaError && (
              <p className="mt-2 text-sm text-red-600">{recaptchaError}</p>
            )}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    recaptchaRef.current?.reset();
                    setRecaptchaError(null);
                  } catch (e) {}
                }}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                Reintentar reCAPTCHA
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg shadow-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>
        {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}
      </div>
    </div>
  );
};

export default ForgotPassword;