const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/security');
const { auditLog } = require('../middleware/audit');
const { supabase } = require('../db');
const { notify } = require('../utils/notificationService');

// ─── Create Session ─────────────────────────────────────────
router.post('/', authenticate(['operator']), auditLog('CREATE_SESSION'), async (req, res) => {
    const { family_id, documents_requested, purpose, duration_days } = req.body;

    if (!family_id) {
        return res.status(400).json({ error: 'family_id is required.' });
    }

    const days = duration_days || 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    try {
        const { data: session, error } = await supabase
            .from('operator_sessions')
            .insert([{
                family_id,
                operator_id: req.user.id,
                documents_requested: documents_requested || [],
                purpose: purpose || null,
                duration_days: days,
                status: 'active',
                approved_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        // Send notification to citizen about operator access
        const { data: familyInfo } = await supabase.from('families').select('family_name, primary_email, primary_mobile').eq('id', family_id).single();
        if (familyInfo) {
            notify(familyInfo.primary_email || familyInfo.primary_mobile, 'operator_accessed', {
                family_name: familyInfo.family_name,
                operator_name: req.user.name,
                kendra_name: req.user.kendra_name,
                date: new Date().toLocaleDateString('en-IN'),
                purpose: purpose || 'Not specified',
                expires_at: expiresAt.toLocaleDateString('en-IN'),
            }).catch(err => console.error('Notification error:', err));
        }

        res.status(201).json({ message: 'Session created.', session });
    } catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session.' });
    }
});

// ─── Get Session Details ────────────────────────────────────
router.get('/:id', authenticate(['operator']), async (req, res) => {
    try {
        const { data: session, error } = await supabase
            .from('operator_sessions')
            .select('*, families(family_name, primary_mobile)')
            .eq('id', req.params.id)
            .eq('operator_id', req.user.id)
            .single();

        if (error || !session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        res.status(200).json({ session });
    } catch (err) {
        console.error('Error fetching session:', err);
        res.status(500).json({ error: 'Failed to fetch session.' });
    }
});

// ─── List Operator's Sessions ───────────────────────────────
router.get('/', authenticate(['operator']), async (req, res) => {
    try {
        const { status } = req.query;

        let query = supabase
            .from('operator_sessions')
            .select('*, families(family_name, primary_mobile)')
            .eq('operator_id', req.user.id)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: sessions, error } = await query;

        if (error) throw error;
        res.status(200).json({ sessions });
    } catch (err) {
        console.error('Error listing sessions:', err);
        res.status(500).json({ error: 'Failed to fetch sessions.' });
    }
});

// ─── Revoke Session ─────────────────────────────────────────
router.delete('/:id', authenticate(['operator']), auditLog('REVOKE_SESSION'), async (req, res) => {
    try {
        const { data: session, error } = await supabase
            .from('operator_sessions')
            .update({
                status: 'revoked',
                revoked_at: new Date().toISOString()
            })
            .eq('id', req.params.id)
            .eq('operator_id', req.user.id)
            .eq('status', 'active')
            .select()
            .single();

        if (error || !session) {
            return res.status(404).json({ error: 'Active session not found.' });
        }

        res.status(200).json({ message: 'Session revoked.', session });
    } catch (err) {
        console.error('Error revoking session:', err);
        res.status(500).json({ error: 'Failed to revoke session.' });
    }
});

module.exports = router;
