const { supabase } = require('../db');

/**
 * Session Expiry Middleware
 * 
 * Checks if an operator has a valid (non-expired, non-revoked) session
 * for a given family. Used on document view/download routes.
 * 
 * Usage: router.get('/:id/view', authenticate(['operator']), checkSession, ...)
 */
const checkSession = async (req, res, next) => {
    try {
        const familyId = req.params.family_id || req.body.family_id;

        // If no family_id in params, try to get it from the document
        if (!familyId && req.params.id) {
            const { data: doc } = await supabase
                .from('documents')
                .select('family_id')
                .eq('id', req.params.id)
                .single();
            if (doc) req.documentFamilyId = doc.family_id;
        }

        const targetFamilyId = familyId || req.documentFamilyId;
        if (!targetFamilyId) {
            return next(); // No family context, skip session check
        }

        // Check if operator owns the family (creator always has access)
        const { data: ownedFamily } = await supabase
            .from('families')
            .select('id')
            .eq('id', targetFamilyId)
            .eq('created_by_operator', req.user.id)
            .eq('is_deleted', false)
            .single();

        if (ownedFamily) {
            return next(); // Owner — always allowed
        }

        // Check for valid session
        const { data: session } = await supabase
            .from('operator_sessions')
            .select('id, expires_at')
            .eq('family_id', targetFamilyId)
            .eq('operator_id', req.user.id)
            .eq('status', 'active')
            .gte('expires_at', new Date().toISOString())
            .single();

        if (!session) {
            return res.status(403).json({
                error: 'Session expired or not found. Please create a new session to access this family\'s data.'
            });
        }

        // Auto-expire sessions that have passed their expiry time
        // This runs as a side effect — doesn't block the request
        supabase
            .from('operator_sessions')
            .update({ status: 'expired' })
            .eq('operator_id', req.user.id)
            .eq('status', 'active')
            .lt('expires_at', new Date().toISOString())
            .then(() => { })
            .catch(err => console.error('Session cleanup error:', err));

        next();
    } catch (err) {
        console.error('Session check error:', err);
        next(); // Don't block on session check errors
    }
};

module.exports = { checkSession };
