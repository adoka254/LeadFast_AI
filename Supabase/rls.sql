-- ============================================
-- Enable Row Level Security
-- ============================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BUSINESSES
-- ============================================

DROP POLICY IF EXISTS "Users can view their business" ON businesses;
CREATE POLICY "Users can view their business"
ON businesses
FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can create their business" ON businesses;
CREATE POLICY "Users can create their business"
ON businesses
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can update their business" ON businesses;
CREATE POLICY "Users can update their business"
ON businesses
FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid()
)
WITH CHECK (
    owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete their business" ON businesses;
CREATE POLICY "Users can delete their business"
ON businesses
FOR DELETE
TO authenticated
USING (
    owner_id = auth.uid()
);

-- ============================================
-- LEADS
-- ============================================

DROP POLICY IF EXISTS "Users can view their leads" ON leads;
CREATE POLICY "Users can view their leads"
ON leads
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = leads.business_id
        AND businesses.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create leads" ON leads;
CREATE POLICY "Users can create leads"
ON leads
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = leads.business_id
        AND businesses.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their leads" ON leads;
CREATE POLICY "Users can update their leads"
ON leads
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = leads.business_id
        AND businesses.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = leads.business_id
        AND businesses.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their leads" ON leads;
CREATE POLICY "Users can delete their leads"
ON leads
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = leads.business_id
        AND businesses.owner_id = auth.uid()
    )
);

-- ============================================
-- AI RESPONSES
-- ============================================

DROP POLICY IF EXISTS "Users can view their AI responses" ON ai_responses;
CREATE POLICY "Users can view their AI responses"
ON ai_responses
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM leads
        JOIN businesses
        ON businesses.id = leads.business_id
        WHERE leads.id = ai_responses.lead_id
        AND businesses.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create AI responses" ON ai_responses;
CREATE POLICY "Users can create AI responses"
ON ai_responses
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM leads
        JOIN businesses
        ON businesses.id = leads.business_id
        WHERE leads.id = ai_responses.lead_id
        AND businesses.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their AI responses" ON ai_responses;
CREATE POLICY "Users can update their AI responses"
ON ai_responses
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM leads
        JOIN businesses
        ON businesses.id = leads.business_id
        WHERE leads.id = ai_responses.lead_id
        AND businesses.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM leads
        JOIN businesses
        ON businesses.id = leads.business_id
        WHERE leads.id = ai_responses.lead_id
        AND businesses.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their AI responses" ON ai_responses;
CREATE POLICY "Users can delete their AI responses"
ON ai_responses
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM leads
        JOIN businesses
        ON businesses.id = leads.business_id
        WHERE leads.id = ai_responses.lead_id
        AND businesses.owner_id = auth.uid()
    )
);

-- ============================================
-- SETTINGS
-- ============================================

DROP POLICY IF EXISTS "Users can view their settings" ON settings;
CREATE POLICY "Users can view their settings"
ON settings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = settings.business_id
        AND businesses.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create their settings" ON settings;
CREATE POLICY "Users can create their settings"
ON settings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = settings.business_id
        AND businesses.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their settings" ON settings;
CREATE POLICY "Users can update their settings"
ON settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = settings.business_id
        AND businesses.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = settings.business_id
        AND businesses.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their settings" ON settings;
CREATE POLICY "Users can delete their settings"
ON settings
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM businesses
        WHERE businesses.id = settings.business_id
        AND businesses.owner_id = auth.uid()
    )
);