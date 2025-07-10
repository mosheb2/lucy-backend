const axios = require('axios');

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.clientId = process.env.YOUTUBE_CLIENT_ID;
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
  }

  // Search for videos
  async searchVideos(query, options = {}) {
    try {
      const {
        maxResults = 10,
        type = 'video',
        order = 'relevance',
        publishedAfter = null,
        channelId = null
      } = options;

      const params = {
        part: 'snippet',
        q: query,
        type,
        maxResults,
        order,
        key: this.apiKey
      };

      if (publishedAfter) {
        params.publishedAfter = publishedAfter;
      }

      if (channelId) {
        params.channelId = channelId;
      }

      const response = await axios.get(`${this.baseURL}/search`, { params });
      return response.data;
    } catch (error) {
      console.error('YouTube search error:', error.response?.data || error.message);
      throw new Error('Failed to search YouTube videos');
    }
  }

  // Get video details
  async getVideoDetails(videoId) {
    try {
      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: videoId,
          key: this.apiKey
        }
      });

      return response.data.items[0];
    } catch (error) {
      console.error('YouTube get video details error:', error.response?.data || error.message);
      throw new Error('Failed to get video details');
    }
  }

  // Get channel details
  async getChannelDetails(channelId) {
    try {
      const response = await axios.get(`${this.baseURL}/channels`, {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: channelId,
          key: this.apiKey
        }
      });

      return response.data.items[0];
    } catch (error) {
      console.error('YouTube get channel details error:', error.response?.data || error.message);
      throw new Error('Failed to get channel details');
    }
  }

  // Get channel videos
  async getChannelVideos(channelId, options = {}) {
    try {
      const {
        maxResults = 10,
        order = 'date',
        publishedAfter = null
      } = options;

      const params = {
        part: 'snippet',
        channelId,
        order,
        maxResults,
        type: 'video',
        key: this.apiKey
      };

      if (publishedAfter) {
        params.publishedAfter = publishedAfter;
      }

      const response = await axios.get(`${this.baseURL}/search`, { params });
      return response.data;
    } catch (error) {
      console.error('YouTube get channel videos error:', error.response?.data || error.message);
      throw new Error('Failed to get channel videos');
    }
  }

  // Get playlist items
  async getPlaylistItems(playlistId, options = {}) {
    try {
      const { maxResults = 10 } = options;

      const response = await axios.get(`${this.baseURL}/playlistItems`, {
        params: {
          part: 'snippet',
          playlistId,
          maxResults,
          key: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('YouTube get playlist items error:', error.response?.data || error.message);
      throw new Error('Failed to get playlist items');
    }
  }

  // Get trending videos
  async getTrendingVideos(regionCode = 'US', options = {}) {
    try {
      const {
        maxResults = 10,
        categoryId = null
      } = options;

      const params = {
        part: 'snippet,statistics',
        chart: 'mostPopular',
        regionCode,
        maxResults,
        key: this.apiKey
      };

      if (categoryId) {
        params.videoCategoryId = categoryId;
      }

      const response = await axios.get(`${this.baseURL}/videos`, { params });
      return response.data;
    } catch (error) {
      console.error('YouTube get trending videos error:', error.response?.data || error.message);
      throw new Error('Failed to get trending videos');
    }
  }

  // Get video categories
  async getVideoCategories(regionCode = 'US') {
    try {
      const response = await axios.get(`${this.baseURL}/videoCategories`, {
        params: {
          part: 'snippet',
          regionCode,
          key: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('YouTube get video categories error:', error.response?.data || error.message);
      throw new Error('Failed to get video categories');
    }
  }

  // Search for music videos
  async searchMusicVideos(query, options = {}) {
    const musicOptions = {
      ...options,
      type: 'video',
      videoCategoryId: '10' // Music category
    };

    return this.searchVideos(query, musicOptions);
  }

  // Get related videos
  async getRelatedVideos(videoId, options = {}) {
    try {
      const { maxResults = 10 } = options;

      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          part: 'snippet',
          relatedToVideoId: videoId,
          type: 'video',
          maxResults,
          key: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('YouTube get related videos error:', error.response?.data || error.message);
      throw new Error('Failed to get related videos');
    }
  }

  // Get video comments
  async getVideoComments(videoId, options = {}) {
    try {
      const {
        maxResults = 10,
        order = 'relevance'
      } = options;

      const response = await axios.get(`${this.baseURL}/commentThreads`, {
        params: {
          part: 'snippet',
          videoId,
          maxResults,
          order,
          key: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('YouTube get video comments error:', error.response?.data || error.message);
      throw new Error('Failed to get video comments');
    }
  }

  // Get channel statistics
  async getChannelStatistics(channelId) {
    try {
      const response = await axios.get(`${this.baseURL}/channels`, {
        params: {
          part: 'statistics',
          id: channelId,
          key: this.apiKey
        }
      });

      return response.data.items[0].statistics;
    } catch (error) {
      console.error('YouTube get channel statistics error:', error.response?.data || error.message);
      throw new Error('Failed to get channel statistics');
    }
  }

  // Get video statistics
  async getVideoStatistics(videoId) {
    try {
      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          part: 'statistics',
          id: videoId,
          key: this.apiKey
        }
      });

      return response.data.items[0].statistics;
    } catch (error) {
      console.error('YouTube get video statistics error:', error.response?.data || error.message);
      throw new Error('Failed to get video statistics');
    }
  }

  // Search for channels
  async searchChannels(query, options = {}) {
    try {
      const { maxResults = 10 } = options;

      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'channel',
          maxResults,
          key: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('YouTube search channels error:', error.response?.data || error.message);
      throw new Error('Failed to search channels');
    }
  }

  // Get channel playlists
  async getChannelPlaylists(channelId, options = {}) {
    try {
      const { maxResults = 10 } = options;

      const response = await axios.get(`${this.baseURL}/playlists`, {
        params: {
          part: 'snippet',
          channelId,
          maxResults,
          key: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('YouTube get channel playlists error:', error.response?.data || error.message);
      throw new Error('Failed to get channel playlists');
    }
  }

  // Get video captions
  async getVideoCaptions(videoId) {
    try {
      const response = await axios.get(`${this.baseURL}/captions`, {
        params: {
          part: 'snippet',
          videoId,
          key: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('YouTube get video captions error:', error.response?.data || error.message);
      throw new Error('Failed to get video captions');
    }
  }

  // Get video thumbnails
  async getVideoThumbnails(videoId) {
    try {
      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          part: 'snippet',
          id: videoId,
          key: this.apiKey
        }
      });

      return response.data.items[0].snippet.thumbnails;
    } catch (error) {
      console.error('YouTube get video thumbnails error:', error.response?.data || error.message);
      throw new Error('Failed to get video thumbnails');
    }
  }

  // Get channel avatar
  async getChannelAvatar(channelId) {
    try {
      const response = await axios.get(`${this.baseURL}/channels`, {
        params: {
          part: 'snippet',
          id: channelId,
          key: this.apiKey
        }
      });

      return response.data.items[0].snippet.thumbnails;
    } catch (error) {
      console.error('YouTube get channel avatar error:', error.response?.data || error.message);
      throw new Error('Failed to get channel avatar');
    }
  }
}

module.exports = new YouTubeService(); 