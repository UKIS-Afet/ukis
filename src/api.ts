export const api = {
  get: async (path: string) => {
    try {
      const separator = path.includes('?') ? '&' : '?';
      const res = await fetch(`/api${path}${separator}_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const text = await res.text();
      if (!res.ok) {
        let err;
        try { err = JSON.parse(text); } catch (e) { throw new Error(`HTTP ${res.status}`); }
        throw new Error(err.error || err.message || 'Bir hata oluştu');
      }
      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error(`[API] GET ${path} returned HTML. Server might be restarting.`);
      }
      try { return JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON on GET ${path}`); }
    } catch (error: any) {
      if (error?.message !== 'Session not found') {
        console.warn(`[API] GET ${path} failed:`, error);
      }
      throw error;
    }
  },
  post: async (path: string, body: any) => {
    try {
      const res = await fetch(`/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      if (!res.ok) {
        let err;
        try { err = JSON.parse(text); } catch (e) { throw new Error(`HTTP ${res.status}`); }
        throw new Error(err.error || err.message || 'Bir hata oluştu');
      }
      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error(`[API] POST ${path} returned HTML. Server might be restarting.`);
      }
      try { return JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON on POST ${path}`); }
    } catch (error) {
      console.warn(`[API] POST ${path} failed:`, error);
      throw error;
    }
  },
  postForm: async (path: string, body: FormData) => {
    try {
      const res = await fetch(`/api${path}`, {
        method: 'POST',
        body: body
      });
      const text = await res.text();
      if (!res.ok) {
        let err;
        try { err = JSON.parse(text); } catch (e) { throw new Error(`HTTP ${res.status}`); }
        throw new Error(err.error || err.message || 'Bir hata oluştu');
      }
      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error(`[API] POST ${path} returned HTML. Server might be restarting.`);
      }
      try { return JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON on POST ${path}`); }
    } catch (error) {
      console.warn(`[API] POST ${path} failed:`, error);
      throw error;
    }
  },
  put: async (path: string, body: any) => {
    try {
      const res = await fetch(`/api${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      if (!res.ok) {
        let err;
        try { err = JSON.parse(text); } catch (e) { throw new Error(`HTTP ${res.status}`); }
        throw new Error(err.error || err.message || 'Bir hata oluştu');
      }
      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error(`[API] PUT ${path} returned HTML. Server might be restarting.`);
      }
      try { return JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON on PUT ${path}`); }
    } catch (error) {
      console.warn(`[API] PUT ${path} failed:`, error);
      throw error;
    }
  },
  delete: async (path: string) => {
    try {
      const res = await fetch(`/api${path}`, { method: 'DELETE' });
      const text = await res.text();
      if (!res.ok) {
        let err;
        try { err = JSON.parse(text); } catch (e) { throw new Error(`HTTP ${res.status}`); }
        throw new Error(err.error || err.message || 'Bir hata oluştu');
      }
      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error(`[API] DELETE ${path} returned HTML. Server might be restarting.`);
      }
      try { return JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON on DELETE ${path}`); }
    } catch (error) {
      console.warn(`[API] DELETE ${path} failed:`, error);
      throw error;
    }
  }
};

