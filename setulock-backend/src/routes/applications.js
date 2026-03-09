const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/security');
const { auditLog } = require('../middleware/audit');
const { supabase } = require('../db');
const { notify } = require('../utils/notificationService');

// ─── Submit Application ─────────────────────────────────────
router.post('/', authenticate(['operator']), auditLog('SUBMIT_APPLICATION'), async (req, res) => {
    const { family_id, member_id, scheme_name_en, scheme_name_mr, reference_no } = req.body;

    if (!family_id || !scheme_name_en) {
        return res.status(400).json({ error: 'family_id and scheme_name_en are required.' });
    }

    try {
        const { data: app, error } = await supabase
            .from('applications')
            .insert([{
                family_id,
                member_id: member_id || null,
                operator_id: req.user.id,
                scheme_name_en,
                scheme_name_mr: scheme_name_mr || null,
                reference_no: reference_no || null,
                status: 'submitted'
            }])
            .select()
            .single();

        if (error) throw error;

        // Send notification
        const { data: familyInfo } = await supabase.from('families').select('family_name, primary_email, primary_mobile').eq('id', family_id).single();
        if (familyInfo) {
            notify(familyInfo.primary_email || familyInfo.primary_mobile, 'application_submitted', {
                family_name: familyInfo.family_name,
                scheme_name: scheme_name_en,
                reference_no: reference_no,
            }).catch(err => console.error('Notification error:', err));
        }

        res.status(201).json({ message: 'Application submitted.', application: app });
    } catch (err) {
        console.error('Error submitting application:', err);
        res.status(500).json({ error: 'Failed to submit application.' });
    }
});

// ─── Update Application Status ──────────────────────────────
router.put('/:id/status', authenticate(['operator']), auditLog('UPDATE_APPLICATION_STATUS'), async (req, res) => {
    const { status, status_note } = req.body;

    const validStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'docs_missing'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    try {
        const { data: app, error } = await supabase
            .from('applications')
            .update({
                status,
                status_note: status_note || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Send notification about status change
        const { data: familyInfo } = await supabase.from('families').select('family_name, primary_email, primary_mobile').eq('id', app.family_id).single();
        if (familyInfo) {
            const triggerType = status === 'approved' ? 'application_approved' : 'application_rejected';
            notify(familyInfo.primary_email || familyInfo.primary_mobile, triggerType, {
                family_name: familyInfo.family_name,
                scheme_name: app.scheme_name_en,
                status,
                status_note,
            }).catch(err => console.error('Notification error:', err));
        }

        res.status(200).json({ message: 'Application status updated.', application: app });
    } catch (err) {
        console.error('Error updating application:', err);
        res.status(500).json({ error: 'Failed to update application status.' });
    }
});

// ─── List Family Applications ───────────────────────────────
router.get('/family/:family_id', authenticate(['operator']), async (req, res) => {
    try {
        const { data: apps, error } = await supabase
            .from('applications')
            .select('*')
            .eq('family_id', req.params.family_id)
            .order('submitted_at', { ascending: false });

        if (error) throw error;
        res.status(200).json({ applications: apps });
    } catch (err) {
        console.error('Error listing applications:', err);
        res.status(500).json({ error: 'Failed to fetch applications.' });
    }
});

module.exports = router;
