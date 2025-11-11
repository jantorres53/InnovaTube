import React, { useEffect, useState } from 'react';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, CheckCircle, XCircle, KeyRound } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  const maskEmail = (raw: string) => {
    try {
      const [user, domain] = raw.split('@');
      if (!user || !domain) return '********@********';
      const userMasked = user.length > 2
        ? `${user[0]}${'*'.repeat(user.length - 2)}${user[user.length - 1]}`
        : `${user[0]}*`;
      let domainMasked: string;
      if (domain.endsWith('gmail.com')) {
        domainMasked = `**mail.com`;
      } else if (domain.length > 5) {
        domainMasked = `**${domain.slice(2)}`;
      } else {
        domainMasked = `*${domain.slice(1)}`;
      }
      return `${userMasked}@${domainMasked}`;
    } catch {
      return '********@********';
    }
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qEmail = params.get('email');
      if (qEmail) {
        setEmail(qEmail);
      } else {
        setStatus('Para continuar, solicita el código a tu correo.');
      }
    } catch {
      // noop
    }
  }, []);

  const handleVerify = async () => {
    setLoading(true);
    setStatus(null);
    setIsVerified(false);
    try {
      const res = await authService.verifyResetCode(email, code);
      setIsVerified(true);
      setStatus(res.message || 'Código verificado. Ahora puedes cambiar tu contraseña.');
    } catch (err: any) {
      setIsVerified(false);
      setStatus(err.response?.data?.message || 'Código inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    if (!isVerified) {
      setLoading(false);
      setStatus('Primero verifica tu código de seguridad.');
      return;
    }
    try {
      const res = await authService.resetPassword(email, code, password);
      if (res.success) {
        setStatus('Contraseña restablecida, redirigiendo…');
        setTimeout(() => navigate('/login'), 800);
      } else {
        setStatus(res.message || 'No se pudo restablecer la contraseña');
      }
    } catch (err: any) {
      setStatus(err.response?.data?.message || 'Error al restablecer contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Restablecer contraseña</h1>
        </div>

        {email ? (
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-4 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span>Cuenta: <span className="font-medium">{maskEmail(email)}</span></span>
          </div>
        ) : (
          <div className="mb-4 text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            No se detectó el correo. Regresa a la página de recuperación para solicitar tu código.
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="ml-2 underline text-blue-700 hover:text-blue-800"
            >
              Ir a recuperación
            </button>
          </div>
        )}

        {/* Paso 1: Ingresar y verificar código */}
        <div className="space-y-2 mb-6">
          <label className="block text-sm font-medium text-gray-800">Código de verificación</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="\\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              required
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              placeholder="Ingresa los 6 dígitos"
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || code.length !== 6 || !email}
              className="px-4 py-2 rounded-md border bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-50"
            >
              {loading ? 'Verificando…' : 'Verificar'}
            </button>
          </div>
          {isVerified ? (
            <div className="flex items-center gap-2 text-xs text-green-700"><CheckCircle className="h-4 w-4" /> Código verificado</div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-600"><KeyRound className="h-4 w-4" /> Ingresa y verifica el código enviado</div>
          )}
        </div>

        {/* Paso 2: Nueva contraseña (habilitado solo si verificado) */}
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={!isVerified}
              className={`mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 ${!isVerified ? 'opacity-60 cursor-not-allowed' : ''}`}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !isVerified}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
          </button>
        </form>

        {status && (
          <div className={`mt-4 text-sm flex items-center gap-2 ${status.toLowerCase().includes('error') || status.toLowerCase().includes('inválido') ? 'text-red-700' : 'text-gray-800'}`}>
            {status.toLowerCase().includes('error') || status.toLowerCase().includes('inválido') ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span>{status}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;