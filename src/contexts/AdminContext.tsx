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
        setLoading(false);
        return;
      }

      // Check admin roles using the RPC function
      const { data: roles, error } = await supabase
        .rpc('get_user_admin_roles', { user_uuid: user.id });

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setAdminRoles([]);
      } else {
        const roleNames = roles?.map((r: any) => r.role) || [];
        setAdminRoles(roleNames);
        setIsAdmin(roleNames.length > 0);
        setIsSuperAdmin(roleNames.includes('super_admin'));
      }
      
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkAdminStatus();
      }
    });

    return () => subscription.unsubscribe();
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