const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Rate limiter specifically for login/OTP endpoints
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX) || 5,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware to authenticate JWT and enforce RBAC
const authenticate = (roles = []) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // { id, role, db_id, ... }

            // RBAC Check
            if (roles.length > 0 && !roles.includes(decoded.role)) {
                return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
            }

            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Unauthorized: Token expired' });
            }
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    };
};

module.exports = {
    loginLimiter,
    authenticate,
};
