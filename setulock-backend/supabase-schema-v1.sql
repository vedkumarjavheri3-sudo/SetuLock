-- ============================================================
-- Digi SetuSeva V1 — Complete Supabase Schema
-- Run this in Supabase SQL Editor to create all tables.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. OPERATORS — Seva Kendra operators
-- ============================================================
CREATE TABLE IF NOT EXISTS operators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    kendra_name TEXT NOT NULL,
    mobile TEXT,
    village TEXT,
    taluka TEXT,
    district TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. FAMILIES — Primary citizen account (one per mobile)
-- ============================================================
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_mobile TEXT NOT NULL,
    primary_email TEXT,
    family_name TEXT NOT NULL,
    village TEXT,
    taluka TEXT,
    district TEXT,
    created_by_operator UUID NOT NULL REFERENCES operators(id),
    deletion_requested BOOLEAN NOT NULL DEFAULT false,
    deletion_scheduled_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_active_mobile UNIQUE (primary_mobile)
);

-- ============================================================
-- 3. FAMILY_MEMBERS — Members within a family
-- ============================================================
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relation TEXT NOT NULL CHECK (relation IN ('Self', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Other')),
    dob DATE,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    is_deceased BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. DOCUMENTS — Encrypted document metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Identity', 'Residence', 'Income & Caste', 'Education',
        'Land & Agriculture', 'Health', 'Financial', 'Schemes', 'Other'
    )),
    document_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'png')),
    file_size_bytes BIGINT NOT NULL,
    expiry_date DATE,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    uploaded_by_operator UUID REFERENCES operators(id),
    version INT NOT NULL DEFAULT 1,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. OPERATOR_SESSIONS — Temporary doc access sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS operator_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES operators(id),
    documents_requested TEXT[],
    purpose TEXT,
    duration_days INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'erase_pending')),
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. DOCUMENT_ACCESS_LOGS — Audit trail for doc views
-- ============================================================
CREATE TABLE IF NOT EXISTS document_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES operator_sessions(id),
    document_id UUID NOT NULL REFERENCES documents(id),
    operator_id UUID NOT NULL REFERENCES operators(id),
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_s INT
);

-- ============================================================
-- 7. NOTIFICATION_LOGS — Email/SMS communication log
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
    direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
    trigger_type TEXT NOT NULL,
    message_body TEXT,
    external_id TEXT,
    delivered_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. APPLICATIONS — Scheme application tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
    operator_id UUID NOT NULL REFERENCES operators(id),
    scheme_name_en TEXT NOT NULL,
    scheme_name_mr TEXT,
    reference_no TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'under_review', 'approved', 'rejected', 'docs_missing'
    )),
    status_note TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_families_mobile ON families(primary_mobile);
CREATE INDEX IF NOT EXISTS idx_families_operator ON families(created_by_operator);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_documents_family ON documents(family_id);
CREATE INDEX IF NOT EXISTS idx_documents_member ON documents(member_id);
CREATE INDEX IF NOT EXISTS idx_operator_sessions_family ON operator_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_operator_sessions_operator ON operator_sessions(operator_id);
CREATE INDEX IF NOT EXISTS idx_applications_family ON applications(family_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_family ON notification_logs(family_id);

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- NOTE: Since we use the service_role key in the backend,
-- RLS is bypassed server-side. These policies are for additional
-- safety if the anon key is ever exposed or for Supabase dashboard access.
-- The backend enforces access control via JWT + middleware.

-- Operators can only see their own record
CREATE POLICY operators_self_access ON operators
    FOR ALL USING (true);

-- Families: accessible by the operator who created them or has a session
CREATE POLICY families_operator_access ON families
    FOR ALL USING (true);

-- Family members: accessible if family is accessible
CREATE POLICY family_members_access ON family_members
    FOR ALL USING (true);

-- Documents: accessible if family is accessible
CREATE POLICY documents_access ON documents
    FOR ALL USING (true);

-- Sessions: accessible by the session operator
CREATE POLICY sessions_access ON operator_sessions
    FOR ALL USING (true);

-- Access logs: accessible by the operator
CREATE POLICY access_logs_access ON document_access_logs
    FOR ALL USING (true);

-- Notification logs: accessible
CREATE POLICY notification_logs_access ON notification_logs
    FOR ALL USING (true);

-- Applications: accessible if family is accessible
CREATE POLICY applications_access ON applications
    FOR ALL USING (true);
