import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Company {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  subscription_plan: string;
  max_users: number;
  max_chips: number;
  max_queues: number;
  active: boolean;
}

interface CompanyContextType {
  currentCompany: Company | null;
  loading: boolean;
  refreshCompany: () => Promise<void>;
  canCreateUsers: () => Promise<boolean>;
  canCreateChips: () => Promise<boolean>;
  canCreateQueues: () => Promise<boolean>;
  getUserCount: () => Promise<number>;
  getChipCount: () => Promise<number>;
  getQueueCount: () => Promise<number>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = async () => {
    if (!(profile as any)?.company_id) {
      setCurrentCompany(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', (profile as any).company_id)
        .single();

      if (error) throw error;

      setCurrentCompany(data);
    } catch (error) {
      console.error('Error fetching company:', error);
      setCurrentCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshCompany = async () => {
    await fetchCompany();
  };

  const getUserCount = async (): Promise<number> => {
    if (!currentCompany) return 0;

    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('company_id', currentCompany.id);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting users:', error);
      return 0;
    }
  };

  const getChipCount = async (): Promise<number> => {
    if (!currentCompany) return 0;

    try {
      const { count, error } = await supabase
        .from('chips')
        .select('id', { count: 'exact' })
        .eq('company_id', currentCompany.id);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting chips:', error);
      return 0;
    }
  };

  const getQueueCount = async (): Promise<number> => {
    if (!currentCompany) return 0;

    try {
      const { count, error } = await supabase
        .from('queues')
        .select('id', { count: 'exact' })
        .eq('company_id', currentCompany.id);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting queues:', error);
      return 0;
    }
  };

  const canCreateUsers = async (): Promise<boolean> => {
    if (!currentCompany) return false;
    const count = await getUserCount();
    return count < currentCompany.max_users;
  };

  const canCreateChips = async (): Promise<boolean> => {
    if (!currentCompany) return false;
    const count = await getChipCount();
    return count < currentCompany.max_chips;
  };

  const canCreateQueues = async (): Promise<boolean> => {
    if (!currentCompany) return false;
    const count = await getQueueCount();
    return count < currentCompany.max_queues;
  };

  useEffect(() => {
    if (profile && (profile as any).company_id) {
      fetchCompany();
    } else {
      setCurrentCompany(null);
      setLoading(false);
    }
  }, [(profile as any)?.company_id]);

  const value = {
    currentCompany,
    loading,
    refreshCompany,
    canCreateUsers,
    canCreateChips,
    canCreateQueues,
    getUserCount,
    getChipCount,
    getQueueCount
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}