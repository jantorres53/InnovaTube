import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  loggingOut: boolean;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'STOP_LOADING' }
  | { type: 'LOGOUT_START' }
  | { type: 'LOGOUT' }
  | { type: 'LOGOUT_END' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_USER'; payload: User };

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  loggingOut: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'STOP_LOADING':
      return { ...state, loading: false };
    case 'LOGOUT_START':
      return { ...state, loggingOut: true };
    case 'LOGOUT':
      return { ...initialState, loggingOut: true };
    case 'LOGOUT_END':
      return { ...state, loggingOut: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

interface AuthContextType {
  state: AuthState;
  login: (login: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = authService.getToken();
    const user = authService.getCurrentUser();
    if (token && user) {
      dispatch({ type: 'SET_USER', payload: user });
    }
  }, []);

  const login = async (login: string, password: string) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const response = await authService.login({ login, password });
      
      if (response.success && response.token && response.user) {
        authService.setAuthData(response.token, response.user);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: response.user, token: response.token },
        });
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: response.message || 'Login failed' });
      }
    } catch (error: any) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.response?.data?.message || 'Login failed',
      });
    }
  };

  const register = async (userData: any) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const response = await authService.register(userData);
      
      if (response.success && response.token && response.user) {
        // Auto-login: guardar token y usuario
        authService.setAuthData(response.token, response.user);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: response.user, token: response.token },
        });
      } else if (response.success) {
        // Registro exitoso sin token: solo limpiar errores y detener loading
        dispatch({ type: 'CLEAR_ERROR' });
        dispatch({ type: 'STOP_LOADING' });
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: response.message || 'Registration failed' });
      }
    } catch (error: any) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.response?.data?.message || 'Registration failed',
      });
    }
  };

  const logout = async () => {
    // Iniciar animación de cierre de sesión
    dispatch({ type: 'LOGOUT_START' });
    await authService.logout();
    // Limpiar usuario y token, mantener animación visible
    dispatch({ type: 'LOGOUT' });
    // Pequeño delay para que la animación se aprecie durante la redirección
    await new Promise((resolve) => setTimeout(resolve, 800));
    dispatch({ type: 'LOGOUT_END' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};