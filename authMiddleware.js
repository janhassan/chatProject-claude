
const jwt = require('jsonwebtoken');

module.exports = function ensureAuth(req, res, next) {
  // 1) Expect header: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];

  try {
    // 2) Verify using your secret from .env
    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // 3) Attach user info for downstream handlers
    req.user = {
      userId: payload._id,        // matches how you signed it in createToken
      // you could also include username or email if you added them to the payload
    };

    // 4) Proceed
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
