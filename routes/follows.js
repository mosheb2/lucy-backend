const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get all follows for a user
router.get('/filter', async (req, res) => {
  try {
    const { user_id, type } = req.query;
    
    let query = supabase.from('follows');
    
    if (type === 'followers') {
      // Get users who follow the specified user
      query = query
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            id, username, full_name, avatar_url, bio
          )
        `)
        .eq('following_id', user_id || req.user.id);
    } else {
      // Get users followed by the specified user
      query = query
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id, username, full_name, avatar_url, bio
          )
        `)
        .eq('follower_id', user_id || req.user.id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Get follows error:', error);
      return res.status(500).json({ error: 'Failed to get follows' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get follows error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow a user
router.post('/', [
  body('following_id').isUUID().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { following_id } = req.body;
    const follower_id = req.user.id;
    
    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', follower_id)
      .eq('following_id', following_id)
      .single();
    
    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }
    
    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id,
        following_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to follow user' });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfollow a user
router.delete('/:following_id', async (req, res) => {
  try {
    const { following_id } = req.params;
    const follower_id = req.user.id;
    
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', follower_id)
      .eq('following_id', following_id);
    
    if (error) {
      return res.status(500).json({ error: 'Failed to unfollow user' });
    }
    
    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 