"use strict";

/* =====================================================
   DATOS PREDETERMINADOS
===================================================== */

const ST_DEFAULT_USER = {
    name: "Luis Alberto",
    email: "usuario@correo.com",
    password: "123456",
    phone: "614 123 4567",
    address: "Chihuahua, Chihuahua",
    container: "Breaking Waste #001"
};

const ST_DEFAULT_SETTINGS = {
    darkMode: false,
    notifications: true,
    showPercentage: true,
    sound: false
};


/* =====================================================
   INICIALIZAR DATOS
===================================================== */

function stInitializeData() {

    if (!localStorage.getItem("stUser")) {
        localStorage.setItem(
            "stUser",
            JSON.stringify(ST_DEFAULT_USER)
        );
    }

    if (!localStorage.getItem("stSettings")) {
        localStorage.setItem(
            "stSettings",
            JSON.stringify(ST_DEFAULT_SETTINGS)
        );
    }

}


/* =====================================================
   OBTENER ELEMENTOS DEL HTML
===================================================== */

const stLoginScreen =
    document.getElementById("stLoginScreen");

const stApplication =
    document.getElementById("stApplication");

const stLoginForm =
    document.getElementById("stLoginForm");

const stLoginEmail =
    document.getElementById("stLoginEmail");

const stLoginPassword =
    document.getElementById("stLoginPassword");

const stLoginMessage =
    document.getElementById("stLoginMessage");

const stUserMenuButton =
    document.getElementById("stUserMenuButton");

const stUserDropdown =
    document.getElementById("stUserDropdown");

const stLogoutButton =
    document.getElementById("stLogoutButton");

const stGoToEditButton =
    document.getElementById("stGoToEditButton");

const stEditProfileForm =
    document.getElementById("stEditProfileForm");

const stEditProfileMessage =
    document.getElementById("stEditProfileMessage");

const stSaveSettingsButton =
    document.getElementById("stSaveSettingsButton");

const stSettingsMessage =
    document.getElementById("stSettingsMessage");

const stNavigationButtons =
    document.querySelectorAll("[data-st-section]");

const stPageSections =
    document.querySelectorAll(".st-page-section");


/* =====================================================
   USUARIO Y CONFIGURACIÓN
===================================================== */

function stGetUser() {

    const savedUser =
        localStorage.getItem("stUser");

    if (!savedUser) {
        return { ...ST_DEFAULT_USER };
    }

    try {
        return JSON.parse(savedUser);
    } catch (error) {
        console.error(
            "No se pudo leer el usuario guardado:",
            error
        );

        return { ...ST_DEFAULT_USER };
    }

}


function stSaveUser(user) {

    localStorage.setItem(
        "stUser",
        JSON.stringify(user)
    );

}


function stGetSettings() {

    const savedSettings =
        localStorage.getItem("stSettings");

    if (!savedSettings) {
        return { ...ST_DEFAULT_SETTINGS };
    }

    try {
        return JSON.parse(savedSettings);
    } catch (error) {
        console.error(
            "No se pudo leer la configuración:",
            error
        );

        return { ...ST_DEFAULT_SETTINGS };
    }

}


function stSaveSettings(settings) {

    localStorage.setItem(
        "stSettings",
        JSON.stringify(settings)
    );

}


/* =====================================================
   MOSTRAR LOGIN O APLICACIÓN
===================================================== */

function stCheckSession() {

    const activeSession =
        localStorage.getItem("stActiveSession");

    if (activeSession === "true") {
        stShowApplication();
    } else {
        stShowLogin();
    }

}


function stShowLogin() {

    if (stApplication) {
        stApplication.classList.add("st-hidden");
    }

    if (stLoginScreen) {
        stLoginScreen.classList.remove("st-hidden");
    }

}


function stShowApplication() {

    if (stLoginScreen) {
        stLoginScreen.classList.add("st-hidden");
    }

    if (stApplication) {
        stApplication.classList.remove("st-hidden");
    }

    stUpdateUserInformation();
    stLoadSettings();
    stShowSection("stHomeSection");

}


/* =====================================================
   INICIAR SESIÓN
===================================================== */

if (stLoginForm) {

    stLoginForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const user = stGetUser();

            const enteredEmail =
                stLoginEmail.value.trim();

            const enteredPassword =
                stLoginPassword.value;

            const correctEmail =
                enteredEmail.toLowerCase() ===
                user.email.toLowerCase();

            const correctPassword =
                enteredPassword === user.password;

            if (correctEmail && correctPassword) {

                localStorage.setItem(
                    "stActiveSession",
                    "true"
                );

                stLoginMessage.textContent = "";

                stLoginForm.reset();

                stShowApplication();

            } else {

                stLoginMessage.textContent =
                    "El correo o la contraseña son incorrectos.";

            }

        }
    );

}


/* =====================================================
   CERRAR SESIÓN
===================================================== */

if (stLogoutButton) {

    stLogoutButton.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "stActiveSession"
            );

            if (stUserDropdown) {
                stUserDropdown.classList.add(
                    "st-hidden"
                );
            }

            stShowLogin();

        }
    );

}


/* =====================================================
   ABRIR Y CERRAR MENÚ
===================================================== */

if (stUserMenuButton) {

    stUserMenuButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            if (stUserDropdown) {
                stUserDropdown.classList.toggle(
                    "st-hidden"
                );
            }

        }
    );

}


document.addEventListener(
    "click",
    function (event) {

        const clickedInsideMenu =
            event.target.closest(
                ".st-user-menu-container"
            );

        if (!clickedInsideMenu && stUserDropdown) {
            stUserDropdown.classList.add(
                "st-hidden"
            );
        }

    }
);


/* =====================================================
   CAMBIAR ENTRE SECCIONES
===================================================== */

stNavigationButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const sectionId =
                    button.dataset.stSection;

                stShowSection(sectionId);

                if (stUserDropdown) {
                    stUserDropdown.classList.add(
                        "st-hidden"
                    );
                }

            }
        );

    }
);


function stShowSection(sectionId) {

    stPageSections.forEach(
        function (section) {

            section.classList.remove(
                "st-active-section"
            );

        }
    );

    const selectedSection =
        document.getElementById(sectionId);

    if (!selectedSection) {

        console.error(
            "No existe la sección:",
            sectionId
        );

        return;

    }

    selectedSection.classList.add(
        "st-active-section"
    );

    if (sectionId === "stEditProfileSection") {
        stFillEditForm();
    }

}


if (stGoToEditButton) {

    stGoToEditButton.addEventListener(
        "click",
        function () {

            stShowSection(
                "stEditProfileSection"
            );

        }
    );

}


/* =====================================================
   MOSTRAR INFORMACIÓN DEL USUARIO
===================================================== */

function stUpdateUserInformation() {

    const user = stGetUser();

    stSetText("stHeaderName", user.name);
    stSetText("stHeaderEmail", user.email);

    stSetText("stProfileName", user.name);
    stSetText("stProfileEmail", user.email);

    stSetText(
        "stInfoName",
        user.name || "No registrado"
    );

    stSetText(
        "stInfoEmail",
        user.email || "No registrado"
    );

    stSetText(
        "stInfoPhone",
        user.phone || "No registrado"
    );

    stSetText(
        "stInfoAddress",
        user.address || "No registrada"
    );

    stSetText(
        "stInfoContainer",
        user.container || "Sin contenedor"
    );

}


function stSetText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {
        element.textContent = value;
    }

}


/* =====================================================
   LLENAR FORMULARIO DE EDICIÓN
===================================================== */

function stFillEditForm() {

    const user = stGetUser();

    const editName =
        document.getElementById("stEditName");

    const editEmail =
        document.getElementById("stEditEmail");

    const editPhone =
        document.getElementById("stEditPhone");

    const editAddress =
        document.getElementById("stEditAddress");

    const editContainer =
        document.getElementById("stEditContainer");

    const editPassword =
        document.getElementById("stEditPassword");

    const confirmPassword =
        document.getElementById("stConfirmPassword");

    if (editName) {
        editName.value = user.name || "";
    }

    if (editEmail) {
        editEmail.value = user.email || "";
    }

    if (editPhone) {
        editPhone.value = user.phone || "";
    }

    if (editAddress) {
        editAddress.value = user.address || "";
    }

    if (editContainer) {
        editContainer.value = user.container || "";
    }

    if (editPassword) {
        editPassword.value = "";
    }

    if (confirmPassword) {
        confirmPassword.value = "";
    }

    if (stEditProfileMessage) {
        stEditProfileMessage.textContent = "";
    }

}


/* =====================================================
   GUARDAR PERFIL
===================================================== */

if (stEditProfileForm) {

    stEditProfileForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const user = stGetUser();

            const newName =
                document
                    .getElementById("stEditName")
                    .value
                    .trim();

            const newEmail =
                document
                    .getElementById("stEditEmail")
                    .value
                    .trim();

            const newPhone =
                document
                    .getElementById("stEditPhone")
                    .value
                    .trim();

            const newAddress =
                document
                    .getElementById("stEditAddress")
                    .value
                    .trim();

            const newContainer =
                document
                    .getElementById("stEditContainer")
                    .value
                    .trim();

            const newPassword =
                document
                    .getElementById("stEditPassword")
                    .value;

            const confirmedPassword =
                document
                    .getElementById("stConfirmPassword")
                    .value;


            if (newName === "" || newEmail === "") {

                stShowProfileMessage(
                    "El nombre y el correo son obligatorios.",
                    false
                );

                return;

            }


            if (newPassword !== confirmedPassword) {

                stShowProfileMessage(
                    "Las contraseñas no coinciden.",
                    false
                );

                return;

            }


            if (
                newPassword !== "" &&
                newPassword.length < 6
            ) {

                stShowProfileMessage(
                    "La contraseña debe tener al menos 6 caracteres.",
                    false
                );

                return;

            }


            user.name = newName;
            user.email = newEmail;
            user.phone = newPhone;
            user.address = newAddress;
            user.container = newContainer;


            if (newPassword !== "") {
                user.password = newPassword;
            }


            stSaveUser(user);
            stUpdateUserInformation();

            stShowProfileMessage(
                "Los cambios se guardaron correctamente.",
                true
            );


            document.getElementById(
                "stEditPassword"
            ).value = "";

            document.getElementById(
                "stConfirmPassword"
            ).value = "";

        }
    );

}


function stShowProfileMessage(message, success) {

    if (!stEditProfileMessage) {
        return;
    }

    stEditProfileMessage.textContent = message;

    stEditProfileMessage.style.color =
        success
            ? "#18865d"
            : "#d94d4d";

}


/* =====================================================
   CONFIGURACIÓN
===================================================== */

function stLoadSettings() {

    const settings = stGetSettings();

    const darkModeSetting =
        document.getElementById(
            "stDarkModeSetting"
        );

    const notificationsSetting =
        document.getElementById(
            "stNotificationsSetting"
        );

    const percentageSetting =
        document.getElementById(
            "stPercentageSetting"
        );

    const soundSetting =
        document.getElementById(
            "stSoundSetting"
        );


    if (darkModeSetting) {
        darkModeSetting.checked =
            settings.darkMode;
    }

    if (notificationsSetting) {
        notificationsSetting.checked =
            settings.notifications;
    }

    if (percentageSetting) {
        percentageSetting.checked =
            settings.showPercentage;
    }

    if (soundSetting) {
        soundSetting.checked =
            settings.sound;
    }

    stApplySettings(settings);

}


if (stSaveSettingsButton) {

    stSaveSettingsButton.addEventListener(
        "click",
        function () {

            const settings = {

                darkMode:
                    document.getElementById(
                        "stDarkModeSetting"
                    ).checked,

                notifications:
                    document.getElementById(
                        "stNotificationsSetting"
                    ).checked,

                showPercentage:
                    document.getElementById(
                        "stPercentageSetting"
                    ).checked,

                sound:
                    document.getElementById(
                        "stSoundSetting"
                    ).checked

            };

            stSaveSettings(settings);
            stApplySettings(settings);

            if (stSettingsMessage) {

                stSettingsMessage.textContent =
                    "Configuración guardada correctamente.";

                setTimeout(
                    function () {
                        stSettingsMessage.textContent = "";
                    },
                    2500
                );

            }

        }
    );

}


/* =====================================================
   APLICAR CONFIGURACIÓN
===================================================== */

function stApplySettings(settings) {

    document.body.classList.toggle(
        "st-dark-mode",
        settings.darkMode
    );

    /*
        Guardamos esta configuración para que
        sensor.html también pueda utilizarla.
    */

    localStorage.setItem(
        "stShowPercentage",
        String(settings.showPercentage)
    );

    localStorage.setItem(
        "stNotificationsEnabled",
        String(settings.notifications)
    );

    localStorage.setItem(
        "stSoundEnabled",
        String(settings.sound)
    );

}


/* =====================================================
   INICIAR APLICACIÓN
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        stInitializeData();
        stCheckSession();

    }
);