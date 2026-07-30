const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { db } = deps;

  router.get('/', async (_req, res) => {
    try {
      const posts = await db.getPosts();
      return res.json({ success: true, posts });
    } catch (err) {
      console.error('GET /api/posts error:', err && err.message ? err.message : err);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
