// Capa de datos: todo lo que habla con Supabase está aquí.
import { CONFIG } from './config.js';

export function configurada() {
  return /^https:\/\/.+/.test(CONFIG.SUPABASE_URL) &&
    !CONFIG.SUPABASE_URL.includes('TU-PROYECTO') &&
    !CONFIG.SUPABASE_ANON_KEY.includes('PEGA-AQUI');
}

export function createApi() {
  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'dm-sesion' },
  });

  const check = ({ data, error }) => { if (error) throw error; return data; };

  // Lee una tabla completa, de 1000 en 1000 filas.
  async function all(table) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const rows = check(await sb.from(table).select('*').order('id').range(from, from + 999));
      out.push(...rows);
      if (rows.length < 1000) return out;
    }
  }

  return {
    async session() { return check(await sb.auth.getSession()).session; },
    async login(password) {
      check(await sb.auth.signInWithPassword({ email: CONFIG.FAMILY_EMAIL, password }));
    },
    async logout() { await sb.auth.signOut(); },
    async changePassword(password) { check(await sb.auth.updateUser({ password })); },
    async loadAll() {
      const [A, E, L, S] = await Promise.all([
        all('activities'), all('events'), all('logs'),
        sb.from('settings').select('*').eq('id', 1).maybeSingle().then(check),
      ]);
      return { A, E, L, S };
    },
    async upsert(table, rows) {
      const list = Array.isArray(rows) ? rows : [rows];
      const out = [];
      for (let i = 0; i < list.length; i += 500) {
        out.push(...check(await sb.from(table).upsert(list.slice(i, i + 500)).select()));
      }
      return out;
    },
    async remove(table, id) { check(await sb.from(table).delete().eq('id', id)); },
    async saveSettings(patch) {
      return check(await sb.from('settings').update(patch).eq('id', 1).select().single());
    },
    async regenToken() { return check(await sb.rpc('regenerar_enlace')); },
    async vistaMadre(token) { return check(await sb.rpc('vista_madre', { p_token: token })); },
    subscribe(onChange, onStatus) {
      return sb.channel('dm-cambios')
        .on('postgres_changes', { event: '*', schema: 'public' }, onChange)
        .subscribe((status) => onStatus && onStatus(status));
    },
  };
}
