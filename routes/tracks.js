const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get all tracks for current user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('tracks')
      .select(`
        *,
        profiles!tracks_user_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .eq('user_id', req.user.id)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get tracks' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get tracks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get track by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('tracks')
      .select(`
        *,
        profiles!tracks_user_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new track
router.post('/', [
  body('title').notEmpty().trim(),
  body('genre').optional().trim(),
  body('description').optional().trim(),
  body('audio_url').optional().isURL(),
  body('cover_art_url').optional().isURL(),
  body('duration').optional().isNumeric(),
  body('bpm').optional().isNumeric(),
  body('key').optional().trim(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      genre,
      description,
      audio_url,
      cover_art_url,
      duration,
      bpm,
      key,
      tags
    } = req.body;

    const { data, error } = await supabase
      .from('tracks')
      .insert({
        user_id: req.user.id,
        title,
        genre,
        description,
        audio_url,
        cover_art_url,
        duration,
        bpm,
        key,
        tags,
        status: 'draft',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create track' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update track
router.put('/:id', [
  body('title').optional().trim(),
  body('genre').optional().trim(),
  body('description').optional().trim(),
  body('audio_url').optional().isURL(),
  body('cover_art_url').optional().isURL(),
  body('duration').optional().isNumeric(),
  body('bpm').optional().isNumeric(),
  body('key').optional().trim(),
  body('tags').optional().isArray(),
  body('status').optional().isIn(['draft', 'published', 'archived'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date().toISOString() };

    // Check if track belongs to user
    const { data: existingTrack } = await supabase
      .from('tracks')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existingTrack) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const { data, error } = await supabase
      .from('tracks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update track' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete track
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if track belongs to user
    const { data: existingTrack } = await supabase
      .from('tracks')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existingTrack) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete track' });
    }

    res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    console.error('Delete track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public tracks
router.get('/public/feed', async (req, res) => {
  try {
    const { page = 1, limit = 20, genre, sort = 'latest' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tracks')
      .select(`
        *,
        profiles!tracks_user_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .eq('status', 'published')
      .range(offset, offset + limit - 1);

    if (genre) {
      query = query.eq('genre', genre);
    }

    if (sort === 'popular') {
      query = query.order('play_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to get tracks' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get public tracks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like track
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('track_id', id)
      .single();

    if (existingLike) {
      return res.status(400).json({ error: 'Already liked this track' });
    }

    const { data, error } = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        track_id: id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to like track' });
    }

    res.json(data);
  } catch (error) {
    console.error('Like track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlike track
router.delete('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('track_id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to unlike track' });
    }

    res.json({ message: 'Unliked successfully' });
  } catch (error) {
    console.error('Unlike track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 