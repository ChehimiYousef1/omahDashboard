const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { JWT_SECRET, authenticateToken, bcrypt, db, jwt } = deps;

  router.post('/signup', async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'Please enter all fields' });
      }
  
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 12);
  
      const newUser = await db.createUser({
        name,
        email,
        password: hashedPassword,
        role: role || 'User'
      });
  
      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
  
      return res.status(201).json({
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar,
          coverPage: newUser.coverPage
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ success: false, error: 'Server error during signup' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Please enter email and password' });
      }
  
      const user = await db.getUserByEmail(email);
      const passwordMatch = user && (await bcrypt.compare(password, user.password));
      if (!passwordMatch) {
        return res.status(400).json({ success: false, error: 'Invalid email or password' });
      }
  
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
  
      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          coverPage: user.coverPage
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, error: 'Server error during login' });
    }
  });

  router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  router.get('/me', authenticateToken, (req, res) => {
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        avatar: req.user.avatar,
        coverPage: req.user.coverPage
      }
    });
  });

  return router;
};
