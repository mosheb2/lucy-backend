const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();

// Get user analytics
router.get('/user', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    // Get track analytics
    const { data: tracks } = await supabase
      .from('tracks')
      .select('id, title, play_count, like_count')
      .eq('user_id', userId);

    // Get post analytics
    const { data: posts } = await supabase
      .from('posts')
      .select('id, like_count, comment_count')
      .eq('user_id', userId);

    // Get follower count
    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact' })
      .eq('following_id', userId);

    // Get following count
    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact' })
      .eq('follower_id', userId);

    const analytics = {
      tracks: {
        total: tracks?.length || 0,
        total_plays: tracks?.reduce((sum, track) => sum + (track.play_count || 0), 0) || 0,
        total_likes: tracks?.reduce((sum, track) => sum + (track.like_count || 0), 0) || 0
      },
      posts: {
        total: posts?.length || 0,
        total_likes: posts?.reduce((sum, post) => sum + (post.like_count || 0), 0) || 0,
        total_comments: posts?.reduce((sum, post) => sum + (post.comment_count || 0), 0) || 0
      },
      social: {
        followers,
        following
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 