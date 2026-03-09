const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { loginLimiter } = require('../middleware/security');
const { auditLog } = require('../middleware/audit');
const { supabase } = require('../db');

const SALT_ROUNDS = 12;

// ─── Register Operator ──────────────────────────────────────
router.post('/register', loginLimiter, async (req, res) => {
    const { name, email, password, kendra_name, mobile, village, taluka, district } = req.body;

    if (!name || !email || !password || !kendra_name) {
        return res.status(400).json({
            error: 'name, email, password, and kendra_name are required.'
        });
    }

    try {
        // Check if operator already exists
        const { data: existing } = await supabase
            .from('operators')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existing) {
            return res.status(409).json({ error: 'An operator with this email already exists.' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create operator
        const { data: operator, error } = await supabase
            .from('operators')
            .insert([{
                name,
                email: email.toLowerCase(),
                password_hash,
                kendra_name,
                mobile: mobile || null,
                village: village || null,
                taluka: taluka || null,
                district: district || null,
                plan: 'free',
                is_active: true
            }])
            .select('id, name, email, kendra_name, plan')
            .single();

        if (error) throw error;

        // Generate JWT
        const token = jwt.sign(
            {
                id: operator.id,
                role: 'operator',
                email: operator.email,
                kendra_name: operator.kendra_name
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        res.status(201).json({
            message: 'Operator registered successfully.',
            token,
            operator
        });
    } catch (err) {
        console.error('Error in /register:', err);
        res.status(500).json({ error: 'Failed to register operator.' });
    }
});

// ─── Login Operator ─────────────────────────────────────────
router.post('/login', loginLimiter, auditLog('OPERATOR_LOGIN'), async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Find operator
        const { data: operator, error } = await supabase
            .from('operators')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !operator) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (!operator.is_active) {
            return res.status(403).json({ error: 'Operator account is deactivated.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, operator.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: operator.id,
                role: 'operator',
                email: operator.email,
                kendra_name: operator.kendra_name
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        res.status(200).json({
            token,
            operator: {
                id: operator.id,
                name: operator.name,
                email: operator.email,
                kendra_name: operator.kendra_name,
                plan: operator.plan
            }
        });
    } catch (err) {
        console.error('Error in /login:', err);
        res.status(500).json({ error: 'Failed to log in.' });
    }
});

// ─── Get Current Operator Profile ───────────────────────────
const { authenticate } = require('../middleware/security');

router.get('/me', authenticate(['operator']), async (req, res) => {
    try {
        const { data: operator, error } = await supabase
            .from('operators')
            .select('id, name, email, kendra_name, mobile, village, taluka, district, plan, is_active, created_at')
            .eq('id', req.user.id)
            .single();

        if (error || !operator) {
            return res.status(404).json({ error: 'Operator not found.' });
        }

        res.status(200).json({ operator });
    } catch (err) {
        console.error('Error in /me:', err);
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});

module.exports = router;
