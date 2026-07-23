"use strict";

// 1. Pega aquí la URL de tu proyecto de Supabase.
const SUPABASE_URL = "https://dzeedkrcxzwlakezoctu.supabase.co";

// 2. Pega aquí la Publishable key (o anon key si tu proyecto aún usa claves antiguas).
// Nunca pegues una Secret key ni la service_role en archivos del navegador.
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_hHUHtyCiUE04Py6Q27p2Wg_cpAt2Tjm";

if (!window.supabase) {
    throw new Error("No se cargó la biblioteca de Supabase.");
}

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
