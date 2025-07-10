const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get all mentors
router.get('/', async (req, res) => {
  try {
    const { sort = '-created_date', limit = 50 } = req.query;
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? { ascending: false } : { ascending: true };
    
    const { data, error } = await supabase
      .from('mentors')
      .select(`
        *,
        profiles (
          id, username, full_name, avatar_url, bio
        )
      `)
      .order(sortField, sortOrder)
      .limit(limit);
    
    if (error) {
      console.error('Get mentors error:', error);
      return res.status(500).json({ error: 'Failed to get mentors' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get mentors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mentor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('mentors')
      .select(`
        *,
        profiles (
          id, username, full_name, avatar_url, bio
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ error: 'Mentor not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get mentor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create mentor (admin only)
router.post('/', [
  body('user_id').isUUID().notEmpty(),
  body('expertise').isArray().notEmpty(),
  body('hourly_rate').isNumeric(),
  body('availability').isObject()
], async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { user_id, expertise, hourly_rate, availability, bio } = req.body;
    
    const { data, error } = await supabase
      .from('mentors')
      .insert({
        user_id,
        expertise,
        hourly_rate,
        availability,
        bio,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to create mentor' });
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Create mentor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update mentor
router.put('/:id', [
  body('expertise').optional().isArray(),
  body('hourly_rate').optional().isNumeric(),
  body('availability').optional().isObject(),
  body('bio').optional().isString()
], async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if user is admin or the mentor
    const { data: mentor } = await supabase
      .from('mentors')
      .select('user_id')
      .eq('id', id)
      .single();
    
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }
    
    if (mentor.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const updateData = { ...req.body, updated_at: new Date().toISOString() };
    
    const { data, error } = await supabase
      .from('mentors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to update mentor' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Update mentor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete mentor (admin only)
router.delete('/:id', async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    
    const { error } = await supabase
      .from('mentors')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(500).json({ error: 'Failed to delete mentor' });
    }
    
    res.json({ message: 'Mentor deleted successfully' });
  } catch (error) {
    console.error('Delete mentor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 