# Super Admin Setup Guide for Shuspot

## Overview
This guide will help you set up a super admin role system where only designated super admins can upload books and content that appears to all users.

## Step 1: Run the Database Migration

1. **Go to your Supabase Dashboard**:
   - Visit [supabase.com](https://supabase.com)
   - Go to your Shuspot project
   - Navigate to **SQL Editor**

2. **Run the Admin Roles Migration**:
   - Copy the contents of `supabase-admin-roles.sql`
   - Paste it into the SQL Editor
   - Click **Run**

## Step 2: Make Your Account a Super Admin

1. **Find Your User ID**:
   - In Supabase Dashboard → **Authentication** → **Users**
   - Find your account and copy the **User ID** (UUID)

2. **Add Your Profile** (if not exists):
   ```sql
   INSERT INTO user_profiles (id, email, full_name, onboarding_completed)
   VALUES ('YOUR_USER_ID_HERE', 'your-email@example.com', 'Your Name', true)
   ON CONFLICT (id) DO NOTHING;
   ```

3. **Make Yourself Super Admin**:
   ```sql
   INSERT INTO admin_roles (user_id, role, permissions, is_active)
   VALUES (
       'YOUR_USER_ID_HERE',
       'super_admin',
       '{"can_upload": true, "can_delete": true, "can_manage_users": true, "can_manage_admins": true}',
       true
   );
   ```

## Step 3: Update Your Frontend Code

Add admin role checking to your React components:

### A. Create Admin Context

Create `src/contexts/AdminContext.tsx`:
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminContextType {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRoles: string[];
  loading: boolean;
  checkAdminStatus: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminRoles, setAdminRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setAdminRoles([]);
        return;
      }

      // Check admin roles
      const { data: roles, error } = await supabase
        .rpc('get_user_admin_roles', { user_uuid: user.id });

      if (error) {
        console.error('Error checking admin status:', error);
        return;
      }

      const roleNames = roles?.map((r: any) => r.role) || [];
      setAdminRoles(roleNames);
      setIsAdmin(roleNames.length > 0);
      setIsSuperAdmin(roleNames.includes('super_admin'));
      
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  return (
    <AdminContext.Provider value={{
      isAdmin,
      isSuperAdmin,
      adminRoles,
      loading,
      checkAdminStatus
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
```

### B. Wrap Your App

In `src/App.tsx`, wrap your app with the AdminProvider:
```typescript
import { AdminProvider } from './contexts/AdminContext';

// In your main App component:
return (
  <SubscriptionProvider>
    <AdminProvider>
      <UserStatsProvider>
        {/* Your existing app content */}
      </UserStatsProvider>
    </AdminProvider>
  </SubscriptionProvider>
);
```

### C. Add Admin Upload Component

Create `src/components/AdminUpload.tsx`:
```typescript
import React from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { Upload, Shield, Users, Settings } from 'lucide-react';

export default function AdminUpload() {
  const { isAdmin, isSuperAdmin, loading } = useAdmin();

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <Shield className="w-6 h-6" />
        <h2 className="text-xl font-bold">
          {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-white/20 hover:bg-white/30 p-4 rounded-lg transition-colors">
          <Upload className="w-8 h-8 mb-2" />
          <div className="font-semibold">Upload Books</div>
          <div className="text-sm opacity-90">Add new content</div>
        </button>
        
        <button className="bg-white/20 hover:bg-white/30 p-4 rounded-lg transition-colors">
          <Settings className="w-8 h-8 mb-2" />
          <div className="font-semibold">Manage Content</div>
          <div className="text-sm opacity-90">Edit existing books</div>
        </button>
        
        {isSuperAdmin && (
          <button className="bg-white/20 hover:bg-white/30 p-4 rounded-lg transition-colors">
            <Users className="w-8 h-8 mb-2" />
            <div className="font-semibold">Manage Admins</div>
            <div className="text-sm opacity-90">Add/remove admins</div>
          </button>
        )}
      </div>
    </div>
  );
}
```

### D. Add to Your Main Dashboard

In your main dashboard component, add:
```typescript
import AdminUpload from './AdminUpload';

// In your dashboard render:
return (
  <div>
    <AdminUpload />
    {/* Your existing dashboard content */}
  </div>
);
```

## Step 4: Restrict Upload Functionality

Update your existing upload components to check admin status:

```typescript
import { useAdmin } from '../contexts/AdminContext';

function YourUploadComponent() {
  const { isAdmin } = useAdmin();
  
  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Only administrators can upload content.</p>
      </div>
    );
  }
  
  // Your existing upload UI
}
```

## Step 5: Add More Super Admins

To add another user as super admin:

1. **Get their User ID** from Supabase Authentication
2. **Run this SQL** (replace with actual IDs):
   ```sql
   INSERT INTO admin_roles (user_id, role, permissions, granted_by, is_active)
   VALUES (
       'NEW_USER_ID_HERE',
       'super_admin',
       '{"can_upload": true, "can_delete": true, "can_manage_users": true, "can_manage_admins": true}',
       'YOUR_USER_ID_HERE',
       true
   );
   ```

## Admin Role Types

- **super_admin**: Full access (upload, delete, manage other admins)
- **admin**: Can upload and manage content (no admin management)
- **content_manager**: Can upload books only
- **moderator**: Can review content only

## Security Features

✅ **Row Level Security**: Users can only see their own data
✅ **Admin-only uploads**: Only admins can add books
✅ **Audit logging**: All admin actions are tracked
✅ **Role expiration**: Roles can have expiry dates
✅ **Permission granularity**: Fine-grained permissions per role

## Testing

1. **Log in with your account**
2. **Check if admin panel appears**
3. **Try uploading content**
4. **Verify other users cannot upload**

## Troubleshooting

### Admin panel not showing?
- Check if you ran the SQL migration
- Verify your user ID in the admin_roles table
- Check browser console for errors

### Upload still not working?
- Ensure RLS policies are applied
- Check Supabase logs for permission errors
- Verify your user is authenticated

### Need to remove admin access?
```sql
UPDATE admin_roles 
SET is_active = false 
WHERE user_id = 'USER_ID_TO_REMOVE';
```

## Next Steps

1. Run the database migration
2. Make yourself super admin
3. Update your frontend code
4. Test the functionality
5. Add other super admins as needed

Your uploaded books will now appear to all users, but only you and designated super admins can upload new content!