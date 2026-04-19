import { jwtDecode } from 'jwt-decode';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
import { createSupabaseAdminClient } from '../lib/supabase.js';
import type { UserPlan } from '../types/shared.js';
import { HttpError } from '../lib/http.js';

interface TokenPayload {
  plan?: UserPlan;
  storage_usage_bytes?: number;
  storage_purchased_bytes?: number;
}

const DEFAULT_STORAGE_QUOTA: Record<UserPlan, number> = {
  free: 500 * 1024 * 1024,
  plus: 5 * 1024 * 1024 * 1024,
  pro: 20 * 1024 * 1024 * 1024,
  purchase: 0,
};

const DEFAULT_DAILY_TRANSLATION_QUOTA: Record<UserPlan, number> = {
  free: 10 * 1024,
  plus: 100 * 1024,
  pro: 500 * 1024,
  purchase: 10 * 1024,
};

export const STORAGE_QUOTA_GRACE_BYTES = 10 * 1024 * 1024;

export interface AuthContext {
  user: { id: string };
  token: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

export const parseBearerToken = (authHeader: string | undefined | null) => {
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '').trim() || null;
};

export const validateUserAndToken = async (authHeader: string | undefined | null) => {
  const token = parseBearerToken(authHeader);
  if (!token) return {};

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return {};
  return { user, token };
};

export const requireAuthContext = (req: AuthenticatedRequest): AuthContext => {
  if (!req.auth?.user || !req.auth.token) {
    throw new HttpError(403, 'Not authenticated');
  }
  return req.auth;
};

export const getSubscriptionPlan = (token: string): UserPlan => {
  const data = jwtDecode<TokenPayload>(token) || {};
  return data['plan'] || 'free';
};

export const getStoragePlanData = (token: string) => {
  const data = jwtDecode<TokenPayload>(token) || {};
  const plan = data['plan'] || 'free';
  const usage = data['storage_usage_bytes'] || 0;
  const purchasedQuota = data['storage_purchased_bytes'] || 0;
  const planQuota =
    env.storageFixedQuota || DEFAULT_STORAGE_QUOTA[plan] || DEFAULT_STORAGE_QUOTA['free'];
  const quota = planQuota + purchasedQuota;

  return {
    plan,
    usage,
    quota,
  };
};

export const getDailyTranslationPlanData = (token: string) => {
  const data = jwtDecode<TokenPayload>(token) || {};
  const plan = data['plan'] || 'free';
  const quota =
    env.translationFixedQuota ||
    DEFAULT_DAILY_TRANSLATION_QUOTA[plan] ||
    DEFAULT_DAILY_TRANSLATION_QUOTA['free'];

  return {
    plan,
    quota,
  };
};

export const isUserAdmin = async (userId: string): Promise<boolean> => {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .single();
  return data?.is_admin === true;
};
