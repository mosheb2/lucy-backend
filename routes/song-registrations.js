const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get song registrations for current user or filtered by parameters
router.get('/filter', async (req, res) => {
  try {
    const { user_id, status, limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('song_registrations')
      .select(`
        *,
        profiles!song_registrations_user_id_fkey (
          id, username, full_name, avatar_url
        ),
        tracks!song_registrations_track_id_fkey (
          id, title, cover_art_url, audio_url
        )
      `);
    
    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      // If no user_id provided, return only the current user's registrations
      query = query.eq('user_id', req.user.id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Get song registrations error:', error);
      return res.status(500).json({ error: 'Failed to get song registrations' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get song registrations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get song registration by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('song_registrations')
      .select(`
        *,
        profiles!song_registrations_user_id_fkey (
          id, username, full_name, avatar_url
        ),
        tracks!song_registrations_track_id_fkey (
          id, title, cover_art_url, audio_url
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ error: 'Song registration not found' });
    }
    
    // Check if user is authorized to view this registration
    if (data.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get song registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create song registration
router.post('/', [
  body('track_id').isUUID().notEmpty(),
  body('title').isString().notEmpty(),
  body('writers').isArray(),
  body('publishers').optional().isArray(),
  body('registration_type').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { track_id, title, writers, publishers, registration_type, additional_info } = req.body;
    
    // Check if track belongs to user
    const { data: track } = await supabase
      .from('tracks')
      .select('user_id')
      .eq('id', track_id)
      .single();
    
    if (!track || track.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only register your own tracks' });
    }
    
    const { data, error } = await supabase
      .from('song_registrations')
      .insert({
        user_id: req.user.id,
        track_id,
        title,
        writers,
        publishers,
        registration_type,
        additional_info,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to create song registration' });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Create song registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update song registration
router.put('/:id', [
  body('title').optional().isString(),
  body('writers').optional().isArray(),
  body('publishers').optional().isArray(),
  body('status').optional().isString(),
  body('additional_info').optional().isObject()
], async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if registration exists and belongs to user
    const { data: registration } = await supabase
      .from('song_registrations')
      .select('user_id, status')
      .eq('id', id)
      .single();
    
    if (!registration) {
      return res.status(404).json({ error: 'Song registration not found' });
    }
    
    // Only allow updates if user owns the registration or is admin
    // Regular users can only update pending registrations
    if (
      (registration.user_id !== req.user.id || registration.status !== 'pending') && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Unauthorized or registration cannot be modified' });
    }
    
    // Only admins can update status
    if (req.body.status && req.user.role !== 'admin') {
      delete req.body.status;
    }
    
    const updateData = { ...req.body, updated_at: new Date().toISOString() };
    
    const { data, error } = await supabase
      .from('song_registrations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to update song registration' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Update song registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete song registration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if registration exists and belongs to user
    const { data: registration } = await supabase
      .from('song_registrations')
      .select('user_id, status')
      .eq('id', id)
      .single();
    
    if (!registration) {
      return res.status(404).json({ error: 'Song registration not found' });
    }
    
    // Only allow deletion if user owns the registration or is admin
    // Regular users can only delete pending registrations
    if (
      (registration.user_id !== req.user.id || registration.status !== 'pending') && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Unauthorized or registration cannot be deleted' });
    }
    
    const { error } = await supabase
      .from('song_registrations')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(500).json({ error: 'Failed to delete song registration' });
    }
    
    res.json({ message: 'Song registration deleted successfully' });
  } catch (error) {
    console.error('Delete song registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get song registrations for current user or filtered by parameters
router.get('/filter', async (req, res) => {
  try {
    const { user_id, status, limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('song_registrations')
      .select(`
        *,
        profiles!song_registrations_user_id_fkey (
          id, username, full_name, avatar_url
        ),
        tracks!song_registrations_track_id_fkey (
          id, title, cover_art_url, audio_url
        )
      `);
    
    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      // If no user_id provided, return only the current user's registrations
      query = query.eq('user_id', req.user.id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Get song registrations error:', error);
      return res.status(500).json({ error: 'Failed to get song registrations' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get song registrations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get song registration by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('song_registrations')
      .select(`
        *,
        profiles!song_registrations_user_id_fkey (
          id, username, full_name, avatar_url
        ),
        tracks!song_registrations_track_id_fkey (
          id, title, cover_art_url, audio_url
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ error: 'Song registration not found' });
    }
    
    // Check if user is authorized to view this registration
    if (data.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get song registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create song registration
router.post('/', [
  body('track_id').isUUID().notEmpty(),
  body('title').isString().notEmpty(),
  body('writers').isArray(),
  body('publishers').optional().isArray(),
  body('registration_type').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { track_id, title, writers, publishers, registration_type, additional_info } = req.body;
    
    // Check if track belongs to user
    const { data: track } = await supabase
      .from('tracks')
      .select('user_id')
      .eq('id', track_id)
      .single();
    
    if (!track || track.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only register your own tracks' });
    }
    
    const { data, error } = await supabase
      .from('song_registrations')
      .insert({
        user_id: req.user.id,
        track_id,
        title,
        writers,
        publishers,
        registration_type,
        additional_info,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to create song registration' });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Create song registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update song registration
router.put('/:id', [
  body('title').optional().isString(),
  body('writers').optional().isArray(),
  body('publishers').optional().isArray(),
  body('status').optional().isString(),
  body('additional_info').optional().isObject()
], async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if registration exists and belongs to user
    const { data: registration } = await supabase
      .from('song_registrations')
      .select('user_id, status')
      .eq('id', id)
      .single();
    
    if (!registration) {
      return res.status(404).json({ error: 'Song registration not found' });
    }
    
    // Only allow updates if user owns the registration or is admin
    // Regular users can only update pending registrations
    if (
      (registration.user_id !== req.user.id || registration.status !== 'pending') && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Unauthorized or registration cannot be modified' });
    }
    
    // Only admins can update status
    if (req.body.status && req.user.role !== 'admin') {
      delete req.body.status;
    }
    
    const updateData = { ...req.body, updated_at: new Date().toISOString() };
    
    const { data, error } = await supabase
      .from('song_registrations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to update song registration' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Update song registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete song registration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if registration exists and belongs to user
    const { data: registration } = await supabase
      .from('song_registrations')
      .select('user_id, status')
      .eq('id', id)
      .single();
    
    if (!registration) {
      return res.status(404).json({ error: 'Song registration not found' });
    }
    
    // Only allow deletion if user owns the registration or is admin
    // Regular users can only delete pending registrations
    if (
      (registration.user_id !== req.user.id || registration.status !== 'pending') && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Unauthorized or registration cannot be deleted' });
    }
    
    const { error } = await supabase
      .from('song_registrations')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(500).json({ error: 'Failed to delete song registration' });
    }
    
    res.json({ message: 'Song registration deleted successfully' });
  } catch (error) {
    console.error('Delete song registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 