import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function LoginPage() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

    // Reset fields
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (mode === 'register') {
                await register({ name, email, password, kendra_name: kendraName, mobile, village, taluka, district });
                navigate('/');
            } else if (mode === 'login') {
                await login(email, password);
                navigate('/');
            } else if (mode === 'forgot') {
                await authAPI.forgotPassword(email);
                setSuccess('Reset code sent to your email! Check your inbox.');
                setMode('reset');
            } else if (mode === 'reset') {
                await authAPI.resetPassword(email, otp, newPassword);
                setSuccess('Password reset successful! You can now sign in.');
                setOtp('');
                setNewPassword('');
                setMode('login');
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Something went wrong';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'register': return 'Register as Operator';
            case 'forgot': return 'Forgot Password';
            case 'reset': return 'Reset Password';
            default: return 'Operator Login';
        }
    };

    const getSubtitle = () => {
        switch (mode) {
            case 'register': return 'Create your Seva Kendra operator account';
            case 'forgot': return 'Enter your email to receive a reset code';
            case 'reset': return 'Enter the 6-digit code sent to your email';
            default: return 'Sign in to Digi SetuSeva Operator Portal';
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="brand-badge">🏛️ Government Portal</div>
                <h1>{getTitle()}</h1>
                <p className="subtitle">{getSubtitle()}</p>

                {error && <div className="alert alert-danger">⚠️ {error}</div>}
                {success && <div className="alert alert-success" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.88rem' }}>✅ {success}</div>}

                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
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

                    {/* Email — shown in all modes */}
                    <div className="form-group">
                        <label>Email</label>
                        <input className="form-input" type="email" placeholder="operator@example.com"
                            value={email} onChange={e => setEmail(e.target.value)} required
                            disabled={mode === 'reset'} />
                    </div>

                    {/* Password — login & register only */}
                    {(mode === 'login' || mode === 'register') && (
                        <div className="form-group">
                            <label>Password</label>
                            <input className="form-input" type="password" placeholder="Enter your password"
                                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                        </div>
                    )}

                    {/* OTP + New Password — reset mode */}
                    {mode === 'reset' && (
                        <>
                            <div className="form-group">
                                <label>6-Digit Reset Code</label>
                                <input className="form-input" type="text" placeholder="Enter 6-digit code from email"
                                    value={otp} onChange={e => setOtp(e.target.value)} required
                                    maxLength={6} pattern="[0-9]{6}"
                                    style={{ letterSpacing: '0.3em', fontSize: '1.2rem', textAlign: 'center', fontWeight: 700 }} />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input className="form-input" type="password" placeholder="Enter new password (min 6 chars)"
                                    value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                            </div>
                        </>
                    )}

                    {mode === 'register' && (
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
                        {loading ? <span className="spinner" /> : (
                            mode === 'register' ? 'Create Account' :
                                mode === 'forgot' ? 'Send Reset Code' :
                                    mode === 'reset' ? 'Reset Password' :
                                        'Sign In'
                        )}
                    </button>
                </form>

                {/* Forgot Password link — login mode only */}
                {mode === 'login' && (
                    <p style={{ textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
                        <span className="toggle-link" style={{ cursor: 'pointer', color: '#d4a017', fontSize: '0.85rem' }}
                            onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>
                            Forgot Password?
                        </span>
                    </p>
                )}

                {/* Toggle links */}
                <p className="toggle-link">
                    {mode === 'login' ? "Don't have an account? " :
                        mode === 'register' ? 'Already have an account? ' :
                            'Remember your password? '}
                    <span onClick={() => { setMode(mode === 'register' ? 'login' : mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}>
                        {mode === 'register' ? 'Sign In' : mode === 'login' ? 'Register' : 'Sign In'}
                    </span>
                </p>
            </div>
        </div>
    );
}
