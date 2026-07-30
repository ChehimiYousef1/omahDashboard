const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { authenticateToken, db } = deps;

  router.get('/db-summary', authenticateToken, async (req, res) => {
    try {
      const summary = await db.getDbSummary();
      return res.json({ success: true, summary });
    } catch (error) {
      console.error('Fetch DB summary error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching DB summary' });
    }
  });

  return router;
};
