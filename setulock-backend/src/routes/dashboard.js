const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/security');
const { supabase } = require('../db');

// ─── Dashboard Stats ────────────────────────────────────────
router.get('/stats', authenticate(['operator']), async (req, res) => {
    try {
        const operatorId = req.user.id;

        // Total families
        const { count: familyCount } = await supabase
            .from('families')
            .select('*', { count: 'exact', head: true })
            .eq('created_by_operator', operatorId)
            .eq('is_deleted', false);

        // Total documents across operator's families
        const { data: operatorFamilies } = await supabase
            .from('families')
            .select('id')
            .eq('created_by_operator', operatorId)
            .eq('is_deleted', false);

        const familyIds = (operatorFamilies || []).map(f => f.id);

        let docCount = 0;
        let pendingApps = 0;
        let eraseCount = 0;
        let totalStorage = 0;
        let recentDocs = [];
        let recentApps = [];

        if (familyIds.length > 0) {
            // Document count
            const { count: dc } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .in('family_id', familyIds)
                .eq('is_deleted', false);
            docCount = dc || 0;

            // Storage used
            const { data: storageData } = await supabase
                .from('documents')
                .select('file_size_bytes')
                .in('family_id', familyIds)
                .eq('is_deleted', false);
            totalStorage = (storageData || []).reduce((sum, d) => sum + (d.file_size_bytes || 0), 0);

            // Pending applications
            const { count: pc } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .in('family_id', familyIds)
                .in('status', ['submitted', 'under_review']);
            pendingApps = pc || 0;

            // Erase requests
            const { count: ec } = await supabase
                .from('families')
                .select('*', { count: 'exact', head: true })
                .eq('created_by_operator', operatorId)
                .eq('deletion_requested', true)
                .eq('is_deleted', false);
            eraseCount = ec || 0;

            // Recent documents (last 5)
            const { data: rd } = await supabase
                .from('documents')
                .select('id, category, document_type, created_at, family_id, families!inner(family_name)')
                .in('family_id', familyIds)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(5);
            recentDocs = rd || [];

            // Recent applications (last 5)
            const { data: ra } = await supabase
                .from('applications')
                .select('id, scheme_name_en, status, submitted_at, family_id, families!inner(family_name)')
                .in('family_id', familyIds)
                .order('submitted_at', { ascending: false })
                .limit(5);
            recentApps = ra || [];
        }

        res.status(200).json({
            stats: {
                total_families: familyCount || 0,
                total_documents: docCount,
                pending_applications: pendingApps,
                erase_requests: eraseCount,
                storage_used_bytes: totalStorage,
            },
            recent_documents: recentDocs,
            recent_applications: recentApps,
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
    }
});

module.exports = router;
