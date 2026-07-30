const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { authenticateToken, db } = deps;

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const users = await db.getUsers();
      // Exclude passwords from response
      const cleanUsers = users.map(u => {
        const { password, ...clean } = u;
        return clean;
      });
      return res.json({ success: true, users: cleanUsers });
    } catch (error) {
      console.error('Fetch users error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching users' });
    }
  });

  router.post('/:id/notifications/toggle', authenticateToken, async (req, res) => {
    try {
      const userId = req.params.id;
      const { push, email, inApp } = req.body;
      
      const updatedUser = await db.updateNotificationPermissions(userId, { push, email, inApp });
      if (!updatedUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
  
      return res.json({
        success: true,
        message: 'Notification permissions updated successfully',
        notificationPermissions: updatedUser.notificationPermissions
      });
    } catch (error) {
      console.error('Toggle notification permission error:', error);
      return res.status(500).json({ success: false, error: 'Server error updating permissions' });
    }
  });

  return router;
};
