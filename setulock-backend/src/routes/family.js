const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/security');
const { auditLog } = require('../middleware/audit');
const { supabase } = require('../db');
const { notify } = require('../utils/notificationService');

// ─── Create Family ──────────────────────────────────────────
router.post('/', authenticate(['operator']), auditLog('CREATE_FAMILY'), async (req, res) => {
    const { primary_mobile, primary_email, family_name, village, taluka, district } = req.body;

    if (!primary_mobile || !family_name) {
        return res.status(400).json({ error: 'primary_mobile and family_name are required.' });
    }

    try {
        // Check for duplicate mobile
        const { data: existing } = await supabase
            .from('families')
            .select('id, family_name')
            .eq('primary_mobile', primary_mobile)
            .eq('is_deleted', false)
            .single();

        if (existing) {
            return res.status(409).json({
                error: 'A family with this mobile number already exists.',
                existing_family: { id: existing.id, family_name: existing.family_name }
            });
        }

        // Create family
        const { data: family, error } = await supabase
            .from('families')
            .insert([{
                primary_mobile,
                primary_email: primary_email || null,
                family_name,
                village: village || null,
                taluka: taluka || null,
                district: district || null,
                created_by_operator: req.user.id
            }])
            .select()
            .single();

        if (error) throw error;

        // Send notification to citizen about account creation
        const recipient = family.primary_email || family.primary_mobile;
        notify(recipient, 'account_created', {
            family_name: family.family_name,
            operator_name: req.user.name,
            kendra_name: req.user.kendra_name,
        }).catch(err => console.error('Notification error:', err));

        res.status(201).json({ message: 'Family created successfully.', family });
    } catch (err) {
        console.error('Error creating family:', err);
        res.status(500).json({ error: 'Failed to create family.' });
    }
});

// ─── List Operator's Families ───────────────────────────────
router.get('/', authenticate(['operator']), auditLog('LIST_FAMILIES'), async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase
            .from('families')
            .select('*, family_members(count)', { count: 'exact' })
            .eq('created_by_operator', req.user.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        // Search by name or mobile
        if (search) {
            query = query.or(`family_name.ilike.%${search}%,primary_mobile.ilike.%${search}%`);
        }

        const { data: families, error, count } = await query;

        if (error) throw error;

        res.status(200).json({
            families,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count
            }
        });
    } catch (err) {
        console.error('Error listing families:', err);
        res.status(500).json({ error: 'Failed to fetch families.' });
    }
});

// ─── Get Family Detail ──────────────────────────────────────
router.get('/:id', authenticate(['operator']), auditLog('VIEW_FAMILY'), async (req, res) => {
    try {
        const { id } = req.params;

        const { data: family, error } = await supabase
            .from('families')
            .select(`
                *,
                family_members (*),
                documents (id, category, document_type, file_type, file_size_bytes, is_verified, version, created_at, member_id),
                applications (id, scheme_name_en, scheme_name_mr, status, submitted_at, updated_at)
            `)
            .eq('id', id)
            .eq('is_deleted', false)
            .single();

        if (error || !family) {
            return res.status(404).json({ error: 'Family not found.' });
        }

        // Verify operator has access (created or has active session)
        if (family.created_by_operator !== req.user.id) {
            const { data: session } = await supabase
                .from('operator_sessions')
                .select('id')
                .eq('family_id', id)
                .eq('operator_id', req.user.id)
                .eq('status', 'active')
                .gte('expires_at', new Date().toISOString())
                .single();

            if (!session) {
                return res.status(403).json({ error: 'You do not have access to this family.' });
            }
        }

        res.status(200).json({ family });
    } catch (err) {
        console.error('Error fetching family:', err);
        res.status(500).json({ error: 'Failed to fetch family details.' });
    }
});

// ─── Update Family ──────────────────────────────────────────
router.put('/:id', authenticate(['operator']), auditLog('UPDATE_FAMILY'), async (req, res) => {
    const { id } = req.params;
    const { family_name, primary_email, village, taluka, district } = req.body;

    try {
        // Verify ownership
        const { data: existing } = await supabase
            .from('families')
            .select('id')
            .eq('id', id)
            .eq('created_by_operator', req.user.id)
            .single();

        if (!existing) {
            return res.status(404).json({ error: 'Family not found or not authorized.' });
        }

        const updates = {};
        if (family_name) updates.family_name = family_name;
        if (primary_email !== undefined) updates.primary_email = primary_email;
        if (village !== undefined) updates.village = village;
        if (taluka !== undefined) updates.taluka = taluka;
        if (district !== undefined) updates.district = district;

        const { data: family, error } = await supabase
            .from('families')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: 'Family updated.', family });
    } catch (err) {
        console.error('Error updating family:', err);
        res.status(500).json({ error: 'Failed to update family.' });
    }
});

// ─── Add Family Member ──────────────────────────────────────
router.post('/:id/members', authenticate(['operator']), auditLog('ADD_MEMBER'), async (req, res) => {
    const { id } = req.params;
    const { name, relation, dob, gender } = req.body;

    if (!name || !relation) {
        return res.status(400).json({ error: 'name and relation are required.' });
    }

    try {
        // Verify family exists and operator has access
        const { data: family } = await supabase
            .from('families')
            .select('id')
            .eq('id', id)
            .eq('created_by_operator', req.user.id)
            .eq('is_deleted', false)
            .single();

        if (!family) {
            return res.status(404).json({ error: 'Family not found or not authorized.' });
        }

        const { data: member, error } = await supabase
            .from('family_members')
            .insert([{
                family_id: id,
                name,
                relation,
                dob: dob || null,
                gender: gender || null
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Family member added.', member });
    } catch (err) {
        console.error('Error adding family member:', err);
        res.status(500).json({ error: 'Failed to add family member.' });
    }
});

// ─── Update Family Member ───────────────────────────────────
router.put('/:id/members/:mid', authenticate(['operator']), auditLog('UPDATE_MEMBER'), async (req, res) => {
    const { id, mid } = req.params;
    const { name, relation, dob, gender, is_deceased } = req.body;

    try {
        // Verify family access
        const { data: family } = await supabase
            .from('families')
            .select('id')
            .eq('id', id)
            .eq('created_by_operator', req.user.id)
            .single();

        if (!family) {
            return res.status(404).json({ error: 'Family not found or not authorized.' });
        }

        const updates = {};
        if (name) updates.name = name;
        if (relation) updates.relation = relation;
        if (dob !== undefined) updates.dob = dob;
        if (gender !== undefined) updates.gender = gender;
        if (is_deceased !== undefined) updates.is_deceased = is_deceased;

        const { data: member, error } = await supabase
            .from('family_members')
            .update(updates)
            .eq('id', mid)
            .eq('family_id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: 'Family member updated.', member });
    } catch (err) {
        console.error('Error updating family member:', err);
        res.status(500).json({ error: 'Failed to update family member.' });
    }
});

module.exports = router;
