const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/security');
const { auditLog } = require('../middleware/audit');
const { supabase } = require('../db');

// ─── ERASE Request (on behalf of citizen) ───────────────────
router.post('/erase-request', authenticate(['operator']), auditLog('ERASE_REQUEST'), async (req, res) => {
    const { family_id } = req.body;

    if (!family_id) {
        return res.status(400).json({ error: 'family_id is required.' });
    }

    try {
        const eraseDays = parseInt(process.env.ERASE_DELAY_DAYS) || 30;
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + eraseDays);

        // Mark family for deletion
        const { data: family, error } = await supabase
            .from('families')
            .update({
                deletion_requested: true,
                deletion_scheduled_at: deletionDate.toISOString()
            })
            .eq('id', family_id)
            .eq('is_deleted', false)
            .select()
            .single();

        if (error || !family) {
            return res.status(404).json({ error: 'Family not found.' });
        }

        // Revoke all active operator sessions
        await supabase
            .from('operator_sessions')
            .update({ status: 'erase_pending', revoked_at: new Date().toISOString() })
            .eq('family_id', family_id)
            .eq('status', 'active');

        // Log notification
        await supabase.from('notification_logs').insert([{
            family_id,
            recipient: family.primary_email || family.primary_mobile,
            channel: 'email',
            direction: 'outbound',
            trigger_type: 'erase_request',
            message_body: `Your data deletion has been requested. All data will be permanently deleted on ${deletionDate.toLocaleDateString('en-IN')}. Reply CANCEL to stop.`
        }]);

        // TODO: Actually send email via notificationService

        res.status(200).json({
            message: 'Deletion scheduled.',
            deletion_scheduled_at: deletionDate.toISOString()
        });
    } catch (err) {
        console.error('Error processing erase request:', err);
        res.status(500).json({ error: 'Failed to process erase request.' });
    }
});

// ─── Cancel ERASE ───────────────────────────────────────────
router.post('/cancel-erase', authenticate(['operator']), auditLog('CANCEL_ERASE'), async (req, res) => {
    const { family_id } = req.body;

    if (!family_id) {
        return res.status(400).json({ error: 'family_id is required.' });
    }

    try {
        const { data: family, error } = await supabase
            .from('families')
            .update({
                deletion_requested: false,
                deletion_scheduled_at: null
            })
            .eq('id', family_id)
            .eq('deletion_requested', true)
            .eq('is_deleted', false)
            .select()
            .single();

        if (error || !family) {
            return res.status(404).json({ error: 'No pending deletion found for this family.' });
        }

        // Log notification
        await supabase.from('notification_logs').insert([{
            family_id,
            recipient: family.primary_email || family.primary_mobile,
            channel: 'email',
            direction: 'outbound',
            trigger_type: 'erase_cancel',
            message_body: 'Your data deletion request has been cancelled. Your data is safe.'
        }]);

        res.status(200).json({ message: 'Deletion cancelled.', family });
    } catch (err) {
        console.error('Error cancelling erase:', err);
        res.status(500).json({ error: 'Failed to cancel erase request.' });
    }
});

// ─── Data Export (DPDP Act Compliance) ──────────────────────
router.post('/export', authenticate(['operator']), auditLog('REQUEST_DATA_EXPORT'), async (req, res) => {
    const { family_id } = req.body;
    try {
        // Queue background job (stub for now)
        res.status(202).json({
            message: 'Data export request received. The export will be ready within 24 hours.'
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process export request.' });
    }
});

module.exports = router;
