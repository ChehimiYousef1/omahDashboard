require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET =
  process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is required'
  );
}

if (
  process.env.NODE_ENV ===
    'production' &&
  JWT_SECRET.length < 32
) {
  throw new Error(
    'JWT_SECRET must be at least 32 characters in production'
  );
}

async function authenticateToken(req, res, next) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  try {
    const decoded =
      jwt.verify(
        token,
        JWT_SECRET,
        {
          algorithms: [
            'HS256',
          ],
        }
      );
    const user = await db.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

module.exports = { authenticateToken };
