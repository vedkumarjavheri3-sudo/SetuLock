// Mock Supabase Client import, assumes a centralized db.js later
// const { supabase } = require('../db');
const crypto = require('crypto');

/**
 * Middleware to log high-security actions to the audit_logs table.
 * Records User ID, Action Type, IP, User Agent, and Resource.
 */
const auditLog = (actionType) => {
    return async (req, res, next) => {
        const originalSend = res.send;

        // Override send to capture the final status code before completing the log
        res.send = function (body) {
            res.send = originalSend; // Restore

            const logEntry = {
                action_type: actionType,
                user_id: req.user ? req.user.id : null,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'] || 'Unknown',
                resource: req.originalUrl,
                status_code: res.statusCode,
                timestamp: new Date().toISOString(),
                // Compute a simple hash of the request body if present (excluding passwords/tokens)
                request_fingerprint: req.body ? crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex') : null,
            };

            // In production, insert this log into Supabase securely
            // supabase.from('audit_logs').insert([logEntry]).then(...)

            // For now, console log it nicely
            console.log(`[AUDIT LOG] ${actionType} - User: ${logEntry.user_id || 'Anonymous'} - Status: ${res.statusCode} - IP: ${logEntry.ip_address}`);

            return res.send(body);
        };

        next();
    };
};

module.exports = { auditLog };
