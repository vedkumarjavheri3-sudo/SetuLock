require('dotenv').config();
const { supabase } = require('./src/db');

async function checkSchema() {
    console.log('Checking database schema...');

    // Check for 'users' table
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

    if (usersError) {
        if (usersError.code === '42P01') {
            console.log('❌ "users" table does not exist. Schema is NOT applied.');
            process.exit(1);
        } else {
            console.log('⚠️ Error checking "users" table:', usersError);
        }
    } else {
        console.log('✅ "users" table is present.');
    }

    // Check for 'documents' table
    const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('id')
        .limit(1);

    if (docsError) {
        if (docsError.code === '42P01') {
            console.log('❌ "documents" table does not exist. Schema is NOT applied.');
            process.exit(1);
        } else {
            console.log('⚠️ Error checking "documents" table:', docsError);
        }
    } else {
        console.log('✅ "documents" table is present.');
    }

    console.log('Database verification complete.');
    process.exit(0);
}

checkSchema();
