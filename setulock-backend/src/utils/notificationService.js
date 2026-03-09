const nodemailer = require('nodemailer');

// ─── Notification Modes ─────────────────────────────
const MODE = process.env.NOTIFICATION_MODE || 'email'; // 'email' or 'sms' (future)

// Email transporter (Gmail SMTP)
let transporter = null;
if (MODE === 'email' && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// ─── Notification Templates ─────────────────────────
const TEMPLATES = {
    account_created: {
        subject: '🏛️ Digi SetuSeva — Your Document Wallet Has Been Created',
        body: (vars) => `
Namaste ${vars.family_name},

Your digital document wallet has been created at Digi SetuSeva by operator "${vars.operator_name}" at "${vars.kendra_name}".

Your family account is now active. All documents uploaded on your behalf will be securely encrypted.

If you did not authorize this, please contact your nearest Seva Kendra immediately.

— Digi SetuSeva Team
        `.trim(),
    },
    document_added: {
        subject: '📄 Digi SetuSeva — A New Document Was Added',
        body: (vars) => `
Namaste ${vars.family_name},

A new document "${vars.document_type}" (${vars.category}) has been uploaded to your wallet by an operator.

All documents are encrypted with AES-256 for your safety.

— Digi SetuSeva Team
        `.trim(),
    },
    operator_accessed: {
        subject: '🔐 Digi SetuSeva — Your Documents Were Accessed',
        body: (vars) => `
Namaste ${vars.family_name},

Operator "${vars.operator_name}" from "${vars.kendra_name}" accessed your documents on ${vars.date}.

Purpose: ${vars.purpose || 'Not specified'}
Session expires: ${vars.expires_at}

If you did not authorize this access, please contact your nearest Seva Kendra.

— Digi SetuSeva Team
        `.trim(),
    },
    application_submitted: {
        subject: '📋 Digi SetuSeva — Application Submitted',
        body: (vars) => `
Namaste ${vars.family_name},

An application for "${vars.scheme_name}" has been submitted on your behalf.

Reference: ${vars.reference_no || 'Pending'}
Status: Submitted

You will receive updates as the application progresses.

— Digi SetuSeva Team
        `.trim(),
    },
    application_approved: {
        subject: '✅ Digi SetuSeva — Application Approved!',
        body: (vars) => `
Namaste ${vars.family_name},

Great news! Your application for "${vars.scheme_name}" has been APPROVED.

${vars.status_note ? `Note: ${vars.status_note}` : ''}

— Digi SetuSeva Team
        `.trim(),
    },
    application_rejected: {
        subject: '❌ Digi SetuSeva — Application Update',
        body: (vars) => `
Namaste ${vars.family_name},

Your application for "${vars.scheme_name}" status has been updated to: ${vars.status}.

${vars.status_note ? `Note: ${vars.status_note}` : ''}

Please visit your nearest Seva Kendra for more details.

— Digi SetuSeva Team
        `.trim(),
    },
    erase_request: {
        subject: '🗑️ Digi SetuSeva — Data Deletion Requested',
        body: (vars) => `
Namaste ${vars.family_name},

A data deletion request has been submitted for your family account.

ALL your documents and data will be permanently deleted on ${vars.deletion_date}.

To CANCEL this deletion, please contact your Seva Kendra before that date.

— Digi SetuSeva Team
        `.trim(),
    },
    erase_cancel: {
        subject: '✅ Digi SetuSeva — Deletion Cancelled',
        body: (vars) => `
Namaste ${vars.family_name},

Your data deletion request has been cancelled. Your documents and data are safe.

— Digi SetuSeva Team
        `.trim(),
    },
    erase_complete: {
        subject: '🗑️ Digi SetuSeva — Data Deleted',
        body: (vars) => `
Namaste,

As scheduled, all documents and data for family account "${vars.family_name}" have been permanently deleted.

This action cannot be undone.

— Digi SetuSeva Team
        `.trim(),
    },
    expiry_alert: {
        subject: '⚠️ Digi SetuSeva — Document Expiring Soon',
        body: (vars) => `
Namaste ${vars.family_name},

The following document is expiring soon:

Document: ${vars.document_type}
Category: ${vars.category}
Expiry Date: ${vars.expiry_date}

Please visit your Seva Kendra to upload an updated copy.

— Digi SetuSeva Team
        `.trim(),
    },
};

// ─── Send Notification ──────────────────────────────
async function notify(recipient, triggerType, variables = {}) {
    const template = TEMPLATES[triggerType];
    if (!template) {
        console.warn(`[NOTIFICATION] Unknown trigger type: ${triggerType}`);
        return;
    }

    const subject = template.subject;
    const body = template.body(variables);

    if (MODE === 'email' && transporter && recipient && recipient.includes('@')) {
        try {
            await transporter.sendMail({
                from: `"Digi SetuSeva" <${process.env.SMTP_USER}>`,
                to: recipient,
                subject,
                text: body,
            });
            console.log(`[EMAIL] Sent "${triggerType}" to ${recipient}`);
        } catch (err) {
            console.error(`[EMAIL] Failed to send "${triggerType}" to ${recipient}:`, err.message);
        }
    } else {
        // Dev mode: just log to console
        console.log(`[NOTIFICATION] ${triggerType} → ${recipient || 'no-recipient'}`);
        console.log(`  Subject: ${subject}`);
        console.log(`  Body: ${body.substring(0, 100)}...`);
    }

    return { subject, body };
}

module.exports = { notify, TEMPLATES };
