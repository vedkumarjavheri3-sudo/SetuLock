import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { familyAPI, documentAPI, applicationAPI, complianceAPI } from '../api';
import DocumentScanner from '../components/DocumentScanner';

interface FamilyMember {
    id: string; name: string; relation: string; dob?: string; gender?: string; is_deceased: boolean;
}
interface Document {
    id: string; category: string; document_type: string; file_type: string;
    file_size_bytes: number; is_verified: boolean; version: number;
    created_at: string; member_id?: string;
}
interface Application {
    id: string; scheme_name_en: string; scheme_name_mr?: string;
    status: string; submitted_at: string; updated_at: string;
}
interface Family {
    id: string; family_name: string; primary_mobile: string; primary_email?: string;
    village?: string; taluka?: string; district?: string;
    deletion_requested: boolean; deletion_scheduled_at?: string; created_at: string;
    family_members: FamilyMember[]; documents: Document[]; applications: Application[];
}

const CATEGORIES = [
    'Identity', 'Residence', 'Income & Caste', 'Education',
    'Land & Agriculture', 'Health', 'Financial', 'Schemes', 'Other'
];
const DOC_TYPES: Record<string, string[]> = {
    'Identity': ['Aadhaar Card', 'PAN Card', 'Voter ID', 'Passport', 'Ration Card', 'Driving License', 'Birth Certificate', 'Death Certificate', 'Marriage Certificate', 'School ID Card', 'Government Employee ID'],
    'Residence': ['Domicile Certificate', 'Utility Bill (Electricity)', 'Utility Bill (Water)', 'Utility Bill (Gas)', 'Rent Agreement', 'Property Tax Receipt', 'Society NOC', 'Address Proof Affidavit'],
    'Income & Caste': ['Income Certificate', 'Caste Certificate (SC/ST/OBC)', 'Non-Creamy Layer Certificate', 'EWS Certificate', 'BPL Certificate', 'Tribe Certificate', 'Caste Validity Certificate', 'Salary Slip', 'ITR Acknowledgement'],
    'Education': ['10th Marksheet', '12th Marksheet', 'Graduation Degree', 'Post-Graduation Degree', 'Diploma Certificate', 'Transfer Certificate (TC)', 'Leaving Certificate (LC)', 'Scholarship Letter', 'Bonafide Certificate', 'Migration Certificate', 'Gap Certificate'],
    'Land & Agriculture': ['7/12 Extract (Saat Baara)', '8A Extract', 'Land Record (Ferfar)', 'Tax Receipt (Kharij Kisti)', 'Mutation Entry', 'NA Order', 'Farmer Certificate', 'Crop Insurance Document'],
    'Health': ['Disability Certificate (UDID)', 'Medical Report', 'Hospital Discharge Summary', 'Prescription', 'Vaccination Certificate', 'COVID Certificate', 'Ayushman Bharat Card', 'Blood Group Certificate'],
    'Financial': ['Bank Passbook', 'Cancelled Cheque', 'Bank Statement', 'FD Receipt', 'LIC Policy', 'Loan Sanction Letter', 'Jan Dhan Account Passbook', 'Post Office Savings Passbook'],
    'Schemes': ['PM Kisan Samman Nidhi', 'Antyodaya Anna Yojana', 'Ladki Bahin Yojana', 'Majhi Kanya Bhagyashree', 'Shetkari Sanman Yojana', 'PM Awas Yojana', 'Ujjwala Yojana', 'MGNREGA Job Card', 'Widow Pension', 'Old Age Pension', 'Disability Pension'],
    'Other': ['Affidavit', 'NOC', 'Power of Attorney', 'Court Order', 'Police Clearance', 'Character Certificate', 'Custom Document'],
};
const RELATIONS = ['Self', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Other'];

const catClass = (cat: string) => {
    const map: Record<string, string> = {
        'Identity': 'doc-cat-identity', 'Residence': 'doc-cat-residence',
        'Income & Caste': 'doc-cat-income', 'Education': 'doc-cat-education',
        'Land & Agriculture': 'doc-cat-land', 'Health': 'doc-cat-health',
        'Financial': 'doc-cat-financial', 'Schemes': 'doc-cat-schemes', 'Other': 'doc-cat-other',
    };
    return map[cat] || '';
};

export default function FamilyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [family, setFamily] = useState<Family | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'members' | 'documents' | 'applications'>('members');

    // Modals
    const [showAddMember, setShowAddMember] = useState(false);
    const [showUploadDoc, setShowUploadDoc] = useState(false);
    const [showAddApp, setShowAddApp] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Add member form
    const [memberForm, setMemberForm] = useState({ name: '', relation: 'Self', dob: '', gender: 'Male' });
    // Upload doc form
    const [docCategory, setDocCategory] = useState('Identity');
    const [docType, setDocType] = useState('');
    const [docMemberId, setDocMemberId] = useState('');
    const [docExpiry, setDocExpiry] = useState('');
    const [docFile, setDocFile] = useState<File | null>(null);
    // Add application form
    const [appForm, setAppForm] = useState({ scheme_name_en: '', scheme_name_mr: '', reference_no: '', member_id: '' });

    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadFamily = async () => {
        try {
            setLoading(true);
            const res = await familyAPI.get(id!);
            setFamily(res.data.family);
        } catch {
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadFamily(); }, [id]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await familyAPI.addMember(id!, memberForm);
            setShowAddMember(false);
            setMemberForm({ name: '', relation: 'Self', dob: '', gender: 'Male' });
            showToast('Member added successfully');
            loadFamily();
        } catch { showToast('Failed to add member', 'error'); }
        finally { setActionLoading(false); }
    };

    const handleUploadDoc = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!docFile) return;
        setActionLoading(true);
        try {
            const fd = new FormData();
            fd.append('document', docFile);
            fd.append('family_id', id!);
            fd.append('category', docCategory);
            fd.append('document_type', docType || DOC_TYPES[docCategory]?.[0] || 'Document');
            if (docMemberId) fd.append('member_id', docMemberId);
            if (docExpiry) fd.append('expiry_date', docExpiry);
            await documentAPI.upload(fd);
            setShowUploadDoc(false);
            setDocFile(null);
            showToast('Document uploaded and encrypted');
            loadFamily();
        } catch { showToast('Failed to upload document', 'error'); }
        finally { setActionLoading(false); }
    };

    const handleAddApp = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await applicationAPI.create({
                family_id: id!,
                scheme_name_en: appForm.scheme_name_en,
                scheme_name_mr: appForm.scheme_name_mr || undefined,
                member_id: appForm.member_id || undefined,
                reference_no: appForm.reference_no || undefined,
            });
            setShowAddApp(false);
            setAppForm({ scheme_name_en: '', scheme_name_mr: '', reference_no: '', member_id: '' });
            showToast('Application submitted');
            loadFamily();
        } catch { showToast('Failed to submit application', 'error'); }
        finally { setActionLoading(false); }
    };

    const handleErase = async () => {
        if (!confirm('Are you sure? This will schedule deletion of ALL family data in 30 days.')) return;
        try {
            await complianceAPI.eraseRequest(id!);
            showToast('Deletion scheduled (30 days)');
            loadFamily();
        } catch { showToast('Failed to process erase', 'error'); }
    };

    const handleCancelErase = async () => {
        try {
            await complianceAPI.cancelErase(id!);
            showToast('Deletion cancelled');
            loadFamily();
        } catch { showToast('Failed to cancel', 'error'); }
    };

    const handleViewDoc = async (docId: string) => {
        try {
            const res = await documentAPI.view(docId);
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
        } catch { showToast('Failed to view document', 'error'); }
    };

    const formatBytes = (b: number) => {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    };

    if (loading || !family) return <div className="empty-state"><div className="spinner spinner-dark" /></div>;

    return (
        <>
            {/* Erase Alert */}
            {family.deletion_requested && (
                <div className="alert alert-danger">
                    🗑️ Deletion scheduled for {new Date(family.deletion_scheduled_at!).toLocaleDateString('en-IN')}.
                    <button className="btn btn-sm btn-outline" style={{ marginLeft: 'auto' }} onClick={handleCancelErase}>Cancel Deletion</button>
                </div>
            )}

            {/* Family Header */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>{family.family_name}</h2>
                        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
                            📱 {family.primary_mobile}
                            {family.primary_email && <> &nbsp;·&nbsp; 📧 {family.primary_email}</>}
                            {family.village && <> &nbsp;·&nbsp; 📍 {family.village}{family.taluka ? `, ${family.taluka}` : ''}{family.district ? `, ${family.district}` : ''}</>}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {!family.deletion_requested && (
                            <button className="btn btn-sm btn-danger" onClick={handleErase}>🗑️ ERASE</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                {(['members', 'documents', 'applications'] as const).map(tab => (
                    <button key={tab} className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setActiveTab(tab)}>
                        {tab === 'members' ? `👥 Members (${family.family_members.length})`
                            : tab === 'documents' ? `📄 Documents (${family.documents.length})`
                                : `📋 Applications (${family.applications.length})`}
                    </button>
                ))}
            </div>

            {/* Members Tab */}
            {activeTab === 'members' && (
                <div className="card">
                    <div className="card-header">
                        <h3>Family Members</h3>
                        <button className="btn btn-sm btn-gold" onClick={() => setShowAddMember(true)}>+ Add Member</button>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {family.family_members.length === 0 ? (
                            <div className="empty-state"><div className="empty-icon">👤</div><h3>No members added</h3><p>Add family members to manage their documents.</p></div>
                        ) : (
                            <table className="data-table">
                                <thead><tr><th>Name</th><th>Relation</th><th>Gender</th><th>Date of Birth</th><th>Status</th></tr></thead>
                                <tbody>
                                    {family.family_members.map(m => (
                                        <tr key={m.id}>
                                            <td style={{ fontWeight: 600 }}>{m.name}</td>
                                            <td>{m.relation}</td>
                                            <td>{m.gender || '—'}</td>
                                            <td>{m.dob ? new Date(m.dob).toLocaleDateString('en-IN') : '—'}</td>
                                            <td>{m.is_deceased ? <span className="badge badge-rejected">Deceased</span> : <span className="badge badge-active">Active</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <div className="card">
                    <div className="card-header">
                        <h3>Documents</h3>
                        <button className="btn btn-sm btn-gold" onClick={() => setShowUploadDoc(true)}>📤 Upload Document</button>
                        <button className="btn btn-sm btn-primary" onClick={() => setShowScanner(true)}>📷 Scan Document</button>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {family.documents.length === 0 ? (
                            <div className="empty-state"><div className="empty-icon">📁</div><h3>No documents uploaded</h3><p>Upload encrypted documents for this family.</p></div>
                        ) : (
                            <table className="data-table">
                                <thead><tr><th>Type</th><th>Category</th><th>Format</th><th>Size</th><th>Verified</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {family.documents.map(d => (
                                        <tr key={d.id} className={catClass(d.category)}>
                                            <td style={{ fontWeight: 600 }}>{d.document_type}</td>
                                            <td>{d.category}</td>
                                            <td>{d.file_type.toUpperCase()}</td>
                                            <td>{formatBytes(d.file_size_bytes)}</td>
                                            <td>{d.is_verified ? <span className="badge badge-approved">Verified</span> : <span className="badge badge-under_review">Pending</span>}</td>
                                            <td><button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); handleViewDoc(d.id); }}>👁️ View</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div >
            )
            }

            {/* Applications Tab */}
            {
                activeTab === 'applications' && (
                    <div className="card">
                        <div className="card-header">
                            <h3>Scheme Applications</h3>
                            <button className="btn btn-sm btn-gold" onClick={() => setShowAddApp(true)}>+ New Application</button>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {family.applications.length === 0 ? (
                                <div className="empty-state"><div className="empty-icon">📋</div><h3>No applications</h3><p>Submit a scheme application for this family.</p></div>
                            ) : (
                                <table className="data-table">
                                    <thead><tr><th>Scheme</th><th>Status</th><th>Submitted</th><th>Updated</th></tr></thead>
                                    <tbody>
                                        {family.applications.map(a => (
                                            <tr key={a.id}>
                                                <td style={{ fontWeight: 600 }}>{a.scheme_name_en}{a.scheme_name_mr && <span style={{ color: '#94a3b8', marginLeft: 8 }}>({a.scheme_name_mr})</span>}</td>
                                                <td><span className={`badge badge-${a.status}`}>{a.status.replace('_', ' ')}</span></td>
                                                <td>{new Date(a.submitted_at).toLocaleDateString('en-IN')}</td>
                                                <td>{new Date(a.updated_at).toLocaleDateString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Add Member Modal */}
            {
                showAddMember && (
                    <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h3>Add Family Member</h3><button className="close-btn" onClick={() => setShowAddMember(false)}>✕</button></div>
                            <form onSubmit={handleAddMember}>
                                <div className="modal-body">
                                    <div className="form-group"><label>Name *</label><input className="form-input" required value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} /></div>
                                    <div className="form-row">
                                        <div className="form-group"><label>Relation *</label>
                                            <select className="form-input" value={memberForm.relation} onChange={e => setMemberForm({ ...memberForm, relation: e.target.value })}>
                                                {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group"><label>Gender</label>
                                            <select className="form-input" value={memberForm.gender} onChange={e => setMemberForm({ ...memberForm, gender: e.target.value })}>
                                                <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group"><label>Date of Birth</label><input className="form-input" type="date" value={memberForm.dob} onChange={e => setMemberForm({ ...memberForm, dob: e.target.value })} /></div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline" onClick={() => setShowAddMember(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-gold" disabled={actionLoading}>{actionLoading ? <span className="spinner" /> : 'Add Member'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Upload Document Modal */}
            {
                showUploadDoc && (
                    <div className="modal-overlay" onClick={() => setShowUploadDoc(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h3>Upload Document</h3><button className="close-btn" onClick={() => setShowUploadDoc(false)}>✕</button></div>
                            <form onSubmit={handleUploadDoc}>
                                <div className="modal-body">
                                    <div className="form-group"><label>Category *</label>
                                        <select className="form-input" value={docCategory} onChange={e => { setDocCategory(e.target.value); setDocType(''); }}>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Document Type *</label>
                                        <select className="form-input" value={docType} onChange={e => setDocType(e.target.value)}>
                                            <option value="">Select type...</option>
                                            {(DOC_TYPES[docCategory] || []).map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Family Member</label>
                                        <select className="form-input" value={docMemberId} onChange={e => setDocMemberId(e.target.value)}>
                                            <option value="">Select member (optional)...</option>
                                            {family.family_members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Expiry Date</label><input className="form-input" type="date" value={docExpiry} onChange={e => setDocExpiry(e.target.value)} /></div>
                                    <div className="form-group"><label>Document File * (PDF, JPG, PNG — max 10MB)</label>
                                        <input className="form-input" type="file" accept=".pdf,.jpg,.jpeg,.png" required onChange={e => setDocFile(e.target.files?.[0] || null)} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline" onClick={() => setShowUploadDoc(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-gold" disabled={actionLoading}>{actionLoading ? <span className="spinner" /> : '📤 Upload & Encrypt'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Add Application Modal */}
            {
                showAddApp && (
                    <div className="modal-overlay" onClick={() => setShowAddApp(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h3>Submit Application</h3><button className="close-btn" onClick={() => setShowAddApp(false)}>✕</button></div>
                            <form onSubmit={handleAddApp}>
                                <div className="modal-body">
                                    <div className="form-group"><label>Scheme Name (English) *</label><input className="form-input" required value={appForm.scheme_name_en} onChange={e => setAppForm({ ...appForm, scheme_name_en: e.target.value })} placeholder="e.g., PM Kisan Samman Nidhi" /></div>
                                    <div className="form-group"><label>Scheme Name (Marathi)</label><input className="form-input" value={appForm.scheme_name_mr} onChange={e => setAppForm({ ...appForm, scheme_name_mr: e.target.value })} /></div>
                                    <div className="form-group"><label>Reference Number</label><input className="form-input" value={appForm.reference_no} onChange={e => setAppForm({ ...appForm, reference_no: e.target.value })} /></div>
                                    <div className="form-group"><label>For Family Member</label>
                                        <select className="form-input" value={appForm.member_id} onChange={e => setAppForm({ ...appForm, member_id: e.target.value })}>
                                            <option value="">Entire family</option>
                                            {family.family_members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline" onClick={() => setShowAddApp(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-gold" disabled={actionLoading}>{actionLoading ? <span className="spinner" /> : 'Submit Application'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Toast */}
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

            {/* Document Scanner */}
            {
                showScanner && (
                    <DocumentScanner
                        onCapture={(file) => {
                            setDocFile(file);
                            setShowScanner(false);
                            setShowUploadDoc(true);
                            showToast('Document scanned! Select category and upload.');
                        }}
                        onClose={() => setShowScanner(false)}
                    />
                )
            }
        </>
    );
}
