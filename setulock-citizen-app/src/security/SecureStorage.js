import * as SecureStore from 'expo-secure-store';

/**
 * Wrapper for expo-secure-store to safely store JWTs, keys, and identifiers.
 */
export const SecureStorage = {
    /**
     * Saves a string value securely.
     */
    async save(key, value) {
        try {
            if (typeof value !== 'string') {
                value = JSON.stringify(value);
            }
            await SecureStore.setItemAsync(key, value);
        } catch (error) {
            console.error('Error securely saving data:', error);
            throw new Error('Failed to save to secure storage');
        }
    },

    /**
     * Retrieves a securely stored value.
     */
    async get(key) {
        try {
            const result = await SecureStore.getItemAsync(key);
            if (result) {
                try {
                    return JSON.parse(result);
                } catch {
                    return result;
                }
            }
            return null;
        } catch (error) {
            console.error('Error fetching secure data:', error);
            return null;
        }
    },

    /**
     * Deletes a securely stored value. Useful on logout.
     */
    async delete(key) {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error('Error deleting secure data:', error);
        }
    }
};
