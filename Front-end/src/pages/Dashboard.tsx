import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import { videoService } from '../services/api';
import { Video, Favorite } from '../types';
import { Search, Heart, LogOut, User, Star, Play, Clock, Eye, X, Menu, ListPlus, Trash2, PlayCircle, Edit2, SortAsc, SortDesc } from 'lucide-react';
import Loader from '../components/Loader';

const Dashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites' | 'playlists'>('search');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [prevPageToken, setPrevPageToken] = useState<string | undefined>(undefined);
  const [favoriteLoadingIds, setFavoriteLoadingIds] = useState<string[]>([]);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestBoxRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const thumbAttemptsRef = useRef<Record<string, number>>({});
  const favThumbAttemptsRef = useRef<Record<string, number>>({});
  const [failedThumbs, setFailedThumbs] = useState<string[]>([]);
  const [failedFavThumbs, setFailedFavThumbs] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<{ query: string; at: number }[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [favoriteQuery, setFavoriteQuery] = useState('');
  // Playlists
  type Playlist = {
    id: string;
    name: string;
    createdAt: number;
    videos: Video[];
  };
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState<string>('');
  const [playlistSort, setPlaylistSort] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc');

  // Tabs micro-highlight
  const tabsNavRef = useRef<HTMLDivElement>(null);
  const searchTabRef = useRef<HTMLButtonElement>(null);
  const favoritesTabRef = useRef<HTMLButtonElement>(null);
  const playlistsTabRef = useRef<HTMLButtonElement>(null);
  const [tabHighlight, setTabHighlight] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const updateTabHighlight = () => {
    const navEl = tabsNavRef.current;
    if (!navEl) return;
    const map: Record<string, HTMLButtonElement | null> = {
      search: searchTabRef.current,
      favorites: favoritesTabRef.current,
      playlists: playlistsTabRef.current,
    };
    const activeEl = map[activeTab];
    if (!activeEl) return;
    const navRect = navEl.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();
    const left = tabRect.left - navRect.left;
    const width = tabRect.width;
    setTabHighlight({ left, width });
  };

  useEffect(() => {
    updateTabHighlight();
    const onResize = () => updateTabHighlight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeTab]);

  const user = state.user;

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  // Cargar historial de búsquedas desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('innovatube_recent_searches');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar el historial de búsquedas:', e);
    }
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await videoService.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Debounce de sugerencias
  useEffect(() => {
    // Limpiar timer previo
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestLoading(false);
      setHighlightIndex(-1);
      return;
    }

    setSuggestLoading(true);
    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const suggs = await videoService.getSuggestions(searchQuery, 8);
        setSuggestions(suggs);
        setShowSuggestions(suggs.length > 0);
        setHighlightIndex(-1);
      } catch (err) {
        console.error('Error cargando sugerencias:', err);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [searchQuery]);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showSuggestions &&
        inputRef.current &&
        suggestBoxRef.current &&
        !inputRef.current.contains(target) &&
        !suggestBoxRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  // Load playlists from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('innovatube_playlists');
      if (raw) setPlaylists(JSON.parse(raw));
    } catch {}
  }, []);

  const savePlaylists = (pls: Playlist[]) => {
    setPlaylists(pls);
    try {
      localStorage.setItem('innovatube_playlists', JSON.stringify(pls));
    } catch {}
  };

  const createPlaylist = async () => {
    const res = await Swal.fire({
      title: 'Nueva playlist',
      input: 'text',
      inputLabel: 'Nombre de la playlist',
      inputPlaceholder: 'Mi Playlist',
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      background: 'rgba(241,245,249,0.75)',
      color: '#0f172a',
      backdrop: 'rgba(15,23,42,0.12)',
      width: 480,
      customClass: {
        popup: 'rounded-2xl shadow-xl backdrop-blur-xl ring-1 ring-white/60',
        title: 'text-slate-900',
        htmlContainer: 'text-slate-700',
        confirmButton: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400',
        cancelButton: 'bg-white/70 text-slate-900 hover:bg-white/90 ring-1 ring-slate-300',
        input: 'text-slate-900 bg-white/80 border border-slate-300 rounded-md',
      },
    });
    if (!res.isConfirmed || !res.value?.trim()) return;
    const id = `${Date.now()}`;
    const newPl: Playlist = { id, name: res.value.trim(), createdAt: Date.now(), videos: [] };
    const next = [newPl, ...playlists];
    savePlaylists(next);
    toast.success('Playlist creada');
    setActivePlaylistId(id);
  };

  const addVideoToPlaylist = (playlistId: string, video: Video) => {
    const next = playlists.map((pl) =>
      pl.id === playlistId
        ? { ...pl, videos: pl.videos.some((v) => v.id === video.id) ? pl.videos : [video, ...pl.videos] }
        : pl
    );
    savePlaylists(next);
    toast.success('Video agregado a la playlist');
  };

  const promptAddToPlaylist = async (video: Video) => {
    if (playlists.length === 0) {
    const res = await Swal.fire({
      title: 'Crear playlist',
      text: 'No tienes playlists. Crea una para agregar videos.',
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      background: 'rgba(241,245,249,0.75)',
      color: '#0f172a',
      backdrop: 'rgba(15,23,42,0.12)',
      width: 480,
      customClass: {
        popup: 'rounded-2xl shadow-xl backdrop-blur-xl ring-1 ring-white/60',
        title: 'text-slate-900',
        htmlContainer: 'text-slate-700',
        confirmButton: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400',
        cancelButton: 'bg-white/70 text-slate-900 hover:bg-white/90 ring-1 ring-slate-300',
      },
    });
      if (res.isConfirmed) {
        await createPlaylist();
        if (activePlaylistId) addVideoToPlaylist(activePlaylistId, video);
      }
      return;
    }
    const inputOptions: Record<string, string> = {};
    playlists.forEach((pl) => (inputOptions[pl.id] = pl.name));
    const res = await Swal.fire({
      title: 'Agregar a playlist',
      input: 'select',
      inputOptions,
      inputPlaceholder: 'Selecciona una playlist',
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      background: 'rgba(241,245,249,0.75)',
      color: '#0f172a',
      backdrop: 'rgba(15,23,42,0.12)',
      width: 480,
      customClass: {
        popup: 'rounded-2xl shadow-xl backdrop-blur-xl ring-1 ring-white/60',
        title: 'text-slate-900',
        htmlContainer: 'text-slate-700',
        confirmButton: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400',
        cancelButton: 'bg-white/70 text-slate-900 hover:bg-white/90 ring-1 ring-slate-300',
        input: 'text-slate-900 bg-white/80 border border-slate-300 rounded-md',
      },
    });
    if (res.isConfirmed && res.value) {
      addVideoToPlaylist(res.value as string, video);
    }
  };

  const removeFromPlaylist = (playlistId: string, videoId: string) => {
    const next = playlists.map((pl) =>
      pl.id === playlistId ? { ...pl, videos: pl.videos.filter((v) => v.id !== videoId) } : pl
    );
    savePlaylists(next);
    toast.success('Video eliminado de la playlist');
  };

  const deletePlaylist = async (playlistId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    const res = await Swal.fire({
      title: 'Eliminar playlist',
      text: `¿Eliminar la playlist "${pl?.name ?? 'sin nombre'}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      background: 'rgba(241,245,249,0.75)',
      color: '#0f172a',
      backdrop: 'rgba(15,23,42,0.12)',
      width: 480,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      customClass: {
        popup: 'rounded-2xl shadow-xl backdrop-blur-xl ring-1 ring-white/60',
        title: 'text-slate-900',
        htmlContainer: 'text-slate-700',
        confirmButton: 'text-white',
        cancelButton: 'text-slate-900',
      },
    });
    if (!res.isConfirmed) return;
    const next = playlists.filter((p) => p.id !== playlistId);
    savePlaylists(next);
    if (activePlaylistId === playlistId) setActivePlaylistId(null);
    toast.success('Playlist eliminada');
  };

  const renamePlaylist = async (playlistId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    const res = await Swal.fire({
      title: 'Renombrar playlist',
      input: 'text',
      inputValue: pl?.name ?? '',
      inputLabel: 'Nuevo nombre',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      background: 'rgba(241,245,249,0.75)',
      color: '#0f172a',
      backdrop: 'rgba(15,23,42,0.12)',
      width: 480,
      customClass: {
        popup: 'rounded-2xl shadow-xl backdrop-blur-xl ring-1 ring-white/60',
        title: 'text-slate-900',
        htmlContainer: 'text-slate-700',
        confirmButton: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400',
        cancelButton: 'bg-white/70 text-slate-900 hover:bg-white/90 ring-1 ring-slate-300',
        input: 'text-slate-900 bg-white/80 border border-slate-300 rounded-md',
      },
    });
    if (!res.isConfirmed || !res.value?.trim()) return;
    const next = playlists.map((p) => (p.id === playlistId ? { ...p, name: res.value.trim() } : p));
    savePlaylists(next);
    toast.success('Playlist renombrada');
  };

  const sortedPlaylists = useMemo(() => {
    const copy = [...playlists];
    switch (playlistSort) {
      case 'date_asc':
        return copy.sort((a, b) => a.createdAt - b.createdAt);
      case 'name_asc':
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return copy.sort((a, b) => b.name.localeCompare(a.name));
      case 'date_desc':
      default:
        return copy.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [playlists, playlistSort]);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await videoService.searchVideos(q);
      setVideos(data.items || []);
      setNextPageToken(data.nextPageToken);
      setPrevPageToken(data.prevPageToken);
      // Guardar búsqueda en historial
      saveRecent(q);
    } catch (error) {
      console.error('Error searching videos:', error);
      setSearchError('Hubo un problema al buscar videos. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Guardar búsqueda en localStorage (máximo 10, sin duplicados)
  const saveRecent = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const withoutDup = prev.filter(
        (r) => r.query.toLowerCase() !== trimmed.toLowerCase()
      );
      const updated = [{ query: trimmed, at: Date.now() }, ...withoutDup].slice(0, 10);
      try {
        localStorage.setItem('innovatube_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeRecent = (q: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((r) => r.query !== q);
      try {
        localStorage.setItem('innovatube_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearRecent = async () => {
    const res = await Swal.fire({
      title: 'Limpiar historial',
      text: '¿Quieres eliminar el historial de búsquedas?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      background: '#111827',
      color: '#F9FAFB',
      confirmButtonColor: '#4F46E5',
      cancelButtonColor: '#6B7280',
    });
    if (!res.isConfirmed) return;
    setRecentSearches([]);
    try {
      localStorage.removeItem('innovatube_recent_searches');
    } catch {}
    // También limpiamos sugerencias y cerramos dropdown
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightIndex(-1);
    toast.success('Historial eliminado');
  };

  // Generar siguiente URL de thumbnail de YouTube (intentos múltiples)
  const getNextThumb = (id: string, current?: string, attempt?: number) => {
    const candidates = [
      current && current.includes('_live') ? current.replace('_live', '') : undefined,
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
      `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      `https://i.ytimg.com/vi_webp/${id}/maxresdefault.webp`,
    ].filter(Boolean) as string[];
    const idx = attempt ?? 0;
    return candidates[idx] ?? null;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setHighlightIndex(-1);
    await performSearch(searchQuery);
  };

  const handlePageChange = async (token?: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const data = await videoService.searchVideos(searchQuery, 20, token);
      setVideos(data.items || []);
      setNextPageToken(data.nextPageToken);
      setPrevPageToken(data.prevPageToken);
    } catch (error) {
      console.error('Error loading page:', error);
      setSearchError('No se pudieron cargar más resultados.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToFavorites = async (video: Video) => {
    try {
      setFavoriteLoadingIds((prev) => [...prev, video.id]);
      await videoService.addToFavorite({
        videoId: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        channelTitle: video.channelTitle,
        description: video.description,
        publishedAt: video.publishedAt,
      });
      await loadFavorites();
      toast.success('Agregado a favoritos');
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast.error('No se pudo agregar a favoritos');
    } finally {
      setFavoriteLoadingIds((prev) => prev.filter((id) => id !== video.id));
    }
  };

  const handleRemoveFromFavorites = async (videoId: string) => {
    const fav = favorites.find((f) => f.videoId === videoId);
    const res = await Swal.fire({
      title: '¿Quitar de favoritos?',
      text: `¿Estás seguro de que quieres quitar "${fav?.title ?? 'este video'}" de tus favoritos?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      background: '#111827',
      color: '#F9FAFB',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
    });
    if (!res.isConfirmed) return;
    try {
      setFavoriteLoadingIds((prev) => [...prev, videoId]);
      await videoService.removeFromFavorite(videoId);
      await loadFavorites();
      toast.success('Quitado de favoritos');
    } catch (error) {
      console.error('Error removing from favorites:', error);
      toast.error('No se pudo quitar de favoritos');
    } finally {
      setFavoriteLoadingIds((prev) => prev.filter((id) => id !== videoId));
    }
  };

  const isFavorite = (videoId: string) => {
    return favorites.some((fav) => fav.videoId === videoId);
  };

  const filteredFavorites = favorites.filter((f) =>
    f.title?.toLowerCase().includes(favoriteQuery.toLowerCase())
  );

  const handleLogout = async () => {
    const res = await Swal.fire({
      title: 'Cerrar sesión',
      text: '¿Seguro que quieres cerrar sesión?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      background: '#111827',
      color: '#F9FAFB',
      confirmButtonColor: '#4F46E5',
      cancelButtonColor: '#6B7280',
    });
    if (!res.isConfirmed) return;
    await logout();
    toast.success('Sesión cerrada');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Izquierda: acciones */}
            <div className="flex items-center space-x-3">
              {/* Botón menú móvil */}
              <button
                type="button"
                className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-white border border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Acciones de escritorio */}
              <div className="hidden sm:flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-white/10 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-white/30 text-sm leading-4 font-medium rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </button>
              </div>
            </div>

            {/* Derecha: marca */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <Play className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-white tracking-wide">InnovaTube</h1>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/20">
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center px-3 py-2 border border-white/30 text-sm leading-4 font-medium rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="relative border-b border-gray-200 mb-8">
          <nav ref={tabsNavRef} className="relative -mb-px flex justify-center space-x-8">
            <button
              onClick={() => setActiveTab('search')}
              ref={searchTabRef}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'search'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Search className="h-4 w-4 inline mr-2" />
              Buscar Videos
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              ref={favoritesTabRef}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'favorites'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Star className="h-4 w-4 inline mr-2" />
              Mis Favoritos ({favorites.length})
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              ref={playlistsTabRef}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'playlists'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PlayCircle className="h-4 w-4 inline mr-2" />
              Mis Playlists ({playlists.length})
            </button>
          </nav>
          {/* Micro-highlight under active tab */}
          <div
            className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400 transition-all duration-300 ease-out"
            style={{ left: `${tabHighlight.left}px`, width: `${tabHighlight.width}px` }}
          />
        </div>

        {/* Search Tab */}
{activeTab === 'search' && (
  <div className="animate-section-enter">
            {/* Search Form */}
            <div className="mb-8">
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <div className="flex">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(suggestions.length > 0 || recentSearches.length > 0)}
                      onKeyDown={(e) => {
                        if (!showSuggestions) return;
                        const totalItems = recentSearches.length + suggestions.length;
                        if (totalItems === 0) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHighlightIndex((prev) => {
                            const next = prev < 0 ? 0 : prev + 1;
                            return Math.min(next, totalItems - 1);
                          });
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHighlightIndex((prev) => {
                            const next = prev < 0 ? 0 : prev - 1;
                            return Math.max(next, 0);
                          });
                        } else if (e.key === 'Enter') {
                          if (highlightIndex >= 0) {
                            e.preventDefault();
                            if (highlightIndex < recentSearches.length) {
                              const selected = recentSearches[highlightIndex].query;
                              setSearchQuery(selected);
                              setShowSuggestions(false);
                              performSearch(selected);
                            } else {
                              const sIdx = highlightIndex - recentSearches.length;
                              const selected = suggestions[sIdx];
                              setSearchQuery(selected);
                              setShowSuggestions(false);
                              performSearch(selected);
                            }
                          } else {
                            // Cerrar sugerencias en Enter aunque no haya elemento resaltado
                            setShowSuggestions(false);
                            setHighlightIndex(-1);
                          }
                        } else if (e.key === 'Escape') {
                          setShowSuggestions(false);
                        }
                      }}
                      placeholder="Buscar videos en YouTube..."
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-l-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      ref={inputRef}
                    />
                    {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
                      <div
                        ref={suggestBoxRef}
                        className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-10"
                      >
                        {/* Dropdown Content: Recent + Suggestions */}
                        <div className="max-h-64 overflow-auto">
                          {recentSearches.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-xs font-medium text-gray-500">Búsquedas recientes</div>
                              <ul>
                                {recentSearches.map((r, idx) => (
                                  <li key={`recent-${r.query}-${r.at}`}>
                                    <div className="flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSearchQuery(r.query);
                                          setShowSuggestions(false);
                                          performSearch(r.query);
                                        }}
                                        className={`flex-1 text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                          idx === highlightIndex ? 'bg-green-50' : ''
                                        }`}
                                      >
                                        <span className="inline-flex items-center">
                                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                          <span>{r.query}</span>
                                          <span className="ml-2 text-xs text-gray-400">{new Date(r.at).toLocaleString()}</span>
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const res = await Swal.fire({
                                            title: 'Eliminar búsqueda',
                                            text: `¿Eliminar "${r.query}" del historial?`,
                                            icon: 'warning',
                                            showCancelButton: true,
                                            confirmButtonText: 'Sí, eliminar',
                                            cancelButtonText: 'Cancelar',
                                            reverseButtons: true,
                                            background: '#111827',
                                            color: '#F9FAFB',
                                            confirmButtonColor: '#EF4444',
                                            cancelButtonColor: '#6B7280',
                                          });
                                          if (res.isConfirmed) {
                                            removeRecent(r.query);
                                            toast.success('Búsqueda eliminada');
                                          }
                                        }}
                                        className="px-2 py-2 text-gray-400 hover:text-red-600"
                                        aria-label="Eliminar búsqueda"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              <div className="border-t my-1" />
                            </>
                          )}

                          {suggestions.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-xs font-medium text-gray-500">Sugerencias de YouTube</div>
                              <ul>
                                {suggestions.map((sugg, idx) => (
                                  <li key={`sugg-${sugg}-${idx}`}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSearchQuery(sugg);
                                        setShowSuggestions(false);
                                        performSearch(sugg);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                        recentSearches.length + idx === highlightIndex ? 'bg-green-50' : ''
                                      }`}
                                    >
                                      {sugg}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                        {suggestLoading && (
                          <div className="px-3 py-2 text-xs text-gray-500">Cargando sugerencias...</div>
                        )}
                        {(recentSearches.length > 0 || suggestions.length > 0) && (
                          <div className="px-3 py-2 border-t flex items-center justify-between">
                            <button
                              type="button"
                              onClick={clearRecent}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Limpiar historial
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSuggestions([]);
                                setShowSuggestions(false);
                                setHighlightIndex(-1);
                                // Opcional: también limpiar historial al limpiar sugerencias
                                clearRecent();
                              }}
                              className="text-xs text-gray-600 hover:text-gray-700"
                            >
                              Ocultar sugerencias
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-r-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </form>
            </div>

            {/* Empty state when no search yet */}
            {!isSearching && !loading && videos.length === 0 && !searchQuery.trim() && (
              <div className="max-w-2xl mx-auto text-center py-16">
                <div className="relative mx-auto h-28 w-28 mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 opacity-30 blur-2xl animate-pulse" />
                  <div className="relative h-full w-full rounded-full bg-white/70 backdrop-blur-xl ring-1 ring-white/60 flex items-center justify-center shadow-xl">
                    <Search className="h-10 w-10 text-emerald-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Busca videos que te interesen</h3>
                <p className="text-sm text-slate-600 mt-2">Escribe un tema, artista o canal para comenzar.</p>
              </div>
            )}

            {/* Loader while searching */}
            {isSearching && (
              <div className="flex justify-center items-center py-12 transition-opacity duration-300">
                <Loader />
              </div>
            )}

            {/* Error Banner */}
            {searchError && (
              <div className="hidden" aria-hidden>
                <span>{searchError}</span>
              </div>
            )}

            {/* Videos Grid */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="w-full h-48 bg-gray-200 animate-pulse" />
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && videos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {videos.map((video) => (
                  <div key={video.id} className="bg-white/90 backdrop-blur rounded-xl border border-gray-100 shadow-lg overflow-hidden hover:shadow-xl transition-all hover:-translate-y-0.5">
                    <div className="relative group cursor-pointer" onClick={() => setPreviewVideo(video)}>
                      {failedThumbs.includes(video.id) ? (
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                          <div className="bg-black bg-opacity-40 rounded-full p-3">
                            <Play className="h-6 w-6 text-white" />
                          </div>
                          <span className="sr-only">Miniatura no disponible</span>
                        </div>
                      ) : (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-48 object-cover"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            try {
                              const id = video.id;
                              const attempt = thumbAttemptsRef.current[id] ?? 0;
                              const next = getNextThumb(id, e.currentTarget.src, attempt);
                              if (next) {
                                thumbAttemptsRef.current[id] = attempt + 1;
                                e.currentTarget.src = next;
                              } else {
                                setFailedThumbs((prev) => (prev.includes(id) ? prev : [...prev, id]));
                              }
                            } catch {
                              setFailedThumbs((prev) => (prev.includes(video.id) ? prev : [...prev, video.id]));
                            }
                          }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black bg-opacity-40 rounded-full p-3">
                          <Play className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFavorite(video.id)) {
                            handleRemoveFromFavorites(video.id);
                          } else {
                            handleAddToFavorites(video);
                          }
                        }}
                        className={`absolute top-2 right-2 p-2 rounded-full ${
                          isFavorite(video.id)
                            ? 'bg-red-500 text-white'
                            : 'bg-white text-gray-400 hover:text-red-500'
                        } shadow-lg ${favoriteLoadingIds.includes(video.id) ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Heart className={`h-5 w-5 ${isFavorite(video.id) ? 'fill-current' : ''}`} />
                      </button>
                      {/* Add to playlist button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promptAddToPlaylist(video);
                        }}
                        className="absolute top-2 right-12 p-2 rounded-full bg-white text-gray-400 hover:text-emerald-600 shadow-lg"
                        aria-label="Agregar a playlist"
                      >
                        <ListPlus className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{video.channelTitle}</p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        {video.duration && (
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {video.duration}
                          </div>
                        )}
                        {video.viewCount && (
                          <div className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {video.viewCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && videos.length === 0 && searchQuery && (
              <div className="text-center py-12 space-y-4 transition-opacity duration-300">
                <div className="flex justify-center">
                  <Loader />
                </div>
                <p className="text-gray-500">No se encontraron videos para "{searchQuery}"</p>
              </div>
            )}

            {/* Pagination */}
            {!loading && (nextPageToken || prevPageToken) && (
              <div className="flex justify-center items-center space-x-4 mt-8">
                <button
                  onClick={() => handlePageChange(prevPageToken)}
                  disabled={!prevPageToken}
                  className="px-4 py-2 rounded-md border text-sm disabled:opacity-50 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(nextPageToken)}
                  disabled={!nextPageToken}
                  className="px-4 py-2 rounded-md border text-sm disabled:opacity-50 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="animate-section-enter">
            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No tienes videos favoritos aún</p>
                <p className="text-gray-400 text-sm mt-2">
                  Busca videos y marca los que te gusten como favoritos
                </p>
              </div>
            ) : (
              <>
                {/* Buscador de favoritos */}
                <div className="mb-6 max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={favoriteQuery}
                      onChange={(e) => setFavoriteQuery(e.target.value)}
                      placeholder="Buscar en favoritos..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {filteredFavorites.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No hay favoritos que coincidan con la búsqueda.</p>
                    <Loader />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredFavorites.map((favorite) => (
                      <div key={favorite._id} className="bg-white/90 backdrop-blur rounded-xl border border-gray-100 shadow-lg overflow-hidden hover:shadow-xl transition-all hover:-translate-y-0.5">
                        <div
                          className="relative group cursor-pointer"
                          onClick={() =>
                            setPreviewVideo({
                              id: favorite.videoId,
                              title: favorite.title,
                              description: '',
                              thumbnail: favorite.thumbnail,
                              channelTitle: favorite.channelTitle,
                              publishedAt: '',
                              duration: undefined,
                              viewCount: undefined,
                            })
                          }
                        >
                          {failedFavThumbs.includes(favorite.videoId) ? (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                              <div className="bg-black bg-opacity-40 rounded-full p-3">
                                <Play className="h-6 w-6 text-white" />
                              </div>
                              <span className="sr-only">Miniatura no disponible</span>
                            </div>
                          ) : (
                            <img
                              src={favorite.thumbnail}
                              alt={favorite.title}
                              className="w-full h-48 object-cover"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                try {
                                  const id = favorite.videoId;
                                  const attempt = favThumbAttemptsRef.current[id] ?? 0;
                                  const next = getNextThumb(id, e.currentTarget.src, attempt);
                                  if (next) {
                                    favThumbAttemptsRef.current[id] = attempt + 1;
                                    e.currentTarget.src = next;
                                  } else {
                                    setFailedFavThumbs((prev) => (prev.includes(id) ? prev : [...prev, id]));
                                  }
                                } catch {
                                  setFailedFavThumbs((prev) => (prev.includes(favorite.videoId) ? prev : [...prev, favorite.videoId]));
                                }
                              }}
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black bg-opacity-40 rounded-full p-3">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromFavorites(favorite.videoId);
                            }}
                            className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
                          >
                            <Heart className="h-5 w-5 fill-current" />
                          </button>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                            {favorite.title}
                          </h3>
                          <p className="text-sm text-gray-600">{favorite.channelTitle}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Agregado el {new Date(favorite.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Playlists Tab */}
        {activeTab === 'playlists' && (
          <div className="animate-section-enter">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Tus Playlists</h2>
                <p className="text-sm text-gray-500">Organiza y reproduce tus colecciones</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <label className="text-sm text-gray-600">Ordenar:</label>
                  <select
                    value={playlistSort}
                    onChange={(e) => setPlaylistSort(e.target.value as any)}
                    className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  >
                    <option value="date_desc">Fecha (recientes primero)</option>
                    <option value="date_asc">Fecha (antiguas primero)</option>
                    <option value="name_asc">Nombre (A-Z)</option>
                    <option value="name_desc">Nombre (Z-A)</option>
                  </select>
                </div>
                <button
                  onClick={createPlaylist}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-800 bg-white hover:bg-gray-50 transition"
                >
                  <ListPlus className="h-4 w-4 mr-2" />
                  Nueva Playlist
                </button>
              </div>
            </div>
            {playlists.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No tienes playlists aún.</p>
                <p className="text-gray-400 text-sm mt-2">Crea una y agrega tus videos favoritos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedPlaylists.map((pl) => (
                  <div key={pl.id} className="bg-white/95 rounded-2xl border border-gray-100 shadow hover:shadow-lg transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="p-4 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 tracking-tight">{pl.name}</h3>
                        <p className="text-xs text-gray-500">{pl.videos.length} videos · {new Date(pl.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setActivePlaylistId(pl.id)}
                          className="px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => renamePlaylist(pl.id)}
                          className="p-2 rounded-md text-gray-500 hover:text-emerald-600 transition"
                          aria-label="Renombrar playlist"
                          title="Renombrar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deletePlaylist(pl.id)}
                          className="p-2 rounded-md text-gray-500 hover:text-red-600 transition"
                          aria-label="Eliminar playlist"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Playlist detail */}
            {activePlaylistId && (
              <div className="mt-8">
                {(() => {
                  const pl = playlists.find((p) => p.id === activePlaylistId);
                  if (!pl) return null;
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Playlist: {pl.name}</h3>
                          <p className="text-sm text-gray-500">{pl.videos.length} videos</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="text"
                            value={playlistSearchQuery}
                            onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                            placeholder="Buscar videos en esta playlist..."
                            className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            onClick={() => setActivePlaylistId(null)}
                            className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                      {pl.videos.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500">Esta playlist está vacía.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {pl.videos
                            .filter((v) =>
                              playlistSearchQuery.trim()
                                ? v.title.toLowerCase().includes(playlistSearchQuery.toLowerCase())
                                : true
                            )
                            .map((video) => (
                            <div key={video.id} className="bg-white/95 rounded-2xl border border-gray-100 shadow hover:shadow-lg overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
                              <div className="relative group cursor-pointer" onClick={() => setPreviewVideo(video)}>
                                {failedThumbs.includes(video.id) ? (
                                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                                    <div className="bg-black bg-opacity-40 rounded-full p-3">
                                      <Play className="h-6 w-6 text-white" />
                                    </div>
                                    <span className="sr-only">Miniatura no disponible</span>
                                  </div>
                                ) : (
                                  <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                    loading="lazy"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    onError={(e) => {
                                      try {
                                        const id = video.id;
                                        const attempt = thumbAttemptsRef.current[id] ?? 0;
                                        const next = getNextThumb(id, e.currentTarget.src, attempt);
                                        if (next) {
                                          thumbAttemptsRef.current[id] = attempt + 1;
                                          e.currentTarget.src = next;
                                        } else {
                                          setFailedThumbs((prev) => (prev.includes(id) ? prev : [...prev, id]));
                                        }
                                      } catch {
                                        setFailedThumbs((prev) => (prev.includes(video.id) ? prev : [...prev, video.id]));
                                      }
                                    }}
                                  />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-black bg-opacity-40 rounded-full p-3">
                                    <Play className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromPlaylist(pl.id, video.id);
                                  }}
                                  className="absolute top-2 right-2 px-3 py-1 text-xs rounded-md bg-white text-gray-700 hover:text-red-600 shadow transition"
                                  title="Quitar de la playlist"
                                >
                                  Quitar
                                </button>
                              </div>
                              <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 tracking-tight">{video.title}</h3>
                                <p className="text-sm text-gray-600">{video.channelTitle}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold line-clamp-1">{previewVideo.title}</h3>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-2 rounded hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${previewVideo.id}`}
                title={previewVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="p-4 text-sm text-gray-600">
              {previewVideo.channelTitle}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;