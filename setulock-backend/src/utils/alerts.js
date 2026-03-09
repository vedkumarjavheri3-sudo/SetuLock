const { supabase } = require('../db');

/**
 * Logs an anomaly into the audit logs and acts as a central hub
 * for triggering external admin alerts (e.g. Slack/Email)
 */
const alertAdminAnomaly = async (anomalyType, details) => {
    console.warn(`[SECURITY ALERT] Triggered: ${anomalyType}`, details);

    try {
        // 1. Log to DB as a Critical Action
        const { error } = await supabase.from('audit_logs').insert([{
            action_type: 'SECURITY_ANOMALY',
            user_id: details.userId || null,
            ip_address: details.ipAddress || 'UNKNOWN',
            resource: anomalyType,
            status_code: 403,
            request_fingerprint: details.deviceFingerprint || 'UNKNOWN'
        }]);

        if (error) {
            console.error('Failed to log anomaly to DB:', error);
        }

        // 2. Here you would trigger external alerts:
        // e.g. axios.post(process.env.SLACK_WEBHOOK, { text: `Alert: ${anomalyType}` });

    } catch (err) {
        console.error('Critical failure in alertAdminAnomaly:', err);
    }
};

module.exports = {
    alertAdminAnomaly
};
