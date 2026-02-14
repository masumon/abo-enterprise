import { create } from 'zustand';
import apiClient from '../api/client';

export interface PlanInfo {
  tier: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  limits: Record<string, any>;
  is_current: boolean;
}

export interface SubscriptionInfo {
  tier: string;
  status: string;
  billing_cycle: string;
  messages_used_today: number;
  messages_used_this_month: number;
  tokens_used_this_month: number;
  limits: Record<string, any>;
  current_period_end: string | null;
}

export interface UsageInfo {
  messages_today: number;
  messages_month: number;
  tokens_month: number;
  daily_limit: number;
  monthly_limit: number;
  percentage_daily: number;
  percentage_monthly: number;
}

interface SubscriptionState {
  plans: PlanInfo[];
  current: SubscriptionInfo | null;
  usage: UsageInfo | null;
  isLoading: boolean;
  error: string | null;

  fetchPlans: () => Promise<void>;
  fetchCurrent: () => Promise<void>;
  fetchUsage: () => Promise<void>;
  upgrade: (tier: string, billing_cycle: string) => Promise<void>;
  cancel: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  plans: [],
  current: null,
  usage: null,
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    try {
      const { data } = await apiClient.get('/api/v1/subscriptions/plans');
      set({ plans: data });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to load plans' });
    }
  },

  fetchCurrent: async () => {
    try {
      const { data } = await apiClient.get('/api/v1/subscriptions/current');
      set({ current: data });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to load subscription' });
    }
  },

  fetchUsage: async () => {
    try {
      const { data } = await apiClient.get('/api/v1/subscriptions/usage');
      set({ usage: data });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to load usage' });
    }
  },

  upgrade: async (tier: string, billing_cycle: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/api/v1/subscriptions/upgrade', {
        tier,
        billing_cycle,
      });
      set({ current: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Upgrade failed', isLoading: false });
      throw err;
    }
  },

  cancel: async () => {
    set({ isLoading: true });
    try {
      await apiClient.post('/api/v1/subscriptions/cancel');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Cancel failed', isLoading: false });
    }
  },
}));
