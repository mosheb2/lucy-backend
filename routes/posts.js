const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get posts feed
router.get('/feed', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get posts from followed users and current user
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', req.user.id);

    const followedUserIds = follows.map(f => f.following_id);
    followedUserIds.push(req.user.id);

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          id, username, full_name, avatar_url
        ),
        tracks!posts_track_id_fkey (
          id, title, cover_art_url
        ),
        likes (id),
        comments (id)
      `)
      .in('user_id', followedUserIds)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get posts' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create post
router.post('/', [
  body('content').notEmpty().trim(),
  body('track_id').optional().isUUID(),
  body('media_urls').optional().isArray(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, track_id, media_urls, tags } = req.body;

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: req.user.id,
        content,
        track_id,
        media_urls,
        tags,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create post' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get post by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          id, username, full_name, avatar_url
        ),
        tracks!posts_track_id_fkey (
          id, title, cover_art_url
        ),
        likes (
          id,
          profiles!likes_user_id_fkey (
            id, username, full_name, avatar_url
          )
        ),
        comments (
          id,
          content,
          created_at,
          profiles!comments_user_id_fkey (
            id, username, full_name, avatar_url
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update post
router.put('/:id', [
  body('content').optional().trim(),
  body('media_urls').optional().isArray(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date().toISOString() };

    // Check if post belongs to user
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update post' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if post belongs to user
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete post' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like post
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', id)
      .single();

    if (existingLike) {
      return res.status(400).json({ error: 'Already liked this post' });
    }

    const { data, error } = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        post_id: id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to like post' });
    }

    res.json(data);
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlike post
router.delete('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to unlike post' });
    }

    res.json({ message: 'Unliked successfully' });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment
router.post('/:id/comments', [
  body('content').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content } = req.body;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: req.user.id,
        post_id: id,
        content,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        profiles!comments_user_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to add comment' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 