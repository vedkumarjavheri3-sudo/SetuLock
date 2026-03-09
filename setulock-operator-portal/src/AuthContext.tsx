import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from './api';

interface Operator {
    id: string;
    name: string;
    email: string;
    kendra_name: string;
    plan: string;
}

interface AuthContextType {
    operator: Operator | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (data: {
        name: string; email: string; password: string;
        kendra_name: string; mobile?: string;
        village?: string; taluka?: string; district?: string;
    }) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [operator, setOperator] = useState<Operator | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            authAPI.me()
                .then((res) => setOperator(res.data.operator))
                .catch(() => { setToken(null); localStorage.removeItem('token'); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (email: string, password: string) => {
        const res = await authAPI.login(email, password);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('operator', JSON.stringify(res.data.operator));
        setToken(res.data.token);
        setOperator(res.data.operator);
    };

    const register = async (data: {
        name: string; email: string; password: string;
        kendra_name: string; mobile?: string;
        village?: string; taluka?: string; district?: string;
    }) => {
        const res = await authAPI.register(data);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('operator', JSON.stringify(res.data.operator));
        setToken(res.data.token);
        setOperator(res.data.operator);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('operator');
        setToken(null);
        setOperator(null);
    };

    return (
        <AuthContext.Provider value={{ operator, token, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
