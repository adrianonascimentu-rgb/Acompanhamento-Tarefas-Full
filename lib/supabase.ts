import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function sanitizeSupabaseUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return DEFAULT_SUPABASE_URL;
  let clean = url.trim();
  // Strip trailing slashes and common rest/v1, auth/v1, graphql/v1 suffixes if mistakenly provided
  clean = clean.replace(/\/(rest|auth|graphql|storage)\/v\d+\/?$/i, '');
  clean = clean.replace(/\/+$/, '');
  return clean || DEFAULT_SUPABASE_URL;
}

export function isValidSupabaseUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = sanitizeSupabaseUrl(url);
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
  try {
    const parsed = new URL(clean);
    return Boolean(parsed.hostname && parsed.hostname.includes('.'));
  } catch {
    return false;
  }
}

const DEFAULT_SUPABASE_URL = 'https://xzwjefuzmkcgdfzojeqp.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6d2plZnV6bWtjZ2Rmem9qZXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzM0NTQsImV4cCI6MjA4ODMwOTQ1NH0.ccZFPYa4Kv83wafQr8tOrdahi2Q07EAP5vEfzrm-wAE';
const DEFAULT_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6d2plZnV6bWtjZ2Rmem9qZXFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMzQ1NCwiZXhwIjoyMDg4MzA5NDU0fQ.hILu0aZCrlKFTsY6QXLmu1DjGH9mUNAjsui8WDqrGtQ';

export function getSafeSupabaseConfig() {
  let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !isValidSupabaseUrl(rawUrl) || rawUrl === 'sua_supabase_url_aqui' || rawUrl === 'https://placeholder-url.supabase.co') {
    rawUrl = DEFAULT_SUPABASE_URL;
  }

  // Ensure any mistakenly appended /rest/v1 or trailing slashes are cleanly removed
  rawUrl = sanitizeSupabaseUrl(rawUrl);

  if (!rawAnonKey || rawAnonKey === 'sua_supabase_anon_key_aqui' || rawAnonKey === 'placeholder-key' || rawAnonKey.length < 20) {
    rawAnonKey = DEFAULT_SUPABASE_ANON_KEY;
  }

  if (!rawServiceKey || rawServiceKey === 'sua_supabase_service_role_key_aqui' || rawServiceKey === 'placeholder-key' || rawServiceKey.length < 20) {
    rawServiceKey = DEFAULT_SUPABASE_SERVICE_KEY;
  }

  const isConfigured = Boolean(
    isValidSupabaseUrl(rawUrl) && 
    rawAnonKey && 
    rawAnonKey.length > 20
  );

  const supabaseUrl = rawUrl!;
  const supabaseAnonKey = rawAnonKey!;
  const supabaseServiceKey = rawServiceKey!;

  return { isConfigured, supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

export const isSupabaseConfigured = getSafeSupabaseConfig().isConfigured;

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  const { isConfigured, supabaseUrl, supabaseAnonKey } = getSafeSupabaseConfig();

  const authOptions = {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Custom storage wrapper bypassing navigator.locks to prevent "AbortError: Lock broken by another request with the 'steal' option"
    storage: typeof window !== 'undefined' ? {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {}
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    } : undefined
  };

  if (!isConfigured) {
    console.warn(
      'Supabase environment variables are missing or placeholders. Using mock/placeholder client.'
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, { auth: authOptions });
  return supabaseInstance;
};

export const supabase = getSupabase();

/**
 * Utility to detect and auto-recover from expired Supabase JWT tokens (PGRST303)
 */
export async function handleSupabaseAuthError(error: any): Promise<boolean> {
  if (!error) return false;

  const isJwtExpired = 
    error.code === 'PGRST303' || 
    error.message?.includes('JWT expired') || 
    error.message?.includes('jwt expired') ||
    error.message?.includes('invalid JWT') ||
    error.message?.includes('token is expired');

  if (isJwtExpired) {
    console.warn('[Supabase Auth] Sessão expirada (PGRST303 / JWT expired). Tentando auto-recuperação...');
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && data?.session) {
        console.log('[Supabase Auth] Token renovado com sucesso!');
        return true;
      }
      
      console.warn('[Supabase Auth] Não foi possível renovar o token. Limpando token expirado...');
      await supabase.auth.signOut().catch(() => {});
      if (typeof window !== 'undefined') {
        localStorage.removeItem('app_user_session');
      }
    } catch (err) {
      console.warn('[Supabase Auth] Erro ao tratar expiração de JWT:', err);
    }
  }

  return false;
}
