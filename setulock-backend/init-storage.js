require('dotenv').config();
const { supabase } = require('./src/db');

async function createStorageBucket() {
    console.log('Ensure the `secure_documents` bucket exists...');

    try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) throw listError;

        const bucketExists = buckets.some(b => b.name === 'secure_documents');

        if (!bucketExists) {
            const { data, error } = await supabase.storage.createBucket('secure_documents', {
                public: false, // Critical: Only accessible via signed URLs or Service Role
                allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
                fileSizeLimit: 10485760 // 10MB
            });
            if (error) throw error;
            console.log('✅ Bucket `secure_documents` created successfully.');
        } else {
            console.log('✅ Bucket `secure_documents` already exists.');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to create or check bucket:', err.message);
        process.exit(1);
    }
}

createStorageBucket();
