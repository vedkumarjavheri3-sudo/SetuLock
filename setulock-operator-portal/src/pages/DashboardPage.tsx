import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { familyAPI, dashboardAPI } from '../api';

interface Family {
    id: string;
    family_name: string;
    primary_mobile: string;
    primary_email?: string;
    village?: string;
    created_at: string;
    family_members: { count: number }[];
}

interface DashboardStats {
    total_families: number;
    total_documents: number;
    pending_applications: number;
    erase_requests: number;
    storage_used_bytes: number;
}

interface RecentDoc {
    id: string;
    category: string;
    document_type: string;
    created_at: string;
    families: { family_name: string };
}

interface RecentApp {
    id: string;
    scheme_name_en: string;
    status: string;
    submitted_at: string;
    families: { family_name: string };
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const [families, setFamilies] = useState<Family[]>([]);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        family_name: '', primary_mobile: '', primary_email: '',
        village: '', taluka: '', district: ''
    });
    const [createError, setCreateError] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
    const [recentApps, setRecentApps] = useState<RecentApp[]>([]);

    const loadFamilies = async (q = '') => {
        try {
            setLoading(true);
            const res = await familyAPI.list({ search: q, limit: 50 });
            setFamilies(res.data.families || []);
        } catch { /* handled by interceptor */ }
        finally { setLoading(false); }
    };

    const loadStats = async () => {
        try {
            const res = await dashboardAPI.stats();
            setStats(res.data.stats);
            setRecentDocs(res.data.recent_documents || []);
            setRecentApps(res.data.recent_applications || []);
        } catch { /* ignore — stats are supplemental */ }
    };

    useEffect(() => { loadFamilies(); loadStats(); }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadFamilies(search);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        try {
            await familyAPI.create({
                family_name: createForm.family_name,
                primary_mobile: createForm.primary_mobile,
                primary_email: createForm.primary_email || undefined,
                village: createForm.village || undefined,
                taluka: createForm.taluka || undefined,
                district: createForm.district || undefined,
            });
            setShowCreate(false);
            setCreateForm({ family_name: '', primary_mobile: '', primary_email: '', village: '', taluka: '', district: '' });
            loadFamilies();
            loadStats();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setCreateError(error.response?.data?.error || 'Failed to create family.');
        }
    };

    const formatBytes = (b: number) => {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
        return (b / 1073741824).toFixed(2) + ' GB';
    };

    const storagePercent = stats ? Math.min(100, (stats.storage_used_bytes / (500 * 1024 * 1024 * (stats.total_families || 1))) * 100) : 0;

    return (
        <>
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👨‍👩‍👧‍👦</div>
                    <div className="stat-value">{stats?.total_families ?? '—'}</div>
                    <div className="stat-label">Total Families</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📄</div>
                    <div className="stat-value">{stats?.total_documents ?? '—'}</div>
                    <div className="stat-label">Documents Stored</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-value">{stats?.pending_applications ?? '—'}</div>
                    <div className="stat-label">Pending Applications</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-value">{stats?.erase_requests ?? 0}</div>
                    <div className="stat-label">Erase Requests</div>
                </div>
            </div>

            {/* Storage Indicator */}
            {stats && stats.total_documents > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>💾 Storage:</span>
                        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                            <div style={{
                                width: `${storagePercent}%`,
                                height: '100%',
                                background: storagePercent > 80 ? 'var(--danger)' : 'var(--gold)',
                                borderRadius: 8,
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {formatBytes(stats.storage_used_bytes)} used
                        </span>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            {(recentDocs.length > 0 || recentApps.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                    {/* Recent Documents */}
                    {recentDocs.length > 0 && (
                        <div className="card">
                            <div className="card-header"><h3>📄 Recent Documents</h3></div>
                            <div className="card-body" style={{ padding: 0 }}>
                                <table className="data-table">
                                    <thead><tr><th>Document</th><th>Family</th><th>Date</th></tr></thead>
                                    <tbody>
                                        {recentDocs.map(d => (
                                            <tr key={d.id}>
                                                <td style={{ fontWeight: 500 }}>{d.document_type}</td>
                                                <td style={{ color: '#64748b' }}>{d.families?.family_name}</td>
                                                <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(d.created_at).toLocaleDateString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Recent Applications */}
                    {recentApps.length > 0 && (
                        <div className="card">
                            <div className="card-header"><h3>📋 Recent Applications</h3></div>
                            <div className="card-body" style={{ padding: 0 }}>
                                <table className="data-table">
                                    <thead><tr><th>Scheme</th><th>Status</th><th>Date</th></tr></thead>
                                    <tbody>
                                        {recentApps.map(a => (
                                            <tr key={a.id}>
                                                <td style={{ fontWeight: 500 }}>{a.scheme_name_en}</td>
                                                <td><span className={`badge badge-${a.status}`}>{a.status.replace('_', ' ')}</span></td>
                                                <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(a.submitted_at).toLocaleDateString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Families Section */}
            <div className="card">
                <div className="card-header">
                    <h3>Families</h3>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
                            <input className="form-input" style={{ width: 240 }} placeholder="🔍 Search by name or mobile..."
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </form>
                        <button className="btn btn-gold" onClick={() => setShowCreate(true)}>+ New Family</button>
                    </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {loading ? (
                        <div className="empty-state"><div className="spinner spinner-dark" /></div>
                    ) : families.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">👨‍👩‍👧‍👦</div>
                            <h3>No families yet</h3>
                            <p>Create your first family account to get started.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>Family Name</th><th>Mobile</th><th>Email</th><th>Village</th><th>Members</th><th>Created</th></tr></thead>
                            <tbody>
                                {families.map(f => (
                                    <tr key={f.id} onClick={() => navigate(`/family/${f.id}`)} style={{ cursor: 'pointer' }}>
                                        <td style={{ fontWeight: 600 }}>{f.family_name}</td>
                                        <td>{f.primary_mobile}</td>
                                        <td style={{ color: '#64748b' }}>{f.primary_email || '—'}</td>
                                        <td>{f.village || '—'}</td>
                                        <td>{f.family_members?.[0]?.count ?? 0}</td>
                                        <td style={{ color: '#94a3b8' }}>{new Date(f.created_at).toLocaleDateString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create Family Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Create New Family</h3><button className="close-btn" onClick={() => setShowCreate(false)}>✕</button></div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                {createError && <div className="alert alert-danger">⚠️ {createError}</div>}
                                <div className="form-group"><label>Family Name *</label><input className="form-input" required value={createForm.family_name} onChange={e => setCreateForm({ ...createForm, family_name: e.target.value })} placeholder="e.g., Patil Family" /></div>
                                <div className="form-row">
                                    <div className="form-group"><label>Primary Mobile *</label><input className="form-input" required pattern="[0-9]{10}" value={createForm.primary_mobile} onChange={e => setCreateForm({ ...createForm, primary_mobile: e.target.value })} placeholder="10-digit mobile" /></div>
                                    <div className="form-group"><label>Email</label><input className="form-input" type="email" value={createForm.primary_email} onChange={e => setCreateForm({ ...createForm, primary_email: e.target.value })} placeholder="optional" /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>Village</label><input className="form-input" value={createForm.village} onChange={e => setCreateForm({ ...createForm, village: e.target.value })} /></div>
                                    <div className="form-group"><label>Taluka</label><input className="form-input" value={createForm.taluka} onChange={e => setCreateForm({ ...createForm, taluka: e.target.value })} /></div>
                                    <div className="form-group"><label>District</label><input className="form-input" value={createForm.district} onChange={e => setCreateForm({ ...createForm, district: e.target.value })} /></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-gold">Create Family</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
