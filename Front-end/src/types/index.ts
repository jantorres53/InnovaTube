export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  userId?: string;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  recaptchaToken: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
  viewCount?: string;
}

export interface Favorite {
  _id: string;
  userId: string;
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  createdAt: string;
}

export interface YouTubeSearchResponse {
  items: Video[];
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}