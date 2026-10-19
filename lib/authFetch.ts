import { supabase } from '@/lib/supabase';

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const options = init ? { ...init } : {};
  const headers = new Headers(options.headers || {});

  try {
    let session: any = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session;

      // Se a sessão expirou ou está para expirar nos próximos 60s, tentar renovar
      if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)) {
        const refreshResult = await supabase.auth.refreshSession();
        if (refreshResult.data?.session) {
          session = refreshResult.data.session;
        }
      }
    } catch (e) {
      console.warn('[authFetch] Aviso ao renovar sessão:', e);
    }

    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    // Sempre incluir x-user-session para suporte contínuo de sessão autenticada
    if (typeof window !== 'undefined') {
      const localUser = localStorage.getItem('app_user_session');
      if (localUser && !headers.has('x-user-session')) {
        headers.set('x-user-session', localUser);
      }
    }
  } catch (err) {
    console.warn('[authFetch] Erro ao obter credenciais de sessão:', err);
  }

  options.headers = headers;
  return fetch(input, options);
}

export function installAuthFetch() {
  if (typeof window === 'undefined' || (window as any).__authFetchInstalled) return;
  (window as any).__authFetchInstalled = true;

  const originalFetch = window.fetch ? window.fetch.bind(window) : fetch.bind(window);

  const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url && typeof url === 'string' && url.startsWith('/api/') && !/^\/api\/[^/]+\/webhook/.test(url)) {
      try {
        const headers = new Headers(init?.headers);

        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${data.session.access_token}`);
          }
        }

        const localUser = localStorage.getItem('app_user_session');
        if (localUser && !headers.has('x-user-session')) {
          headers.set('x-user-session', localUser);
        }

        return originalFetch(input, { ...init, headers });
      } catch (err) {
        console.warn('Error attaching token in installAuthFetch:', err);
      }
    }

    return originalFetch(input, init);
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true,
    });
  } catch (err) {
    try {
      (window as any).fetch = customFetch;
    } catch (e) {
      console.warn('Could not intercept window.fetch:', e);
    }
  }
}
