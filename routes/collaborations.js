const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get collaborations
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collaborations')
      .select(`
        *,
        profiles!collaborations_initiator_id_fkey (
          id, username, full_name, avatar_url
        ),
        profiles!collaborations_collaborator_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .or(`initiator_id.eq.${req.user.id},collaborator_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get collaborations' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get collaborations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create collaboration request
router.post('/', [
  body('collaborator_id').isUUID(),
  body('message').notEmpty().trim(),
  body('project_type').isIn(['track', 'album', 'remix', 'feature'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { collaborator_id, message, project_type } = req.body;

    if (collaborator_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot collaborate with yourself' });
    }

    const { data, error } = await supabase
      .from('collaborations')
      .insert({
        initiator_id: req.user.id,
        collaborator_id,
        message,
        project_type,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create collaboration' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create collaboration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept/Reject collaboration
router.put('/:id/respond', [
  body('status').isIn(['accepted', 'rejected']),
  body('response_message').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, response_message } = req.body;

    // Check if collaboration exists and user is the collaborator
    const { data: existingCollab } = await supabase
      .from('collaborations')
      .select('id, status')
      .eq('id', id)
      .eq('collaborator_id', req.user.id)
      .single();

    if (!existingCollab) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    if (existingCollab.status !== 'pending') {
      return res.status(400).json({ error: 'Collaboration already responded to' });
    }

    const { data, error } = await supabase
      .from('collaborations')
      .update({
        status,
        response_message,
        responded_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update collaboration' });
    }

    res.json(data);
  } catch (error) {
    console.error('Respond to collaboration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 