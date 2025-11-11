import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, LogIn } from 'lucide-react';
import Loader from '../components/Loader';
import ReCAPTCHA from 'react-google-recaptcha';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const { state, login, clearError } = useAuth();
  const navigate = useNavigate();
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const recaptchaRef = useRef<any>(null);

  useEffect(() => {
    if (state.user) {
      navigate('/dashboard');
    }
  }, [state.user, navigate]);

  useEffect(() => {
    // Limpiar errores al montar el componente para evitar bucles en cleanup
    clearError();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validar reCAPTCHA
    if (!recaptchaToken) {
      setRecaptchaError('Por favor, completa el reCAPTCHA antes de continuar.');
      return;
    }
    setRecaptchaError(null);
    await login(formData.login, formData.password, recaptchaToken);
  };

  return (
    <div className="min-h-screen flex relative">
      {state.loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader />
        </div>
      )}
      
      {/* Left side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative">
        {/* Fondo pastel verde sólido, sin difuminado */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-green-100"></div>
        
        <div className="relative z-10 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-white rounded-full border border-gray-200 shadow-sm flex items-center justify-center">
              <LogIn className="h-8 w-8 text-black" />
            </div>
            <h2 className="mt-6 text-4xl font-bold text-gray-800">
              Bienvenido a <span className="text-emerald-600">InnovaTube</span>
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Inicia sesión en tu cuenta
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm font-medium">{state.error}</p>
              </div>
            )}

            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700">
                Usuario o Email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-6 w-6 text-black bg-white rounded-full p-0.5 shadow-sm" />
                </div>
                <input
                  id="login"
                  name="login"
                  type="text"
                  required
                  className="block w-full pl-12 pr-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white"
                  placeholder="Ingresa tu usuario o email"
                  value={formData.login}
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
                  <Lock className="h-6 w-6 text-black bg-white rounded-full p-0.5 shadow-sm" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full pl-12 pr-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white"
                  placeholder="Ingresa tu contraseña"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="mt-4">
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
              disabled={state.loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200"
            >
              {state.loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{' '}
              <Link
                to="/register"
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
        </div>
      </div>
      
      {/* Right side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-50 to-teal-100 items-center justify-center p-12">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8">
            <img 
              src="/src/assets/music_online_2.jpg" 
              alt="Video Tutorial Platform"
              className="w-full h-80 object-cover mx-auto rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-4">
            Aprende con los mejores
          </h3>
          <p className="text-lg text-gray-600 leading-relaxed">
            Accede a miles de tutoriales en video y potencia tu aprendizaje con contenido de calidad
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-teal-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;