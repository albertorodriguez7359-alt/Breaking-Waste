"use strict";

(async function protectPage() {
    const client = window.supabaseClient;
    if (!client) {
        window.location.href = "index.html";
        return;
    }

    const { data } = await client.auth.getSession();
    if (!data.session) {
        window.location.href = "index.html";
    }
})();
