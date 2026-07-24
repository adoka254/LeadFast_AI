-- ============================================
-- Enable UUID generation
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Businesses Table
-- ============================================

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    trade TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    plan TEXT DEFAULT 'starter',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Leads Table
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    lead_name TEXT,
    lead_email TEXT,
    lead_phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'received',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AI Responses Table
-- ============================================

CREATE TABLE IF NOT EXISTS ai_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    generated_text TEXT NOT NULL,
    model_used TEXT DEFAULT 'claude-haiku',
    sent_at TIMESTAMPTZ,
    delivery_status TEXT
);

-- ============================================
-- Settings Table
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
    business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    reply_tone TEXT DEFAULT 'friendly_professional',
    sms_alerts_enabled BOOLEAN DEFAULT FALSE,
    custom_signature TEXT
);