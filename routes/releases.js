const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get all releases for current user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('releases')
      .select(`
        *,
        profiles!releases_user_id_fkey (
          id, username, full_name, avatar_url
        ),
        tracks!releases_tracks_fkey (
          id, title, duration, cover_art_url
        )
      `)
      .eq('user_id', req.user.id)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get releases' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get releases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new release
router.post('/', [
  body('title').notEmpty().trim(),
  body('type').isIn(['single', 'ep', 'album']),
  body('description').optional().trim(),
  body('cover_art_url').optional().isURL(),
  body('release_date').optional().isISO8601(),
  body('genre').optional().trim(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      type,
      description,
      cover_art_url,
      release_date,
      genre,
      tags
    } = req.body;

    const { data, error } = await supabase
      .from('releases')
      .insert({
        user_id: req.user.id,
        title,
        type,
        description,
        cover_art_url,
        release_date,
        genre,
        tags,
        status: 'draft',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create release' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create release error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add track to release
router.post('/:id/tracks', [
  body('track_id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { track_id } = req.body;

    // Check if release belongs to user
    const { data: existingRelease } = await supabase
      .from('releases')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existingRelease) {
      return res.status(404).json({ error: 'Release not found' });
    }

    // Check if track belongs to user
    const { data: existingTrack } = await supabase
      .from('tracks')
      .select('id')
      .eq('id', track_id)
      .eq('user_id', req.user.id)
      .single();

    if (!existingTrack) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const { data, error } = await supabase
      .from('release_tracks')
      .insert({
        release_id: id,
        track_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to add track to release' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Add track to release error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 