const jwt = require('jsonwebtoken');
const accessSecret = () => {
  const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT access secret is not defined in environment');
  return secret;
};
const refreshSecret = () => {
  const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT refresh secret is not defined in environment');
  return secret;
};
const accessExpiration = () => process.env.JWT_EXPIRATION || process.env.ACCESS_TOKEN_TTL || '15m';
const refreshExpiration = () => process.env.REFRESH_TOKEN_TTL || '30d';

function signAccess(user) { 
  return jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role || 'user' }, accessSecret(), { expiresIn: accessExpiration() }); 
}

function signRefresh(user) { 
  // Adding tokenVersion to refresh token payload
  return jwt.sign({ sub: user._id.toString(), type: 'refresh', tokenVersion: user.tokenVersion || 0 }, refreshSecret(), { expiresIn: refreshExpiration() }); 
}

function authenticate(req, _res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
    const payload = jwt.verify(token, accessSecret());
    if (payload.type === 'refresh') throw Object.assign(new Error('Refresh token cannot be used as an access token'), { status: 401 });
    req.user = payload; 
    next();
  } catch (e) { 
    e.status = 401; 
    next(e); 
  }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }
  next();
}

module.exports = { signAccess, signRefresh, authenticate, requireAdmin };
