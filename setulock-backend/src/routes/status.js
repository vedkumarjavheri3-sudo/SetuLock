const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/security');
const { auditLog } = require('../middleware/audit');
const { supabase } = require('../db');

/**
 * Get all application statuses for the citizen
 */
router.get('/', authenticate(['citizen', 'operator']), auditLog('VIEW_STATUS_TIMELINE'), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('application_statuses')
            .select(`
        id,
        application_type,
        current_status,
        operator_info,
        created_at,
        updated_at,
        timeline:status_history (
          id,
          status,
          notes,
          timestamp
        )
      `)
            .eq('user_id', req.user.id)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        res.status(200).json({ applications: data });
    } catch (err) {
        console.error('Error fetching application status:', err);
        res.status(500).json({ error: 'Failed to fetch application statuses.' });
    }
});

module.exports = router;
