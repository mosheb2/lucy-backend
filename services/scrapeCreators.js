const axios = require('axios');
require('dotenv').config();

const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY;
const BASE_URL = 'https://api.scrapecreators.com/v1';

// Check if API key is available
if (!SCRAPECREATORS_API_KEY) {
  console.warn('Warning: SCRAPECREATORS_API_KEY environment variable is not set.');
}

/**
 * ScrapeCreators API client
 */
const scrapeCreatorsClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${SCRAPECREATORS_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Get profile data from a social media URL
 * @param {string} url - The social media profile URL
 * @param {string} platform - The platform (youtube, instagram, tiktok, twitter, facebook, threads)
 * @returns {Promise<Object>} - Profile data
 */
const getProfileData = async (url, platform) => {
  try {
    const response = await scrapeCreatorsClient.post('/profile', {
      url,
      platform
    });
    
    return response.data;
  } catch (error) {
    console.error(`ScrapeCreators API error for ${platform}:`, error.response?.data || error.message);
    throw new Error(`Failed to fetch ${platform} profile data: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Get YouTube analytics
 * @param {string} url - YouTube channel URL
 * @returns {Promise<Object>} - YouTube analytics data
 */
const getYouTubeAnalytics = async (url) => {
  try {
    const profileData = await getProfileData(url, 'youtube');
    
    return {
      platform: 'youtube',
      supported: true,
      followers: profileData.subscriberCount || 0,
      profileName: profileData.title || '',
      username: profileData.username || '',
      avatar: profileData.thumbnailUrl || '',
      bio: profileData.description || '',
      isVerified: !!profileData.isVerified,
      external_url: url,
      growth: Math.floor(Math.random() * 15) + 1, // Placeholder for growth data
      videos: profileData.videoCount || 0,
      views: profileData.viewCount || 0,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get Instagram analytics
 * @param {string} url - Instagram profile URL
 * @returns {Promise<Object>} - Instagram analytics data
 */
const getInstagramAnalytics = async (url) => {
  try {
    const profileData = await getProfileData(url, 'instagram');
    
    return {
      platform: 'instagram',
      supported: true,
      followers: profileData.followerCount || 0,
      profileName: profileData.fullName || profileData.username || '',
      username: profileData.username || '',
      avatar: profileData.profilePicUrl || '',
      bio: profileData.biography || '',
      isVerified: !!profileData.isVerified,
      external_url: url,
      growth: Math.floor(Math.random() * 20) + 1, // Placeholder for growth data
      posts: profileData.mediaCount || 0,
      following: profileData.followingCount || 0,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get TikTok analytics
 * @param {string} url - TikTok profile URL
 * @returns {Promise<Object>} - TikTok analytics data
 */
const getTikTokAnalytics = async (url) => {
  try {
    const profileData = await getProfileData(url, 'tiktok');
    
    return {
      platform: 'tiktok',
      supported: true,
      followers: profileData.followerCount || 0,
      profileName: profileData.nickname || profileData.username || '',
      username: profileData.username || '',
      avatar: profileData.avatarUrl || '',
      bio: profileData.signature || '',
      isVerified: !!profileData.verified,
      external_url: url,
      growth: Math.floor(Math.random() * 25) + 1, // Placeholder for growth data
      likes: profileData.heartCount || 0,
      videos: profileData.videoCount || 0,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get Twitter/X analytics
 * @param {string} url - Twitter profile URL
 * @returns {Promise<Object>} - Twitter analytics data
 */
const getTwitterAnalytics = async (url) => {
  try {
    const profileData = await getProfileData(url, 'twitter');
    
    return {
      platform: 'twitter',
      supported: true,
      followers: profileData.followersCount || 0,
      profileName: profileData.name || profileData.username || '',
      username: profileData.username || '',
      avatar: profileData.profileImageUrl || '',
      bio: profileData.description || '',
      isVerified: !!profileData.verified,
      external_url: url,
      growth: Math.floor(Math.random() * 10) + 1, // Placeholder for growth data
      following: profileData.friendsCount || 0,
      tweets: profileData.statusesCount || 0,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get Facebook analytics
 * @param {string} url - Facebook profile URL
 * @returns {Promise<Object>} - Facebook analytics data
 */
const getFacebookAnalytics = async (url) => {
  try {
    const profileData = await getProfileData(url, 'facebook');
    
    return {
      platform: 'facebook',
      supported: true,
      followers: profileData.likesCount || profileData.followersCount || 0,
      profileName: profileData.name || '',
      username: profileData.username || '',
      avatar: profileData.profilePicture || '',
      bio: profileData.about || '',
      isVerified: !!profileData.verified,
      external_url: url,
      growth: Math.floor(Math.random() * 8) + 1, // Placeholder for growth data
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get Threads analytics
 * @param {string} url - Threads profile URL
 * @returns {Promise<Object>} - Threads analytics data
 */
const getThreadsAnalytics = async (url) => {
  try {
    const profileData = await getProfileData(url, 'threads');
    
    return {
      platform: 'threads',
      supported: true,
      followers: profileData.followerCount || 0,
      profileName: profileData.fullName || profileData.username || '',
      username: profileData.username || '',
      avatar: profileData.profilePicUrl || '',
      bio: profileData.biography || '',
      isVerified: !!profileData.isVerified,
      external_url: url,
      growth: Math.floor(Math.random() * 15) + 1, // Placeholder for growth data
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get platform analytics based on URL
 * @param {string} url - Social media profile URL
 * @returns {Promise<Object>} - Platform analytics data
 */
const getPlatformAnalytics = async (url) => {
  try {
    // Determine platform from URL
    let platform = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      platform = 'youtube';
    } else if (url.includes('instagram.com')) {
      platform = 'instagram';
    } else if (url.includes('tiktok.com')) {
      platform = 'tiktok';
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      platform = 'twitter';
    } else if (url.includes('facebook.com')) {
      platform = 'facebook';
    } else if (url.includes('threads.net')) {
      platform = 'threads';
    } else {
      throw new Error('Unsupported platform URL');
    }
    
    // Call appropriate platform analytics function
    switch (platform) {
      case 'youtube':
        return await getYouTubeAnalytics(url);
      case 'instagram':
        return await getInstagramAnalytics(url);
      case 'tiktok':
        return await getTikTokAnalytics(url);
      case 'twitter':
        return await getTwitterAnalytics(url);
      case 'facebook':
        return await getFacebookAnalytics(url);
      case 'threads':
        return await getThreadsAnalytics(url);
      default:
        throw new Error('Unsupported platform');
    }
  } catch (error) {
    console.error('Error getting platform analytics:', error.message);
    throw error;
  }
};

module.exports = {
  getProfileData,
  getYouTubeAnalytics,
  getInstagramAnalytics,
  getTikTokAnalytics,
  getTwitterAnalytics,
  getFacebookAnalytics,
  getThreadsAnalytics,
  getPlatformAnalytics
}; 