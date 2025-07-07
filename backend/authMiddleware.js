import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ihopeyoudontmindlookingatthis'; 

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Middleware for admin or DEO access

export const requireAdminOrDEO = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'deo') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied - admin/DEO only' });
  }
};

// Middleware for admin only vvvip treatment yaya
export const requireAdmin = (req, res, next) => {
  if (req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied - admin only' });
  }
};