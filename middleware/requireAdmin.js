const ADMIN_ROLES = ['Admin', 'Super Admin'];

module.exports = function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};
