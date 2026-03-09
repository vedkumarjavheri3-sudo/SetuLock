const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

        console.log('[DEBUG LOGIN] email:', email.toLowerCase(), '| found:', !!operator, '| error:', error?.message || 'none');

        if (error || !operator) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (!operator.is_active) {
            return res.status(403).json({ error: 'Operator account is deactivated.' });
        }

        // Verify password
        console.log('[DEBUG LOGIN] password_hash exists:', !!operator.password_hash, '| hash length:', operator.password_hash?.length);
        const isMatch = await bcrypt.compare(password, operator.password_hash);
        console.log('[DEBUG LOGIN] password match:', isMatch);
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

// ─── Forgot Password (Send OTP via Email) ───────────────────
const crypto = require('crypto');
const { notify } = require('../utils/notificationService');

router.post('/forgot-password', loginLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    try {
        const { data: operator } = await supabase
            .from('operators')
            .select('id, name, email')
            .eq('email', email.toLowerCase())
            .single();

        if (!operator) {
            // Don't reveal if email exists — always return success
            return res.status(200).json({ message: 'If an account with that email exists, a reset code has been sent.' });
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

        // Store OTP hash in operators table
        await supabase
            .from('operators')
            .update({
                reset_token: otpHash,
                reset_token_expires: expiresAt
            })
            .eq('id', operator.id);

        // Send email with OTP
        await notify(operator.email, 'password_reset', {
            name: operator.name,
            otp: otp,
        });

        console.log(`[AUTH] Password reset OTP sent to ${operator.email}`);
        res.status(200).json({ message: 'If an account with that email exists, a reset code has been sent.' });
    } catch (err) {
        console.error('Error in /forgot-password:', err);
        res.status(500).json({ error: 'Failed to process reset request.' });
    }
});

// ─── Reset Password (Verify OTP + Set New Password) ─────────
router.post('/reset-password', loginLimiter, async (req, res) => {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    try {
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        const { data: operator } = await supabase
            .from('operators')
            .select('id, reset_token, reset_token_expires')
            .eq('email', email.toLowerCase())
            .single();

        if (!operator || !operator.reset_token) {
            return res.status(400).json({ error: 'Invalid or expired reset code.' });
        }

        // Check expiry
        if (new Date(operator.reset_token_expires) < new Date()) {
            return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
        }

        // Verify OTP
        if (operator.reset_token !== otpHash) {
            return res.status(400).json({ error: 'Invalid reset code.' });
        }

        // Hash new password and update
        const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
        await supabase
            .from('operators')
            .update({
                password_hash,
                reset_token: null,
                reset_token_expires: null
            })
            .eq('id', operator.id);

        console.log(`[AUTH] Password reset successful for ${email}`);
        res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error('Error in /reset-password:', err);
        res.status(500).json({ error: 'Failed to reset password.' });
    }
});

module.exports = router;

