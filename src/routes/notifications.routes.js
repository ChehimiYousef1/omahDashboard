const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { authenticateToken, db } = deps;

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const notifications = await db.getNotifications();
      return res.json({ success: true, notifications });
    } catch (error) {
      console.error('Fetch notifications error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching notifications' });
    }
  });

  router.post('/send', authenticateToken, async (req, res) => {
    try {
      const { recipientType, recipientId, recipientGroup, title, message, channel } = req.body;
      
      if (!recipientType || !title || !message || !channel) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
      }
  
      const allUsers = await db.getUsers();
      let recipients = [];
      let recipientNameSummary = '';
  
      if (recipientType === 'direct') {
        const targetUser = allUsers.find(u => u.id === recipientId);
        if (!targetUser) {
          return res.status(404).json({ success: false, error: 'User not found' });
        }
        recipients = [targetUser];
        recipientNameSummary = targetUser.name;
      } else {
        if (recipientGroup === 'all') {
          recipients = allUsers;
          recipientNameSummary = 'All Users';
        } else if (recipientGroup === 'students') {
          recipients = allUsers.filter(u => u.isStudent);
          recipientNameSummary = 'Students';
        } else if (recipientGroup === 'professionals') {
          recipients = allUsers.filter(u => !u.isStudent && u.role === 'User');
          recipientNameSummary = 'Professionals';
        } else if (recipientGroup === 'verified') {
          recipients = allUsers.filter(u => u.isVerified);
          recipientNameSummary = 'Verified Users';
        } else if (recipientGroup === 'unverified') {
          recipients = allUsers.filter(u => !u.isVerified);
          recipientNameSummary = 'Unverified Users';
        } else {
          return res.status(400).json({ success: false, error: 'Invalid group' });
        }
      }
  
      // Filter recipients who have active permissions for the requested channel
      const allowedRecipients = recipients.filter(r => {
        if (!r.notificationPermissions) return true;
        return r.notificationPermissions[channel] !== false;
      });
  
      const optOutCount = recipients.length - allowedRecipients.length;
  
      if (allowedRecipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: `All selected recipients have disabled ${channel} notifications.`
        });
      }
  
      // Save outbox record
      const notificationRecord = await db.saveNotification({
        senderId: req.user.id,
        senderName: req.user.name,
        recipientType,
        recipientGroup: recipientType === 'bulk' ? recipientGroup : null,
        recipientSummary: recipientNameSummary,
        recipientCount: allowedRecipients.length,
        optOutCount,
        title,
        message,
        channel,
        status: 'Sent'
      });
  
      console.log(`\n========================================`);
      console.log(`🔔 ALERTS DISPATCHED: [${channel.toUpperCase()} CHANNEL]`);
      console.log(`Title: ${title}`);
      console.log(`Body: ${message}`);
      console.log(`Delivered to: ${allowedRecipients.length} users | Opt-outs skipped: ${optOutCount}`);
      console.log(`========================================\n`);
  
      return res.json({
        success: true,
        message: `Notification dispatched successfully. Sent to ${allowedRecipients.length} recipients. (${optOutCount} opt-outs skipped).`,
        notificationRecord
      });
    } catch (error) {
      console.error('Send notification error:', error);
      return res.status(500).json({ success: false, error: 'Server error dispatching notification' });
    }
  });

  router.post('/resend', authenticateToken, async (req, res) => {
    try {
      const { notificationId } = req.body;
      const notifications = await db.getNotifications();
      const existing = notifications.find(n => n.id === parseInt(notificationId, 10));
      
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Original notification record not found' });
      }
  
      const resentRecord = await db.saveNotification({
        senderId: req.user.id,
        senderName: req.user.name,
        recipientType: existing.recipientType,
        recipientGroup: existing.recipientGroup,
        recipientSummary: existing.recipientSummary + ' (Resent)',
        recipientCount: existing.recipientCount,
        optOutCount: existing.optOutCount || 0,
        title: existing.title,
        message: existing.message,
        channel: existing.channel,
        status: 'Sent'
      });
  
      console.log(`\n========================================`);
      console.log(`🔔 RESENDING ALERT: [${existing.channel.toUpperCase()} CHANNEL]`);
      console.log(`Title: ${existing.title} (Resending original campaign)`);
      console.log(`========================================\n`);
  
      return res.json({
        success: true,
        message: 'Notification resent successfully.',
        notificationRecord: resentRecord
      });
    } catch (error) {
      console.error('Resend notification error:', error);
      return res.status(500).json({ success: false, error: 'Server error resending notification' });
    }
  });

  return router;
};
