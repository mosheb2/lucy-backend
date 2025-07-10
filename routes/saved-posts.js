const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get saved posts for current user
router.get('/filter', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const { data, error } = await supabase
      .from('saved_posts')
      .select(`
        id,
        created_at,
        post_id,
        posts (
          *,
          profiles!posts_user_id_fkey (
            id, username, full_name, avatar_url
          ),
          tracks!posts_track_id_fkey (
            id, title, cover_art_url
          ),
          likes (id),
          comments (id)
        )
      `)
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get saved posts error:', error);
      return res.status(500).json({ error: 'Failed to get saved posts' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save a post
router.post('/', [
  body('post_id').isUUID().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { post_id } = req.body;
    const userId = req.user.id;
    
    // Check if already saved
    const { data: existingSave } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', post_id)
      .single();
    
    if (existingSave) {
      return res.status(400).json({ error: 'Post already saved' });
    }
    
    const { data, error } = await supabase
      .from('saved_posts')
      .insert({
        user_id: userId,
        post_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to save post' });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unsave a post
router.delete('/:post_id', async (req, res) => {
  try {
    const { post_id } = req.params;
    const userId = req.user.id;
    
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', post_id);
    
    if (error) {
      return res.status(500).json({ error: 'Failed to unsave post' });
    }
    
    res.json({ message: 'Post unsaved successfully' });
  } catch (error) {
    console.error('Unsave post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get saved posts for current user
router.get('/filter', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const { data, error } = await supabase
      .from('saved_posts')
      .select(`
        id,
        created_at,
        post_id,
        posts (
          *,
          profiles!posts_user_id_fkey (
            id, username, full_name, avatar_url
          ),
          tracks!posts_track_id_fkey (
            id, title, cover_art_url
          ),
          likes (id),
          comments (id)
        )
      `)
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get saved posts error:', error);
      return res.status(500).json({ error: 'Failed to get saved posts' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save a post
router.post('/', [
  body('post_id').isUUID().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { post_id } = req.body;
    const userId = req.user.id;
    
    // Check if already saved
    const { data: existingSave } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', post_id)
      .single();
    
    if (existingSave) {
      return res.status(400).json({ error: 'Post already saved' });
    }
    
    const { data, error } = await supabase
      .from('saved_posts')
      .insert({
        user_id: userId,
        post_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to save post' });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unsave a post
router.delete('/:post_id', async (req, res) => {
  try {
    const { post_id } = req.params;
    const userId = req.user.id;
    
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', post_id);
    
    if (error) {
      return res.status(500).json({ error: 'Failed to unsave post' });
    }
    
    res.json({ message: 'Post unsaved successfully' });
  } catch (error) {
    console.error('Unsave post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 