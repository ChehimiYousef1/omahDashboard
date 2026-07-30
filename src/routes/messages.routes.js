const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { authenticateToken, db } = deps;

  router.get('/conversations', authenticateToken, async (req, res) => {
    try {
      const conversations = await db.getConversations();
      return res.json({ success: true, conversations });
    } catch (error) {
      console.error('Fetch conversations error:', error);
      return res.status(500).json({ success: false, error: 'Server error loading conversations' });
    }
  });

  router.get('/conversations/:id', authenticateToken, async (req, res) => {
    try {
      const convs = await db.getConversations();
      const match = convs.find(c => c.id === req.params.id);
      if (!match) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
      return res.json({ success: true, messages: match.messages });
    } catch (error) {
      console.error('Fetch messages error:', error);
      return res.status(500).json({ success: false, error: 'Server error loading messages' });
    }
  });

  router.post('/conversations/:id/flag', authenticateToken, async (req, res) => {
    try {
      const { isFlagged } = req.body;
      const updated = await db.flagConversation(req.params.id, isFlagged);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
      return res.json({ success: true, conversation: updated });
    } catch (error) {
      console.error('Flag conversation error:', error);
      return res.status(500).json({ success: false, error: 'Server error flagging chat' });
    }
  });

  router.post('/send', authenticateToken, async (req, res) => {
    try {
      const { userId, text, senderId } = req.body;
      if (!userId || !text) {
        return res.status(400).json({ success: false, error: 'Missing message parameters' });
      }
  
      const finalSenderId = senderId || req.user.id;
      const finalSenderName = finalSenderId === req.user.id ? req.user.name : 'User';
  
      // AI Spam Moderation Check
      const spamKeywords = ['crypto', 'scam', 'free money', 'buy tokens', 'bitcoin', 'credit card', 'scams', 'cash prize'];
      const textLower = text.toLowerCase();
      const isSpamMatch = spamKeywords.some(keyword => textLower.includes(keyword));
  
      // Save actual message
      const chatRecord = await db.saveMessage(userId, {
        senderId: finalSenderId,
        senderName: finalSenderName,
        text,
        isSpam: isSpamMatch,
        moderated: isSpamMatch
      });
  
      let autoWarningRecord = null;
  
      if (isSpamMatch) {
        // Auto Warning System: Automatically flag conversation and post warning bubble
        const convs = await db.getConversations();
        const match = convs.find(c => c.userId === userId);
        if (match) {
          await db.flagConversation(match.id, true);
          
          // Save System Warning bubble
          const warnResult = await db.saveMessage(userId, {
            senderId: 'system',
            senderName: 'System Moderator',
            text: '⚠️ Auto Warning: Promotional links, financial schemes, or suspicious keyword triggers are prohibited on OMAHCONNECT. Admin has been notified.',
            warningSent: true
          });
          autoWarningRecord = warnResult.message;
        }
      }
  
      return res.json({
        success: true,
        message: 'Message sent successfully',
        chatRecord: chatRecord.message,
        conversation: chatRecord.conversation,
        spamWarningTriggered: isSpamMatch,
        autoWarning: autoWarningRecord
      });
  
    } catch (error) {
      console.error('Send message error:', error);
      return res.status(500).json({ success: false, error: 'Server error sending message' });
    }
  });

  return router;
};
