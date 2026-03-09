require('dotenv').config();
const { supabase } = require('./src/db');

async function alterTable() {
    console.log('Attempting to add email and password_hash columns to users table...');

    // We can execute SQL via rpc if there's a custom function, but let's just try
    // to see if we can just query it. Supabase JS client doesn't directly support ALTER TABLE.
    // However, if we do a test insert with email and password_hash, we'll see if it fails.

    // Let's check if the columns exist by fetching them.
    const { data, error } = await supabase
        .from('users')
        .select('email, password_hash')
        .limit(1);

    if (error && error.code === 'PGRST116') {
        console.log('Columns might not exist or no rows.');
    } else if (error) {
        console.error('Error (might mean columns are missing):', error);
    } else {
        console.log('Query successful, columns seem to exist.');
    }
}
alterTable();
