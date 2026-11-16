// =====================================================================
//  DESPIERTA MARUJA · Configuración
//  Este es el ÚNICO archivo que tienes que editar (ver README, paso 4).
//  Estos datos son públicos por diseño: no pongas aquí nunca la clave
//  "service_role" / "secret" de Supabase.
// =====================================================================

export const CONFIG = {
  // Supabase → Project Settings → API (o "Data API") → Project URL
  SUPABASE_URL: 'https://qdatnjyaykeafzbyecwu.supabase.co',

  // Supabase → Project Settings → API Keys → "Publishable key"
  // (en proyectos antiguos se llama "anon public")
  SUPABASE_ANON_KEY: 'sb_publishable_89A48xyge8IZ-5lYWec7iA_8JTMRyYA',

  // El email con el que creaste el usuario familiar en
  // Authentication → Users → Add user. Las hermanas no lo ven nunca:
  // la app solo pide la contraseña.
  FAMILY_EMAIL: 'familia@despierta-maruja.es',
};
