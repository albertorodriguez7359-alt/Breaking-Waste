"use strict";

const db = window.supabaseClient;
let stCurrentUser = null;
let stCurrentProfile = null;

const $ = (id) => document.getElementById(id);

const stLoginScreen = $("stLoginScreen");
const stApplication = $("stApplication");
const stLoginForm = $("stLoginForm");
const stRegisterForm = $("stRegisterForm");
const stLoginMessage = $("stLoginMessage");
const stRegisterMessage = $("stRegisterMessage");
const stUserDropdown = $("stUserDropdown");
const stPageSections = document.querySelectorAll(".st-page-section");
const stNavigationButtons = document.querySelectorAll("[data-st-section]");

function stSetMessage(element, message, success = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("st-success-message", success);
    element.classList.toggle("st-error-message", !success);
}

function stShowLoginForm() {
    stLoginForm?.classList.remove("st-hidden");
    stRegisterForm?.classList.add("st-hidden");
    $("stShowRegisterButton")?.classList.remove("st-hidden");
    stSetMessage(stLoginMessage, "");
    stSetMessage(stRegisterMessage, "");
}

function stShowRegisterForm() {
    stLoginForm?.classList.add("st-hidden");
    stRegisterForm?.classList.remove("st-hidden");
    $("stShowRegisterButton")?.classList.add("st-hidden");
    stSetMessage(stLoginMessage, "");
    stSetMessage(stRegisterMessage, "");
}

function stShowLoginScreen() {
    stApplication?.classList.add("st-hidden");
    stLoginScreen?.classList.remove("st-hidden");
    stShowLoginForm();
}

async function stShowApplication(user) {
    stCurrentUser = user;
    await stLoadProfile();
    stLoginScreen?.classList.add("st-hidden");
    stApplication?.classList.remove("st-hidden");
    stShowSection("stHomeSection");
}

async function stLoadProfile() {
    if (!stCurrentUser) return;

    const { data, error } = await db
        .from("profiles")
        .select("id, full_name, email, phone, address, container_name, dark_mode, notifications, show_percentage, sound")
        .eq("id", stCurrentUser.id)
        .single();

    if (error) {
        console.error("No se pudo cargar el perfil:", error);
        return;
    }

    stCurrentProfile = data;
    stUpdateUserInformation();
    stApplySettings(data);
}

function stUpdateUserInformation() {
    const profile = stCurrentProfile || {};
    const name = profile.full_name || "Usuario";
    const email = profile.email || stCurrentUser?.email || "";

    stSetText("stHeaderName", name);
    stSetText("stHeaderEmail", email);
    stSetText("stProfileName", name);
    stSetText("stProfileEmail", email);
    stSetText("stInfoName", profile.full_name || "No registrado");
    stSetText("stInfoEmail", email || "No registrado");
    stSetText("stInfoPhone", profile.phone || "No registrado");
    stSetText("stInfoAddress", profile.address || "No registrada");
    stSetText("stInfoContainer", profile.container_name || "Sin contenedor");
}

function stSetText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
}

function stShowSection(sectionId) {
    stPageSections.forEach((section) => section.classList.remove("st-active-section"));
    const section = $(sectionId);
    if (!section) return;
    section.classList.add("st-active-section");
    if (sectionId === "stEditProfileSection") stFillEditForm();
}

function stFillEditForm() {
    const profile = stCurrentProfile || {};
    if ($("stEditName")) $("stEditName").value = profile.full_name || "";
    if ($("stEditEmail")) $("stEditEmail").value = profile.email || stCurrentUser?.email || "";
    if ($("stEditPhone")) $("stEditPhone").value = profile.phone || "";
    if ($("stEditAddress")) $("stEditAddress").value = profile.address || "";
    if ($("stEditContainer")) $("stEditContainer").value = profile.container_name || "";
    if ($("stEditPassword")) $("stEditPassword").value = "";
    if ($("stConfirmPassword")) $("stConfirmPassword").value = "";
    stSetMessage($("stEditProfileMessage"), "", true);
}

function stApplySettings(profile) {
    const darkMode = Boolean(profile?.dark_mode);
    document.body.classList.toggle("st-dark-mode", darkMode);

    if ($("stDarkModeSetting")) $("stDarkModeSetting").checked = darkMode;
    if ($("stNotificationsSetting")) $("stNotificationsSetting").checked = profile?.notifications !== false;
    if ($("stPercentageSetting")) $("stPercentageSetting").checked = profile?.show_percentage !== false;
    if ($("stSoundSetting")) $("stSoundSetting").checked = Boolean(profile?.sound);

    localStorage.setItem("stShowPercentage", String(profile?.show_percentage !== false));
    localStorage.setItem("stNotificationsEnabled", String(profile?.notifications !== false));
    localStorage.setItem("stSoundEnabled", String(Boolean(profile?.sound)));
}

$("stShowRegisterButton")?.addEventListener("click", stShowRegisterForm);
$("stShowLoginButton")?.addEventListener("click", stShowLoginForm);

stLoginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    stSetMessage(stLoginMessage, "Iniciando sesión...", true);

    const email = $("stLoginEmail").value.trim();
    const password = $("stLoginPassword").value;

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        stSetMessage(stLoginMessage, "Correo o contraseña incorrectos.");
        return;
    }

    stLoginForm.reset();
    await stShowApplication(data.user);
});

stRegisterForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = $("stRegisterName").value.trim();
    const email = $("stRegisterEmail").value.trim();
    const phone = $("stRegisterPhone").value.trim();
    const address = $("stRegisterAddress").value.trim();
    const containerName = $("stRegisterContainer").value.trim();
    const password = $("stRegisterPassword").value;
    const confirmPassword = $("stRegisterConfirmPassword").value;

    if (password !== confirmPassword) {
        stSetMessage(stRegisterMessage, "Las contraseñas no coinciden.");
        return;
    }

    stSetMessage(stRegisterMessage, "Creando cuenta...", true);

    const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                phone,
                address,
                container_name: containerName
            }
        }
    });

    if (error) {
        stSetMessage(stRegisterMessage, error.message);
        return;
    }

    stRegisterForm.reset();

    if (data.session && data.user) {
        await stShowApplication(data.user);
    } else {
        stSetMessage(
            stRegisterMessage,
            "Cuenta creada. Revisa tu correo para confirmar la cuenta y después inicia sesión.",
            true
        );
    }
});

$("stLogoutButton")?.addEventListener("click", async () => {
    await db.auth.signOut();
    stCurrentUser = null;
    stCurrentProfile = null;
    stShowLoginScreen();
});

$("stUserMenuButton")?.addEventListener("click", (event) => {
    event.stopPropagation();
    stUserDropdown?.classList.toggle("st-hidden");
});

document.addEventListener("click", (event) => {
    if (!event.target.closest(".st-user-menu-container")) {
        stUserDropdown?.classList.add("st-hidden");
    }
});

stNavigationButtons.forEach((button) => {
    button.addEventListener("click", () => {
        stShowSection(button.dataset.stSection);
        stUserDropdown?.classList.add("st-hidden");
    });
});

$("stGoToEditButton")?.addEventListener("click", () => stShowSection("stEditProfileSection"));

$("stEditProfileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("stEditProfileMessage");

    const fullName = $("stEditName").value.trim();
    const email = $("stEditEmail").value.trim();
    const phone = $("stEditPhone").value.trim();
    const address = $("stEditAddress").value.trim();
    const containerName = $("stEditContainer").value.trim();
    const password = $("stEditPassword").value;
    const confirmPassword = $("stConfirmPassword").value;

    if (password && password !== confirmPassword) {
        stSetMessage(message, "Las contraseñas no coinciden.");
        return;
    }

    stSetMessage(message, "Guardando cambios...", true);

    const authChanges = {};
    if (email !== stCurrentUser.email) authChanges.email = email;
    if (password) authChanges.password = password;

    if (Object.keys(authChanges).length > 0) {
        const { error: authError } = await db.auth.updateUser(authChanges);
        if (authError) {
            stSetMessage(message, authError.message);
            return;
        }
    }

    const { error } = await db
        .from("profiles")
        .update({
            full_name: fullName,
            email,
            phone,
            address,
            container_name: containerName,
            updated_at: new Date().toISOString()
        })
        .eq("id", stCurrentUser.id);

    if (error) {
        stSetMessage(message, error.message);
        return;
    }

    const { data: userData } = await db.auth.getUser();
    stCurrentUser = userData.user;
    await stLoadProfile();
    stSetMessage(message, "Perfil actualizado correctamente.", true);
});

$("stSaveSettingsButton")?.addEventListener("click", async () => {
    const message = $("stSettingsMessage");
    const settings = {
        dark_mode: $("stDarkModeSetting")?.checked || false,
        notifications: $("stNotificationsSetting")?.checked ?? true,
        show_percentage: $("stPercentageSetting")?.checked ?? true,
        sound: $("stSoundSetting")?.checked || false,
        updated_at: new Date().toISOString()
    };

    const { error } = await db
        .from("profiles")
        .update(settings)
        .eq("id", stCurrentUser.id);

    if (error) {
        stSetMessage(message, error.message);
        return;
    }

    stCurrentProfile = { ...stCurrentProfile, ...settings };
    stApplySettings(stCurrentProfile);
    stSetMessage(message, "Configuración guardada.", true);
});

async function stInitializeApplication() {
    const { data, error } = await db.auth.getSession();
    if (error) console.error(error);

    if (data.session?.user) {
        await stShowApplication(data.session.user);
    } else {
        stShowLoginScreen();
    }

    db.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
            stShowLoginScreen();
        }
    });
}

document.addEventListener("DOMContentLoaded", stInitializeApplication);
