const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { authenticateToken, db } = deps;

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const calls = await db.getCalls();
      return res.json({ success: true, calls });
    } catch (error) {
      console.error('Fetch calls error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching call log' });
    }
  });

  router.post('/initiate', authenticateToken, async (req, res) => {
    try {
      const { recipientId, duration, status, type } = req.body;
      if (!recipientId || !status || !type) {
        return res.status(400).json({ success: false, error: 'Missing calling parameters' });
      }
  
      const allUsers = await db.getUsers();
      const recipientUser = allUsers.find(u => u.id === recipientId);
      if (!recipientUser) {
        return res.status(404).json({ success: false, error: 'Recipient user not found' });
      }
  
      const phone = type === 'Emergency Call' 
        ? recipientUser.emergencyPhone 
        : recipientUser.phone;
  
      // Save Call Record
      const callRecord = await db.saveCall({
        senderId: req.user.id,
        senderName: req.user.name,
        recipientId,
        recipientName: recipientUser.name,
        recipientPhone: phone || 'No phone set',
        duration: duration || 0,
        status,
        type
      });
  
      console.log(`\n========================================`);
      console.log(`📞 CRM CALL DIALER INTEGRATION: [${type.toUpperCase()}]`);
      console.log(`Caller: ${req.user.name}`);
      console.log(`Recipient: ${recipientUser.name} (${phone})`);
      console.log(`Status: ${status} | Duration: ${duration}s`);
      console.log(`========================================\n`);
  
      return res.json({
        success: true,
        message: `Call successfully simulated and recorded.`,
        callRecord
      });
    } catch (error) {
      console.error('Initiate call error:', error);
      return res.status(500).json({ success: false, error: 'Server error initiating call' });
    }
  });

  return router;
};
