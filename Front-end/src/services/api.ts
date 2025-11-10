import axios from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    // Enviar campo unificado 'login' que puede ser email o username
    const response = await api.post('/auth/login', {
      login: data.login,
      password: data.password,
    });
    const res = response.data || {};
    const token = res?.data?.token ?? res?.token;
    const user = res?.data?.user ?? res?.user;
    return {
      success: !!res.success,
      token,
      user,
      message: res.message,
    } as AuthResponse;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    const res = response.data || {};
    const token = res?.data?.token ?? res?.token;
    const user = res?.data?.user ?? res?.user;
    return {
      success: !!res.success,
      token,
      user,
      message: res.message,
    } as AuthResponse;
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  setAuthData(token: string, user: any): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
};

export const videoService = {
  async searchVideos(query: string, maxResults: number = 20, pageToken?: string) {
    const params = new URLSearchParams({
      query,
      maxResults: maxResults.toString(),
      ...(pageToken && { pageToken }),
    });
    const response = await api.get(`/videos/search?${params}`);
    return response.data;
  },

  async getFavorites() {
    const response = await api.get('/videos/favorites');
    return response.data;
  },

  async addToFavorite(videoData: {
    videoId: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
  }) {
    const response = await api.post('/videos/favorites', videoData);
    return response.data;
  },

  async removeFromFavorite(videoId: string) {
    const response = await api.delete(`/videos/favorites/${videoId}`);
    return response.data;
  },
};

export default api;