import express from 'express';
import supabase from '../supabaseClient.js';

const router = express.Router();

// Get user's notifications
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});
router.get('/notifications/unread-count', async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const redis = await import('../config/redis.config.js');
    const cachedCount = await redis.default.get(`unread_count:${userId}`);
    
    if (cachedCount !== null) {
      return res.json({ count: parseInt(cachedCount) });
    }
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    await redis.default.set(`unread_count:${userId}`, count || 0);

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Update Redis unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    const redis = await import('../config/redis.config.js');
    await redis.default.set(`unread_count:${userId}`, count || 0);

    res.json({ success: true, notification: data });
  } catch (error) {
    console.error('Failed to mark as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});
router.put('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    // Update Redis unread count
    const redis = await import('../config/redis.config.js');
    await redis.default.set(`unread_count:${userId}`, 0);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Get unread count
router.get('/notifications/unread-count', async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Try Redis first
    const redis = await import('../config/redis.config.js');
    const cachedCount = await redis.default.get(`unread_count:${userId}`);
    
    if (cachedCount !== null) {
      return res.json({ count: parseInt(cachedCount) });
    }

    // Fallback to database
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    // Cache in Redis
    await redis.default.set(`unread_count:${userId}`, count || 0);

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;