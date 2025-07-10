const axios = require('axios');

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    this.baseURL = 'https://api.spotify.com/v1';
    this.authURL = 'https://accounts.spotify.com';
  }

  // Get authorization URL for Spotify OAuth
  getAuthURL(state) {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read',
      'user-library-modify',
      'user-follow-read',
      'user-follow-modify',
      'user-top-read',
      'user-read-recently-played',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'streaming',
      'app-remote-control',
      'playlist-read-collaborative',
      'user-read-playback-position',
      'user-read-email',
      'user-read-private'
    ];

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes.join(' '),
      redirect_uri: this.redirectUri,
      state: state
    });

    return `${this.authURL}/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(code) {
    try {
      const response = await axios.post(`${this.authURL}/api/token`, {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(`${this.authURL}/api/token`, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  // Get user profile
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify get user profile error:', error.response?.data || error.message);
      throw new Error('Failed to get user profile');
    }
  }

  // Get user's playlists
  async getUserPlaylists(accessToken, limit = 20, offset = 0) {
    try {
      const response = await axios.get(`${this.baseURL}/me/playlists`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit,
          offset
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify get playlists error:', error.response?.data || error.message);
      throw new Error('Failed to get user playlists');
    }
  }

  // Get playlist tracks
  async getPlaylistTracks(accessToken, playlistId, limit = 20, offset = 0) {
    try {
      const response = await axios.get(`${this.baseURL}/playlists/${playlistId}/tracks`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit,
          offset
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify get playlist tracks error:', error.response?.data || error.message);
      throw new Error('Failed to get playlist tracks');
    }
  }

  // Search for tracks
  async searchTracks(accessToken, query, limit = 20, offset = 0) {
    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          q: query,
          type: 'track',
          limit,
          offset
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify search tracks error:', error.response?.data || error.message);
      throw new Error('Failed to search tracks');
    }
  }

  // Get track details
  async getTrack(accessToken, trackId) {
    try {
      const response = await axios.get(`${this.baseURL}/tracks/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify get track error:', error.response?.data || error.message);
      throw new Error('Failed to get track details');
    }
  }

  // Get artist details
  async getArtist(accessToken, artistId) {
    try {
      const response = await axios.get(`${this.baseURL}/artists/${artistId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify get artist error:', error.response?.data || error.message);
      throw new Error('Failed to get artist details');
    }
  }

  // Get artist's top tracks
  async getArtistTopTracks(accessToken, artistId, market = 'US') {
    try {
      const response = await axios.get(`${this.baseURL}/artists/${artistId}/top-tracks`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          market
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify get artist top tracks error:', error.response?.data || error.message);
      throw new Error('Failed to get artist top tracks');
    }
  }

  // Get user's top tracks
  async getUserTopTracks(accessToken, limit = 20, offset = 0, timeRange = 'medium_term') {
    try {
      const response = await axios.get(`${this.baseURL}/me/top/tracks`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit,
          offset,
          time_range: timeRange
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify get user top tracks error:', error.response?.data || error.message);
      throw new Error('Failed to get user top tracks');
    }
  }

  // Get user's recently played tracks
  async getUserRecentlyPlayed(accessToken, limit = 20) {
    try {
      const response = await axios.get(`${this.baseURL}/me/player/recently-played`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify get recently played error:', error.response?.data || error.message);
      throw new Error('Failed to get recently played tracks');
    }
  }

  // Create a playlist
  async createPlaylist(accessToken, userId, name, description = '', public = false) {
    try {
      const response = await axios.post(`${this.baseURL}/users/${userId}/playlists`, {
        name,
        description,
        public
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify create playlist error:', error.response?.data || error.message);
      throw new Error('Failed to create playlist');
    }
  }

  // Add tracks to playlist
  async addTracksToPlaylist(accessToken, playlistId, trackUris, position = null) {
    try {
      const params = position !== null ? { position } : {};
      const response = await axios.post(`${this.baseURL}/playlists/${playlistId}/tracks`, {
        uris: trackUris
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params
      });

      return response.data;
    } catch (error) {
      console.error('Spotify add tracks to playlist error:', error.response?.data || error.message);
      throw new Error('Failed to add tracks to playlist');
    }
  }

  // Follow artist
  async followArtist(accessToken, artistId) {
    try {
      await axios.put(`${this.baseURL}/me/following`, {
        type: 'artist',
        ids: [artistId]
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return true;
    } catch (error) {
      console.error('Spotify follow artist error:', error.response?.data || error.message);
      throw new Error('Failed to follow artist');
    }
  }

  // Unfollow artist
  async unfollowArtist(accessToken, artistId) {
    try {
      await axios.delete(`${this.baseURL}/me/following`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          type: 'artist',
          ids: [artistId]
        }
      });

      return true;
    } catch (error) {
      console.error('Spotify unfollow artist error:', error.response?.data || error.message);
      throw new Error('Failed to unfollow artist');
    }
  }
}

module.exports = new SpotifyService(); 