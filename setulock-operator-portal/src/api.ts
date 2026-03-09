import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('operator');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ─── Auth ────────────────────────────────────────────
export const authAPI = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (data: {
        name: string; email: string; password: string;
        kendra_name: string; mobile?: string;
        village?: string; taluka?: string; district?: string;
    }) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
};

// ─── Families ────────────────────────────────────────
export const familyAPI = {
    list: (params?: { search?: string; page?: number; limit?: number }) =>
        api.get('/families', { params }),
    get: (id: string) => api.get(`/families/${id}`),
    create: (data: {
        primary_mobile: string; family_name: string; primary_email?: string;
        village?: string; taluka?: string; district?: string;
    }) => api.post('/families', data),
    update: (id: string, data: Record<string, unknown>) =>
        api.put(`/families/${id}`, data),
    addMember: (familyId: string, data: {
        name: string; relation: string; dob?: string; gender?: string;
    }) => api.post(`/families/${familyId}/members`, data),
    updateMember: (familyId: string, memberId: string, data: Record<string, unknown>) =>
        api.put(`/families/${familyId}/members/${memberId}`, data),
};

// ─── Documents ───────────────────────────────────────
export const documentAPI = {
    listForFamily: (familyId: string, category?: string) =>
        api.get(`/documents/family/${familyId}`, { params: { category } }),
    upload: (formData: FormData) =>
        api.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    view: (id: string) =>
        api.get(`/documents/${id}/view`, { responseType: 'blob' }),
    update: (id: string, data: Record<string, unknown>) =>
        api.put(`/documents/${id}`, data),
    delete: (id: string) => api.delete(`/documents/${id}`),
};

// ─── Sessions ────────────────────────────────────────
export const sessionAPI = {
    list: (status?: string) =>
        api.get('/sessions', { params: { status } }),
    get: (id: string) => api.get(`/sessions/${id}`),
    create: (data: {
        family_id: string; documents_requested?: string[];
        purpose?: string; duration_days?: number;
    }) => api.post('/sessions', data),
    revoke: (id: string) => api.delete(`/sessions/${id}`),
};

// ─── Applications ────────────────────────────────────
export const applicationAPI = {
    listForFamily: (familyId: string) =>
        api.get(`/applications/family/${familyId}`),
    create: (data: {
        family_id: string; member_id?: string;
        scheme_name_en: string; scheme_name_mr?: string; reference_no?: string;
    }) => api.post('/applications', data),
    updateStatus: (id: string, status: string, status_note?: string) =>
        api.put(`/applications/${id}/status`, { status, status_note }),
};

// ─── Compliance ──────────────────────────────────────
export const complianceAPI = {
    eraseRequest: (family_id: string) =>
        api.post('/compliance/erase-request', { family_id }),
    cancelErase: (family_id: string) =>
        api.post('/compliance/cancel-erase', { family_id }),
};

// ─── Dashboard ───────────────────────────────────────
export const dashboardAPI = {
    stats: () => api.get('/dashboard/stats'),
};

export default api;
