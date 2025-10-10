-- Add Admin Role System to Supabase
-- This adds super admin functionality for content management

-- =============================================
-- ADMIN ROLES TABLE
-- =============================================

-- Create admin roles table
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'content_manager', 'moderator')),
    permissions JSONB DEFAULT '{}',
    granted_by UUID REFERENCES user_profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create index for quick role lookups
CREATE INDEX idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX idx_admin_roles_role ON admin_roles(role) WHERE is_active = true;

-- =============================================
-- CONTENT UPLOAD TRACKING
-- =============================================

-- Track who uploads what content
CREATE TABLE IF NOT EXISTS content_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    uploaded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('book', 'quiz', 'category', 'achievement')),
    content_id UUID NOT NULL,
    file_name TEXT,
    file_size BIGINT,
    upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_content_uploads_user ON content_uploads(uploaded_by);
CREATE INDEX idx_content_uploads_status ON content_uploads(upload_status);
CREATE INDEX idx_content_uploads_date ON content_uploads(uploaded_at);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_roles
        WHERE user_id = user_uuid
        AND role = 'super_admin'
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any admin role
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_roles
        WHERE user_id = user_uuid
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's admin roles
CREATE OR REPLACE FUNCTION get_user_admin_roles(user_uuid UUID)
RETURNS TABLE(role TEXT, permissions JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT ar.role, ar.permissions
    FROM admin_roles ar
    WHERE ar.user_id = user_uuid
    AND ar.is_active = true
    AND (ar.expires_at IS NULL OR ar.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on admin tables
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_uploads ENABLE ROW LEVEL SECURITY;

-- Super admins can view all admin roles
CREATE POLICY "Super admins can view all admin roles" 
ON admin_roles FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Users can view their own admin roles
CREATE POLICY "Users can view own admin roles" 
ON admin_roles FOR SELECT 
USING (auth.uid() = user_id);

-- Only super admins can insert/update/delete admin roles
CREATE POLICY "Super admins can manage admin roles" 
ON admin_roles FOR ALL 
USING (is_super_admin(auth.uid()));

-- Admins can view content uploads
CREATE POLICY "Admins can view content uploads" 
ON content_uploads FOR SELECT 
USING (is_admin(auth.uid()));

-- Admins can insert content uploads
CREATE POLICY "Admins can create content uploads" 
ON content_uploads FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- UPDATE BOOKS TABLE POLICIES
-- =============================================

-- Drop existing policies for books
DROP POLICY IF EXISTS "Anyone can view books" ON books;

-- Recreate with admin write access
CREATE POLICY "Anyone can view active books" 
ON books FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can insert books" 
ON books FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update books" 
ON books FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can delete books" 
ON books FOR DELETE 
USING (is_super_admin(auth.uid()));

-- =============================================
-- AUDIT LOG
-- =============================================

-- Create audit log for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_date ON admin_audit_log(created_at);

-- Enable RLS on audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit log" 
ON admin_audit_log FOR SELECT 
USING (is_super_admin(auth.uid()));

-- =============================================
-- TRIGGERS
-- =============================================

-- Add updated_at trigger for admin_roles
CREATE TRIGGER update_admin_roles_updated_at 
BEFORE UPDATE ON admin_roles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INSTRUCTIONS TO MAKE YOUR ACCOUNT SUPER ADMIN
-- =============================================

-- STEP 1: Find your user ID from Supabase Auth
-- Go to Supabase Dashboard → Authentication → Users
-- Copy your user ID

-- STEP 2: Insert your user profile (if not exists)
-- Replace 'YOUR_USER_ID' and 'YOUR_EMAIL' with your actual values
-- INSERT INTO user_profiles (id, email, full_name, onboarding_completed)
-- VALUES ('YOUR_USER_ID', 'YOUR_EMAIL', 'Your Name', true)
-- ON CONFLICT (id) DO NOTHING;

-- STEP 3: Make yourself a super admin
-- Replace 'YOUR_USER_ID' with your actual user ID
-- INSERT INTO admin_roles (user_id, role, permissions, is_active)
-- VALUES (
--     'YOUR_USER_ID',
--     'super_admin',
--     '{"can_upload": true, "can_delete": true, "can_manage_users": true, "can_manage_admins": true}',
--     true
-- );

-- =============================================
-- EXAMPLE: Add another super admin
-- =============================================

-- To add another user as super admin (must be done by existing super admin):
-- INSERT INTO admin_roles (user_id, role, permissions, granted_by, is_active)
-- VALUES (
--     'NEW_USER_ID',
--     'super_admin',
--     '{"can_upload": true, "can_delete": true, "can_manage_users": true, "can_manage_admins": true}',
--     'YOUR_USER_ID',  -- The super admin granting the role
--     true
-- );

-- =============================================
-- ROLE PERMISSIONS REFERENCE
-- =============================================

-- super_admin: Full access to everything
--   - Upload/edit/delete books
--   - Manage other admins
--   - View audit logs
--   - Manage all content

-- admin: Can manage content but not other admins
--   - Upload/edit books
--   - Manage categories
--   - View analytics

-- content_manager: Can upload and edit content
--   - Upload books
--   - Edit existing books
--   - Cannot delete

-- moderator: Can review and moderate content
--   - View all content
--   - Flag inappropriate content
--   - Cannot upload or delete
