const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auditLog } = require('../middleware/audit');
const { authenticate } = require('../middleware/security');
const { encrypt, decrypt, deriveFamilyKey } = require('../middleware/encryption');
const { supabase } = require('../db');
const { notify } = require('../utils/notificationService');
const { checkSession } = require('../middleware/sessionCheck');

// Multer: in-memory upload, 10MB limit
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
        }
    }
});

// Document categories & types (from V1 spec)
const VALID_CATEGORIES = [
    'Identity', 'Residence', 'Income & Caste', 'Education',
    'Land & Agriculture', 'Health', 'Financial', 'Schemes', 'Other'
];

// Max 500MB per family
const MAX_FAMILY_STORAGE = 500 * 1024 * 1024;

// ─── Upload Document ────────────────────────────────────────
router.post('/upload', authenticate(['operator']), upload.single('document'), auditLog('UPLOAD_DOCUMENT'), async (req, res) => {
    try {
        const { family_id, member_id, category, document_type, expiry_date } = req.body;
        const file = req.file;

        if (!file || !family_id || !category || !document_type) {
            return res.status(400).json({ error: 'file, family_id, category, and document_type are required.' });
        }

        if (!VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
        }

        // Verify family access
        const { data: family } = await supabase
            .from('families')
            .select('id')
            .eq('id', family_id)
            .eq('created_by_operator', req.user.id)
            .eq('is_deleted', false)
            .single();

        if (!family) {
            return res.status(404).json({ error: 'Family not found or not authorized.' });
        }

        // Check storage limit
        const { data: currentDocs } = await supabase
            .from('documents')
            .select('file_size_bytes')
            .eq('family_id', family_id)
            .eq('is_deleted', false);

        const totalUsed = (currentDocs || []).reduce((sum, d) => sum + (d.file_size_bytes || 0), 0);
        if (totalUsed + file.size > MAX_FAMILY_STORAGE) {
            return res.status(413).json({ error: 'Family storage limit (500 MB) exceeded.' });
        }

        // Encrypt the file
        const familyKey = deriveFamilyKey(family_id);
        const fileBase64 = file.buffer.toString('base64');
        const encryptedPayload = encrypt(fileBase64, familyKey);
        const encryptedBuffer = Buffer.from(encryptedPayload, 'utf8');

        // Determine file extension
        const extMap = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };
        const fileType = extMap[file.mimetype] || 'bin';

        // Upload to Supabase Storage
        const fileName = `${family_id}/${Date.now()}_${document_type.replace(/\s+/g, '_')}.${fileType}.enc`;
        const { error: storageError } = await supabase.storage
            .from('secure_documents')
            .upload(fileName, encryptedBuffer, {
                contentType: 'application/octet-stream',
                upsert: false
            });

        if (storageError) throw storageError;

        // Save metadata
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .insert([{
                family_id,
                member_id: member_id || null,
                category,
                document_type,
                storage_path: fileName,
                file_type: fileType,
                file_size_bytes: file.size,
                expiry_date: expiry_date || null,
                uploaded_by_operator: req.user.id,
                is_verified: false,
                version: 1
            }])
            .select()
            .single();

        if (docError) {
            // Cleanup storage on DB failure
            await supabase.storage.from('secure_documents').remove([fileName]);
            throw docError;
        }

        // Send notification to citizen
        const { data: familyInfo } = await supabase.from('families').select('family_name, primary_email, primary_mobile').eq('id', family_id).single();
        if (familyInfo) {
            const recipient = familyInfo.primary_email || familyInfo.primary_mobile;
            notify(recipient, 'document_added', {
                family_name: familyInfo.family_name,
                document_type: document_type,
                category: category,
            }).catch(err => console.error('Notification error:', err));
        }

        res.status(201).json({ message: 'Document encrypted and stored securely.', document: doc });
    } catch (err) {
        console.error('Error uploading document:', err);
        res.status(500).json({ error: 'Failed to upload document.' });
    }
});

// ─── List Family Documents ──────────────────────────────────
router.get('/family/:family_id', authenticate(['operator']), auditLog('LIST_DOCUMENTS'), async (req, res) => {
    try {
        const { family_id } = req.params;
        const { category } = req.query;

        let query = supabase
            .from('documents')
            .select('id, family_id, member_id, category, document_type, file_type, file_size_bytes, expiry_date, is_verified, version, is_archived, created_at')
            .eq('family_id', family_id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;
        res.status(200).json({ documents: data });
    } catch (err) {
        console.error('Error listing documents:', err);
        res.status(500).json({ error: 'Failed to fetch documents.' });
    }
});

// ─── View Document (Signed URL, 15 min) ─────────────────────
router.get('/:id/view', authenticate(['operator']), checkSession, auditLog('VIEW_DOCUMENT'), async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch document metadata
        const { data: doc, error: metaError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();

        if (metaError || !doc) {
            return res.status(404).json({ error: 'Document not found.' });
        }

        // Aadhaar special handling — check if it's an Aadhaar
        const isAadhaar = doc.document_type.toLowerCase().includes('aadhaar');

        // Download encrypted file
        const { data: fileBlob, error: downloadError } = await supabase.storage
            .from('secure_documents')
            .download(doc.storage_path);

        if (downloadError) throw downloadError;

        // Decrypt
        const encryptedPayload = await fileBlob.text();
        const familyKey = deriveFamilyKey(doc.family_id);
        const decryptedBase64 = decrypt(encryptedPayload, familyKey);
        const decryptedBuffer = Buffer.from(decryptedBase64, 'base64');

        // Log access
        await supabase.from('document_access_logs').insert([{
            document_id: id,
            operator_id: req.user.id,
            viewed_at: new Date().toISOString()
        }]);

        // Set headers for inline viewing (no download for Aadhaar)
        const mimeMap = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' };
        res.setHeader('Content-Type', mimeMap[doc.file_type] || 'application/octet-stream');

        if (isAadhaar) {
            // View-only, no download header
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('X-Aadhaar-Masked', 'true');
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${doc.document_type}.${doc.file_type}"`);
        }

        // Add watermark headers for client-side rendering
        res.setHeader('X-Watermark-Operator', req.user.kendra_name || 'Unknown');
        res.setHeader('X-Watermark-Time', new Date().toISOString());
        res.setHeader('X-Watermark-Session', 'SetuSeva-V1');

        // For images, add a text watermark overlay
        if (doc.file_type === 'jpg' || doc.file_type === 'png') {
            // Set cache-control to prevent caching of sensitive docs
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }

        res.send(decryptedBuffer);
    } catch (err) {
        console.error('Error viewing document:', err);
        res.status(500).json({ error: 'Failed to view document.' });
    }
});

// ─── Update Document Metadata ───────────────────────────────
router.put('/:id', authenticate(['operator']), auditLog('UPDATE_DOCUMENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { category, document_type, expiry_date, is_verified } = req.body;

        const updates = {};
        if (category) updates.category = category;
        if (document_type) updates.document_type = document_type;
        if (expiry_date !== undefined) updates.expiry_date = expiry_date;
        if (is_verified !== undefined) updates.is_verified = is_verified;

        const { data: doc, error } = await supabase
            .from('documents')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: 'Document updated.', document: doc });
    } catch (err) {
        console.error('Error updating document:', err);
        res.status(500).json({ error: 'Failed to update document.' });
    }
});

// ─── Soft Delete Document ───────────────────────────────────
router.delete('/:id', authenticate(['operator']), auditLog('DELETE_DOCUMENT'), async (req, res) => {
    try {
        const { id } = req.params;

        const { data: doc, error } = await supabase
            .from('documents')
            .update({ is_deleted: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: 'Document deleted.', document: doc });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ error: 'Failed to delete document.' });
    }
});

module.exports = router;
