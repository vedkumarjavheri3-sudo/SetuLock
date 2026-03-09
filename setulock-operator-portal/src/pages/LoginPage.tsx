import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Login fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Register fields
    const [name, setName] = useState('');
    const [kendraName, setKendraName] = useState('');
    const [mobile, setMobile] = useState('');
    const [village, setVillage] = useState('');
    const [taluka, setTaluka] = useState('');
    const [district, setDistrict] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await register({ name, email, password, kendra_name: kendraName, mobile, village, taluka, district });
            } else {
                await login(email, password);
            }
            navigate('/');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Something went wrong';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="brand-badge">🏛️ Government Portal</div>
                <h1>{isRegister ? 'Register as Operator' : 'Operator Login'}</h1>
                <p className="subtitle">
                    {isRegister
                        ? 'Create your Seva Kendra operator account'
                        : 'Sign in to Digi SetuSeva Operator Portal'}
                </p>

                {error && <div className="alert alert-danger">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    {isRegister && (
                        <>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input className="form-input" type="text" placeholder="Enter your full name"
                                    value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Seva Kendra Name</label>
                                <input className="form-input" type="text" placeholder="e.g., Shivaji Nagar Seva Kendra"
                                    value={kendraName} onChange={e => setKendraName(e.target.value)} required />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Email</label>
                        <input className="form-input" type="email" placeholder="operator@example.com"
                            value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input className="form-input" type="password" placeholder="Enter your password"
                            value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    </div>

                    {isRegister && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Mobile (Optional)</label>
                                    <input className="form-input" type="tel" placeholder="10-digit mobile"
                                        value={mobile} onChange={e => setMobile(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Village</label>
                                    <input className="form-input" type="text" placeholder="Village name"
                                        value={village} onChange={e => setVillage(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Taluka</label>
                                    <input className="form-input" type="text" placeholder="Taluka"
                                        value={taluka} onChange={e => setTaluka(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>District</label>
                                    <input className="form-input" type="text" placeholder="District"
                                        value={district} onChange={e => setDistrict(e.target.value)} />
                                </div>
                            </div>
                        </>
                    )}

                    <button type="submit" className="btn btn-gold login-btn" disabled={loading}>
                        {loading ? <span className="spinner" /> : (isRegister ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <p className="toggle-link">
                    {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                    <span onClick={() => { setIsRegister(!isRegister); setError(''); }}>
                        {isRegister ? 'Sign In' : 'Register'}
                    </span>
                </p>
            </div>
        </div>
    );
}
