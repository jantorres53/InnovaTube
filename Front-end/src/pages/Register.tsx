import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReCAPTCHA from 'react-google-recaptcha';
import { User, Mail, Lock, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import Loader from '../components/Loader';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const recaptchaRef = useRef<any>(null);
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string }>({ score: 0, label: 'Muy débil' });
  const [passwordChecks, setPasswordChecks] = useState<{ length: boolean; upper: boolean; lower: boolean; number: boolean; special: boolean }>({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
  });
  const { state, register, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Limpiar errores al montar el componente (evita dispatch en cleanup)
    clearError();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Clear password error when user types
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setPasswordError('');
    }

    if (e.target.name === 'password') {
      evaluatePassword(e.target.value);
    }
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token || '');
  };

  const handleRecaptchaExpired = () => {
    setRecaptchaToken('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return false;
    }
    // Requisitos mínimos: longitud >= 8 y al menos 3 de las 4 categorías
    const { length, upper, lower, number, special } = passwordChecks;
    const categoriesMet = [upper, lower, number, special].filter(Boolean).length;
    if (!length || categoriesMet < 3) {
      setPasswordError('La contraseña debe tener mínimo 8 caracteres y cumplir al menos 3 requisitos (mayúsculas, minúsculas, números, especiales)');
      return false;
    }
    return true;
  };

  const evaluatePassword = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };
    setPasswordChecks(checks);

    const scoreBase = Object.values(checks).filter(Boolean).length;
    // Penalizar si hay espacios o caracteres repetidos excesivos
    const hasSpaces = /\s/.test(pwd);
    const repetitive = /(.)\1{2,}/.test(pwd);
    let score = scoreBase - (hasSpaces ? 1 : 0) - (repetitive ? 1 : 0);
    score = Math.max(0, Math.min(5, score));

    const labels = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
    const label = labels[Math.max(0, Math.min(labels.length - 1, score - 1))] || 'Muy débil';

    setPasswordStrength({ score, label });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const userData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      username: formData.username,
      email: formData.email,
      password: formData.password,
      recaptchaToken,
    };

    await register(userData);

    // Resetear reCAPTCHA y retrasar navegación para evitar ERR_ABORTED
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.reset();
      } catch (e) {
        // noop
      }
    }

    // Si el registro fue exitoso, ahora se hace auto-login desde AuthContext.
    // Redirigimos directo al Dashboard tras un pequeño delay para estabilidad.
    if (!state.error) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12 relative">
      {state.loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Loader />
        </div>
      )}
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Crea tu cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Únete a InnovaTube hoy mismo
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 text-sm">{state.error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Nombre"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Apellido
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Apellido"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Nombre de usuario"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                />
                {/* Indicador de fortaleza */}
                <div className="mt-2">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded transition-colors duration-200 ${
                          i < passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? 'bg-red-500'
                              : passwordStrength.score === 3
                              ? 'bg-yellow-400'
                              : passwordStrength.score === 4
                              ? 'bg-lime-500'
                              : 'bg-green-600'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p
                    className={`mt-1 text-xs font-medium ${
                      passwordStrength.score <= 2
                        ? 'text-red-600'
                        : passwordStrength.score === 3
                        ? 'text-yellow-600'
                        : passwordStrength.score === 4
                        ? 'text-lime-600'
                        : 'text-green-700'
                    }`}
                  >
                    Fortaleza: {passwordStrength.label}
                  </p>
                  {/* Requisitos visuales */}
                  <ul className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <li className="flex items-center gap-2">
                      {passwordChecks.length ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      Mínimo 8 caracteres
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordChecks.upper ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      Una mayúscula (A-Z)
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordChecks.lower ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      Una minúscula (a-z)
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordChecks.number ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      Un número (0-9)
                    </li>
                    <li className="flex items-center gap-2 col-span-2">
                      {passwordChecks.special ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      Un carácter especial (!@#$%^&*...)
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Contraseña
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Repite tu contraseña"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              {passwordError && (
                <p className="mt-1 text-sm text-red-600">{passwordError}</p>
              )}
            </div>

            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={handleRecaptchaChange}
                onExpired={handleRecaptchaExpired}
              />
            </div>

            <button
              type="submit"
              disabled={state.loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;