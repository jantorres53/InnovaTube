import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import { videoService } from '../services/api';
import { Video, Favorite } from '../types';
import { Search, Heart, LogOut, User, Star, Play, Clock, Eye, X, Menu } from 'lucide-react';
import Loader from '../components/Loader';

const Dashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
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
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('search')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
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
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'favorites'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Star className="h-4 w-4 inline mr-2" />
              Mis Favoritos ({favorites.length})
            </button>
          </nav>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
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
          <div>
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