const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const supabase = require('../config/supabase');
const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get users' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update user role' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    // Get counts
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    const { count: totalTracks } = await supabase
      .from('tracks')
      .select('*', { count: 'exact' });

    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact' });

    const { count: totalReleases } = await supabase
      .from('releases')
      .select('*', { count: 'exact' });

    const stats = {
      totalUsers,
      totalTracks,
      totalPosts,
      totalReleases,
      timestamp: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary migration route to fix analytics_events table
router.post('/migrate-analytics', async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const migrationSQL = `
      -- Add missing columns to analytics_events table
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS page_url TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS referrer TEXT;
      
      -- Create index for session_id
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
    `;

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration error:', error);
      return res.status(500).json({ error: 'Migration failed', details: error });
    }

    res.json({ 
      success: true, 
      message: 'Analytics events table migration completed successfully',
      data 
    });
  } catch (error) {
    console.error('Migration route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 