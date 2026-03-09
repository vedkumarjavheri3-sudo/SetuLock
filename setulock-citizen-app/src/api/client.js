import axios from 'axios';
import { SecureStorage } from '../security/SecureStorage';

// Base URL points to our Node.js middleware layer, NOT Supabase directly.
// Handle local IP properly since Android emulator needs 10.0.2.2 usually.
const BASE_URL = 'http://10.0.2.2:3000/api/v1';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to automatically attach JWT token securely
api.interceptors.request.use(
    async (config) => {
        const token = await SecureStorage.get('user_jwt');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration/401 errors globally
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        if (error.response && error.response.status === 401) {
            console.warn('Unauthorized access. Purging secure storage and logging out.');
            await SecureStorage.delete('user_jwt');
            await SecureStorage.delete('user_data');
            // Navigation dispatch to kick to Login screen should happen here
        }
        return Promise.reject(error);
    }
);

export default api;
