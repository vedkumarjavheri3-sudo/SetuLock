const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// Master key from env (must be 32 bytes hex)
const getMasterKey = () => Buffer.from(process.env.ENCRYPTION_MASTER_KEY || '0'.repeat(64), 'hex');

/**
 * Derives a user-specific key based on the master key and the user ID (salt).
 * Uses PBKDF2 for key derivation.
 */
const deriveUserKey = (userId) => {
    const masterKey = getMasterKey();
    return crypto.pbkdf2Sync(masterKey, userId, 100000, 32, 'sha512');
};

/**
 * Encrypts data using AES-256-GCM.
 * @param {string} text - The cleartext to encrypt.
 * @param {Buffer} key - The 32-byte encryption key.
 * @returns {string} - The IV, AuthTag, and Encrypted Payload concatenated (hex).
 */
const encrypt = (text, key) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts previously encrypted data.
 * @param {string} encryptedData - Format: iv:authTag:encryptedPayload
 * @param {Buffer} key - The 32-byte decryption key.
 * @returns {string} - The cleartext.
 */
const decrypt = (encryptedData, key) => {
    const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
    if (!ivHex || !authTagHex || !encryptedText) throw new Error('Invalid encrypted format');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

/**
 * Derives a family-specific key based on the master key and the family ID (salt).
 */
const deriveFamilyKey = (familyId) => {
    const masterKey = getMasterKey();
    return crypto.pbkdf2Sync(masterKey, familyId, 100000, 32, 'sha512');
};

module.exports = {
    deriveUserKey,
    deriveFamilyKey,
    encrypt,
    decrypt
};
