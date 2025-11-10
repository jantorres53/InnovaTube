import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { videoService } from '../services/api';
import { Video, Favorite } from '../types';
import { Search, Heart, LogOut, User, Star, Play, Clock, Eye } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');

  const user = state.user;

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const data = await videoService.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const data = await videoService.searchVideos(searchQuery);
      setVideos(data.items || []);
    } catch (error) {
      console.error('Error searching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToFavorites = async (video: Video) => {
    try {
      await videoService.addToFavorite({
        videoId: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        channelTitle: video.channelTitle,
      });
      await loadFavorites();
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  };

  const handleRemoveFromFavorites = async (videoId: string) => {
    try {
      await videoService.removeFromFavorite(videoId);
      await loadFavorites();
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  const isFavorite = (videoId: string) => {
    return favorites.some((fav) => fav.videoId === videoId);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Play className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-bold text-gray-900">InnovaTube</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
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
                  ? 'border-blue-500 text-blue-600'
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
                  ? 'border-blue-500 text-blue-600'
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
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar videos en YouTube..."
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </form>
            </div>

            {/* Videos Grid */}
            {videos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-48 object-cover"
                      />
                      <button
                        onClick={() => 
                          isFavorite(video.id) 
                            ? handleRemoveFromFavorites(video.id)
                            : handleAddToFavorites(video)
                        }
                        className={`absolute top-2 right-2 p-2 rounded-full ${
                          isFavorite(video.id)
                            ? 'bg-red-500 text-white'
                            : 'bg-white text-gray-400 hover:text-red-500'
                        } shadow-lg`}
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

            {videos.length === 0 && searchQuery && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">No se encontraron videos para "{searchQuery}"</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map((favorite) => (
                  <div key={favorite._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={favorite.thumbnail}
                        alt={favorite.title}
                        className="w-full h-48 object-cover"
                      />
                      <button
                        onClick={() => handleRemoveFromFavorites(favorite.videoId)}
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
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;