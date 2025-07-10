const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const router = express.Router();

// Get chat rooms
router.get('/rooms', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!chat_participants_room_id_fkey (
          user_id,
          profiles!chat_participants_user_id_fkey (
            id, username, full_name, avatar_url
          )
        )
      `)
      .contains('participant_ids', [req.user.id])
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get chat rooms' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a chat room
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is participant
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('participant_ids')
      .eq('id', roomId)
      .single();

    if (!room || !room.participant_ids.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles!messages_user_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .eq('room_id', roomId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get messages' });
    }

    res.json(data.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message
router.post('/rooms/:roomId/messages', [
  body('content').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId } = req.params;
    const { content } = req.body;

    // Check if user is participant
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('participant_ids')
      .eq('id', roomId)
      .single();

    if (!room || !room.participant_ids.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        user_id: req.user.id,
        content,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        profiles!messages_user_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // Update room's updated_at timestamp
    await supabase
      .from('chat_rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId);

    res.status(201).json(data);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 