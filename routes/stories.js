const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get stories feed
router.get('/feed', async (req, res) => {
  try {
    // Get stories from followed users and current user
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', req.user.id);

    const followedUserIds = follows.map(f => f.following_id);
    followedUserIds.push(req.user.id);

    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        profiles!stories_user_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .in('user_id', followedUserIds)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get stories' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create story
router.post('/', [
  body('media_url').isURL(),
  body('type').isIn(['image', 'video']),
  body('caption').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { media_url, type, caption } = req.body;

    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: req.user.id,
        media_url,
        type,
        caption,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create story' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete story
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if story belongs to user
    const { data: existingStory } = await supabase
      .from('stories')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existingStory) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete story' });
    }

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 