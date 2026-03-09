const cron = require('node-cron');
const { supabase } = require('../db');
const { notify } = require('../utils/notificationService');

/**
 * ERASE Cron Job
 * Runs daily at 2:00 AM IST to process scheduled deletions.
 *
 * Steps:
 * 1. Find families where deletion_scheduled_at <= now
 * 2. Delete all their documents from Supabase Storage
 * 3. Mark family as is_deleted = true
 * 4. Send final notification
 */
function startEraseCron() {
    // Run at 2:00 AM every day (IST = UTC+5:30, so 2AM IST = 8:30PM UTC)
    cron.schedule('30 20 * * *', async () => {
        console.log('[CRON] Running ERASE job at', new Date().toISOString());

        try {
            // 1. Find families scheduled for deletion
            const { data: families, error } = await supabase
                .from('families')
                .select('id, family_name, primary_mobile, primary_email')
                .eq('deletion_requested', true)
                .eq('is_deleted', false)
                .lte('deletion_scheduled_at', new Date().toISOString());

            if (error) {
                console.error('[CRON] Error querying families:', error);
                return;
            }

            if (!families || families.length === 0) {
                console.log('[CRON] No families pending deletion.');
                return;
            }

            console.log(`[CRON] Processing ${families.length} family deletion(s)...`);

            for (const family of families) {
                try {
                    // 2. Get all documents for this family
                    const { data: docs } = await supabase
                        .from('documents')
                        .select('id, storage_path')
                        .eq('family_id', family.id);

                    // 3. Delete files from Supabase Storage
                    if (docs && docs.length > 0) {
                        const paths = docs.map(d => d.storage_path).filter(Boolean);
                        if (paths.length > 0) {
                            const { error: storageErr } = await supabase.storage
                                .from('secure_documents')
                                .remove(paths);
                            if (storageErr) {
                                console.error(`[CRON] Storage delete error for family ${family.id}:`, storageErr);
                            }
                        }

                        // 4. Mark documents as deleted in DB
                        await supabase
                            .from('documents')
                            .update({ is_deleted: true })
                            .eq('family_id', family.id);
                    }

                    // 5. Revoke all sessions
                    await supabase
                        .from('operator_sessions')
                        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
                        .eq('family_id', family.id)
                        .in('status', ['active', 'erase_pending']);

                    // 6. Mark family as deleted
                    await supabase
                        .from('families')
                        .update({ is_deleted: true })
                        .eq('id', family.id);

                    // 7. Send final notification
                    const recipient = family.primary_email || family.primary_mobile;
                    await notify(recipient, 'erase_complete', {
                        family_name: family.family_name,
                    });

                    // 8. Log the notification
                    await supabase.from('notification_logs').insert([{
                        family_id: family.id,
                        recipient: recipient || 'unknown',
                        channel: 'email',
                        direction: 'outbound',
                        trigger_type: 'erase_complete',
                        message_body: `All data for family "${family.family_name}" has been permanently deleted.`,
                    }]);

                    console.log(`[CRON] ✅ Deleted family: ${family.family_name} (${family.id})`);
                } catch (familyErr) {
                    console.error(`[CRON] Error processing family ${family.id}:`, familyErr);
                }
            }

            console.log('[CRON] ERASE job completed.');
        } catch (err) {
            console.error('[CRON] ERASE job failed:', err);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('[CRON] ERASE job scheduled for 2:00 AM IST daily.');
}

/**
 * Expiry Alert Cron Job
 * Runs daily at 9:00 AM IST to alert about documents expiring within 30 days.
 */
function startExpiryAlertCron() {
    cron.schedule('30 3 * * *', async () => {
        console.log('[CRON] Running expiry alert job at', new Date().toISOString());

        try {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            const { data: docs, error } = await supabase
                .from('documents')
                .select(`
                    id, document_type, category, expiry_date,
                    families!inner (id, family_name, primary_email, primary_mobile)
                `)
                .eq('is_deleted', false)
                .not('expiry_date', 'is', null)
                .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
                .gte('expiry_date', new Date().toISOString().split('T')[0]);

            if (error || !docs || docs.length === 0) {
                console.log('[CRON] No expiring documents found.');
                return;
            }

            for (const doc of docs) {
                const family = doc.families;
                const recipient = family.primary_email || family.primary_mobile;
                await notify(recipient, 'expiry_alert', {
                    family_name: family.family_name,
                    document_type: doc.document_type,
                    category: doc.category,
                    expiry_date: new Date(doc.expiry_date).toLocaleDateString('en-IN'),
                });
            }

            console.log(`[CRON] Sent ${docs.length} expiry alert(s).`);
        } catch (err) {
            console.error('[CRON] Expiry alert job failed:', err);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('[CRON] Expiry alert job scheduled for 9:00 AM IST daily.');
}

module.exports = { startEraseCron, startExpiryAlertCron };
