"use strict";

/* =====================================================
   CONFIGURACIÓN DEL ESP32
===================================================== */

/*
    Dirección IP del ESP32.

    Cambia únicamente esta dirección cuando el
    monitor serial muestre una IP diferente.
*/

const ESP32 = "http://192.168.0.26";

/*
    Ruta que utiliza el servidor web del ESP32.
*/

const RUTA_ESTADO = "/estado";

/*
    Tiempo entre cada consulta.
*/

const TIEMPO_ACTUALIZACION = 1000;

/*
    Tiempo máximo de espera antes de cancelar
    la petición.
*/

const TIEMPO_MAXIMO_RESPUESTA = 3000;


/* =====================================================
   VARIABLES GLOBALES
===================================================== */

let consultaEnProceso = false;

let alertaMostrada = false;

let ultimaLecturaGuardada = null;
let ultimoGuardadoSensor = 0;
const INTERVALO_GUARDADO_SENSOR = 30000;

/* =====================================================
   OBTENER INFORMACIÓN DEL ESP32
===================================================== */

async function actualizarSensor() {

    /*
        Evita hacer dos consultas al mismo tiempo.
    */

    if (consultaEnProceso) {

        return;

    }

    consultaEnProceso = true;


    /*
        Control para cancelar la petición si tarda
        demasiado.
    */

    const controlador = new AbortController();

    const temporizador = setTimeout(

        function () {

            controlador.abort();

        },

        TIEMPO_MAXIMO_RESPUESTA

    );


    try {

        /*
            Solicitar información al ESP32.
        */

        const respuesta = await fetch(

            ESP32 + RUTA_ESTADO,

            {

                method: "GET",

                cache: "no-store",

                signal: controlador.signal

            }

        );


        /*
            Verificar que respondió correctamente.
        */

        if (!respuesta.ok) {

            throw new Error(

                "El ESP32 respondió con el código HTTP " +

                respuesta.status

            );

        }


        /*
            Convertir la respuesta a JSON.
        */

        const datos = await respuesta.json();


        console.log(

            "Datos recibidos del ESP32:",

            datos

        );


        /*
            Convertir la información al formato
            utilizado por la aplicación.
        */

        const datosProcesados =

            procesarDatosESP32(datos);


        /*
            Actualizar el monitor.
        */

        actualizarMonitorContenedor(

            datosProcesados.porcentaje,

            datosProcesados.sensor50,

            datosProcesados.sensor90,

            true

        );

        /* Guardar la lectura en Supabase cuando cambia o cada 30 segundos. */
        await guardarLecturaEnSupabase(datosProcesados, true);


        /*
            Aplicar la configuración guardada.
        */

        aplicarConfiguracionSensor(

            datosProcesados.porcentaje

        );

    }

    catch (error) {

        /*
            Si ocurre algún error.
        */

        if (error.name === "AbortError") {

            console.error(

                "El ESP32 tardó demasiado en responder."

            );

        }

        else {

            console.error(

                "No fue posible conectarse con el ESP32:",

                error

            );

        }


        /*
            Mostrar estado desconectado.
        */

        actualizarMonitorContenedor(

            0,

            false,

            false,

            false

        );

    }

    finally {

        clearTimeout(

            temporizador

        );

        consultaEnProceso = false;

    }

}


/* =====================================================
   GUARDAR LECTURAS EN SUPABASE
===================================================== */

async function guardarLecturaEnSupabase(datos, conectado) {

    if (!window.supabaseClient) return;

    const ahora = Date.now();
    const firma = `${datos.porcentaje}-${datos.sensor50}-${datos.sensor90}-${conectado}`;
    const cambio = firma !== ultimaLecturaGuardada;
    const vencioIntervalo = ahora - ultimoGuardadoSensor >= INTERVALO_GUARDADO_SENSOR;

    if (!cambio && !vencioIntervalo) return;

    const { data: sessionData } = await window.supabaseClient.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;

    const { data: profile } = await window.supabaseClient
        .from("profiles")
        .select("container_name")
        .eq("id", user.id)
        .single();

    const { error } = await window.supabaseClient
        .from("sensor_readings")
        .insert({
            user_id: user.id,
            container_name: profile?.container_name || "",
            percentage: convertirPorcentaje(datos.porcentaje),
            sensor_50: Boolean(datos.sensor50),
            sensor_90: Boolean(datos.sensor90),
            connected: Boolean(conectado)
        });

    if (error) {
        console.error("No se pudo guardar la lectura en Supabase:", error);
        return;
    }

    ultimaLecturaGuardada = firma;
    ultimoGuardadoSensor = ahora;
}

/* =====================================================
   PROCESAR LOS DATOS RECIBIDOS
===================================================== */

function procesarDatosESP32(datos) {

    /*
        Formato recomendado que puede enviar el ESP32:

        {
            "porcentaje": 50,
            "sensor50": true,
            "sensor90": false
        }

        También admite el formato anterior:

        {
            "estado": "Objeto detectado"
        }
    */

    let porcentaje = 0;
    let sensor50 = false;
    let sensor90 = false;


    /* -------------------------------------------------
       REVISAR SI LLEGA EL PORCENTAJE
    -------------------------------------------------- */

    if (datos.porcentaje !== undefined) {

        porcentaje = convertirPorcentaje(

            datos.porcentaje

        );

    }


    /* -------------------------------------------------
       REVISAR EL SENSOR DEL 50 %
    -------------------------------------------------- */

    if (datos.sensor50 !== undefined) {

        sensor50 = convertirBooleano(

            datos.sensor50

        );

    }


    /* -------------------------------------------------
       REVISAR EL SENSOR DEL 90 %
    -------------------------------------------------- */

    if (datos.sensor90 !== undefined) {

        sensor90 = convertirBooleano(

            datos.sensor90

        );

    }


    /* -------------------------------------------------
       COMPATIBILIDAD CON EL FORMATO ANTERIOR
    -------------------------------------------------- */

    if (

        datos.estado !== undefined &&

        datos.porcentaje === undefined

    ) {

        /*
            Si solo se recibe "estado", se considera
            como el sensor ubicado al 50 %.
        */

        sensor50 = interpretarEstado(

            datos.estado

        );

        sensor90 = false;


        porcentaje = sensor50

            ? 50

            : 0;

    }


    /* -------------------------------------------------
       CALCULAR PORCENTAJE USANDO LOS SENSORES
    -------------------------------------------------- */

    if (datos.porcentaje === undefined) {

        if (sensor90) {

            porcentaje = 90;

        }

        else if (sensor50) {

            porcentaje = 50;

        }

        else {

            porcentaje = 0;

        }

    }


    /*
        Si el sensor del 90 % detecta residuos,
        se considera que el nivel del 50 % también
        ya fue alcanzado.
    */

    if (sensor90) {

        sensor50 = true;

    }


    return {

        porcentaje: porcentaje,

        sensor50: sensor50,

        sensor90: sensor90

    };

}


/* =====================================================
   CONVERTIR PORCENTAJE
===================================================== */

function convertirPorcentaje(valor) {

    /*
        Convierte los siguientes valores:

        50
        "50"
        "50%"
    */

    const numero = Number(

        String(valor)

            .replace("%", "")

            .trim()

    );


    /*
        Si el dato no es un número válido,
        regresar cero.
    */

    if (!Number.isFinite(numero)) {

        return 0;

    }


    /*
        Limitar el valor entre 0 y 100.
    */

    return Math.max(

        0,

        Math.min(

            100,

            numero

        )

    );

}


/* =====================================================
   CONVERTIR VALORES A VERDADERO O FALSO
===================================================== */

function convertirBooleano(valor) {

    /*
        Esta función admite:

        true
        false
        1
        0
        "true"
        "false"
        "detectado"
        "sin detectar"
    */


    /*
        Si ya es un booleano.
    */

    if (typeof valor === "boolean") {

        return valor;

    }


    /*
        Si es un número.
    */

    if (typeof valor === "number") {

        return valor === 1;

    }


    /*
        Convertir a texto para poder compararlo.
    */

    const texto = String(valor)

        .trim()

        .toLowerCase();


    const valoresVerdaderos = [

        "true",

        "1",

        "detectado",

        "objeto",

        "objeto detectado",

        "lleno",

        "activo",

        "on"

    ];


    return valoresVerdaderos.includes(

        texto

    );

}


/* =====================================================
   INTERPRETAR EL CAMPO ESTADO
===================================================== */

function interpretarEstado(estado) {

    const texto = String(estado)

        .trim()

        .toLowerCase();


    /*
        Palabras que significan que hay detección.
    */

    const estadosDetectados = [

        "objeto",

        "objeto detectado",

        "detectado",

        "lleno",

        "ocupado",

        "true",

        "1"

    ];


    /*
        Palabras que significan que no hay detección.
    */

    const estadosSinDeteccion = [

        "sin objeto",

        "sin detectar",

        "no detectado",

        "vacio",

        "vacío",

        "false",

        "0"

    ];


    if (estadosDetectados.includes(texto)) {

        return true;

    }


    if (estadosSinDeteccion.includes(texto)) {

        return false;

    }


    /*
        Si llega una palabra desconocida.
    */

    console.warn(

        "Estado recibido no reconocido:",

        estado

    );


    return false;

}
/* =====================================================
   ACTUALIZAR MONITOR DEL CONTENEDOR
===================================================== */

function actualizarMonitorContenedor(
    porcentaje,
    sensor50,
    sensor90,
    conectado = true
) {

    const porcentajeElemento =
        document.getElementById("porcentaje");

    const barraProgreso =
        document.getElementById("barraProgreso");

    const estadoContenedor =
        document.getElementById("estadoContenedor");

    const estadoSensor50 =
        document.getElementById("estadoSensor50");

    const estadoSensor90 =
        document.getElementById("estadoSensor90");

    const estadoConexion =
        document.getElementById("estadoConexion");

    const ultimaActualizacion =
        document.getElementById(
            "ultimaActualizacion"
        );


    /*
        Convertir y limitar el porcentaje
        entre 0 y 100.
    */

    porcentaje = convertirPorcentaje(
        porcentaje
    );


    /* -------------------------------------------------
       ACTUALIZAR EL PORCENTAJE
    -------------------------------------------------- */

    if (porcentajeElemento) {

        porcentajeElemento.textContent =
            conectado
                ? porcentaje + "%"
                : "--%";

    }


    /* -------------------------------------------------
       ACTUALIZAR LA BARRA DE PROGRESO
    -------------------------------------------------- */

    if (barraProgreso) {

        barraProgreso.style.width =
            conectado
                ? porcentaje + "%"
                : "0%";


        /*
            Cambiar el color según el nivel.
        */

        if (!conectado) {

            barraProgreso.style.backgroundColor =
                "#8b9691";

        }

        else if (porcentaje >= 90) {

            barraProgreso.style.backgroundColor =
                "#d94d4d";

        }

        else if (porcentaje >= 50) {

            barraProgreso.style.backgroundColor =
                "#e2a72e";

        }

        else {

            barraProgreso.style.backgroundColor =
                "#18865d";

        }

    }


    /* -------------------------------------------------
       ACTUALIZAR EL ESTADO GENERAL
    -------------------------------------------------- */

    if (estadoContenedor) {

        if (!conectado) {

            estadoContenedor.textContent =
                "Sin conexión";

            estadoContenedor.style.color =
                "#c23b3b";

        }

        else if (porcentaje >= 90) {

            estadoContenedor.textContent =
                "Contenedor casi lleno";

            estadoContenedor.style.color =
                "#d94d4d";

        }

        else if (porcentaje >= 50) {

            estadoContenedor.textContent =
                "Contenedor a media capacidad";

            estadoContenedor.style.color =
                "#c08718";

        }

        else {

            estadoContenedor.textContent =
                "Nivel bajo";

            estadoContenedor.style.color =
                "#18865d";

        }

    }


    /* -------------------------------------------------
       ACTUALIZAR SENSOR DEL 50 %
    -------------------------------------------------- */

    actualizarEstadoSensor(
        estadoSensor50,
        sensor50,
        conectado
    );


    /* -------------------------------------------------
       ACTUALIZAR SENSOR DEL 90 %
    -------------------------------------------------- */

    actualizarEstadoSensor(
        estadoSensor90,
        sensor90,
        conectado
    );


    /* -------------------------------------------------
       ACTUALIZAR EL ESTADO DE CONEXIÓN
    -------------------------------------------------- */

    if (estadoConexion) {

        estadoConexion.textContent =
            conectado
                ? "Conectado"
                : "Desconectado";

        estadoConexion.style.color =
            conectado
                ? "#18865d"
                : "#c23b3b";

    }


    /* -------------------------------------------------
       MOSTRAR FECHA Y HORA
    -------------------------------------------------- */

    if (ultimaActualizacion) {

        ultimaActualizacion.textContent =
            conectado
                ? new Date().toLocaleString(
                    "es-MX",
                    {
                        dateStyle: "short",
                        timeStyle: "medium"
                    }
                )
                : "No se reciben datos del ESP32";

    }

}


/* =====================================================
   ACTUALIZAR APARIENCIA DE CADA SENSOR
===================================================== */

function actualizarEstadoSensor(
    elemento,
    detectado,
    conectado
) {

    /*
        Si el elemento no existe en el HTML,
        salir de la función.
    */

    if (!elemento) {

        return;

    }


    /*
        Si no hay conexión con el ESP32.
    */

    if (!conectado) {

        elemento.textContent =
            "Sin conexión";

        elemento.style.color =
            "#6c757d";

        elemento.style.backgroundColor =
            "#e5e8e7";

        return;

    }


    /*
        Cuando el sensor detecta un objeto.
    */

    if (detectado) {

        elemento.textContent =
            "Objeto detectado";

        elemento.style.color =
            "#8a6200";

        elemento.style.backgroundColor =
            "#fff0c9";

    }

    /*
        Cuando el sensor no detecta.
    */

    else {

        elemento.textContent =
            "Sin detectar";

        elemento.style.color =
            "#166a46";

        elemento.style.backgroundColor =
            "#ddf6ea";

    }

}
/* =====================================================
   OBTENER CONFIGURACIÓN GUARDADA
===================================================== */

function obtenerConfiguracionGuardada() {

    try {

        const configuracion =
            JSON.parse(
                localStorage.getItem("stSettings")
            );


        /*
            Si existe configuración guardada,
            se devuelve.
        */

        if (configuracion) {

            return configuracion;

        }


        /*
            Configuración predeterminada.
        */

        return {

            darkMode: false,

            notifications: true,

            showPercentage: true,

            sound: false

        };

    }

    catch (error) {

        console.error(

            "No se pudo leer la configuración:",

            error

        );


        return {

            darkMode: false,

            notifications: true,

            showPercentage: true,

            sound: false

        };

    }

}


/* =====================================================
   APLICAR CONFIGURACIÓN EN SENSOR.HTML
===================================================== */

function aplicarConfiguracionSensor(
    porcentaje
) {

    const configuracion =
        obtenerConfiguracionGuardada();


    /*
        Activar o desactivar el modo oscuro.
    */

    document.body.classList.toggle(

        "st-dark-mode",

        configuracion.darkMode

    );


    /*
        Mostrar u ocultar el porcentaje.
    */

    const porcentajeElemento =
        document.getElementById(
            "porcentaje"
        );


    if (porcentajeElemento) {

        porcentajeElemento.style.visibility =

            configuracion.showPercentage

                ? "visible"

                : "hidden";

    }


    /*
        Revisar si debe mostrarse una alerta.
    */

    gestionarAlerta(

        porcentaje,

        configuracion

    );

}


/* =====================================================
   GESTIONAR NOTIFICACIONES Y SONIDO
===================================================== */

function gestionarAlerta(
    porcentaje,
    configuracion
) {

    /*
        Si baja del 90 %, permitir que una nueva
        alerta pueda mostrarse después.
    */

    if (porcentaje < 90) {

        alertaMostrada = false;

        return;

    }


    /*
        Evita repetir la alerta cada segundo.
    */

    if (alertaMostrada) {

        return;

    }


    alertaMostrada = true;


    /* -------------------------------------------------
       NOTIFICACIÓN DEL NAVEGADOR
    -------------------------------------------------- */

    if (

        configuracion.notifications &&

        "Notification" in window

    ) {

        /*
            Si el permiso ya fue concedido.
        */

        if (

            Notification.permission === "granted"

        ) {

            new Notification(

                "Breaking Waste",

                {

                    body:
                        "El contenedor alcanzó el 90 %."

                }

            );

        }


        /*
            Si el navegador todavía no ha preguntado
            por el permiso.
        */

        else if (

            Notification.permission === "default"

        ) {

            Notification

                .requestPermission()

                .then(

                    function (permiso) {

                        if (

                            permiso === "granted"

                        ) {

                            new Notification(

                                "Breaking Waste",

                                {

                                    body:
                                        "El contenedor alcanzó el 90 %."

                                }

                            );

                        }

                    }

                );

        }

    }


    /* -------------------------------------------------
       ALERTA SONORA
    -------------------------------------------------- */

    if (configuracion.sound) {

        reproducirAlertaSonora();

    }

}


/* =====================================================
   REPRODUCIR ALERTA SONORA
===================================================== */

function reproducirAlertaSonora() {

    try {

        /*
            Crear el contexto de audio.
        */

        const contextoAudio =

            new (

                window.AudioContext ||

                window.webkitAudioContext

            )();


        /*
            Crear el sonido.
        */

        const oscilador =

            contextoAudio.createOscillator();


        const volumen =

            contextoAudio.createGain();


        oscilador.connect(

            volumen

        );


        volumen.connect(

            contextoAudio.destination

        );


        /*
            Configurar tono y volumen.
        */

        oscilador.frequency.value = 880;

        volumen.gain.value = 0.08;


        /*
            Iniciar sonido.
        */

        oscilador.start();


        /*
            Detener después de 400 milisegundos.
        */

        setTimeout(

            function () {

                oscilador.stop();

                contextoAudio.close();

            },

            400

        );

    }

    catch (error) {

        console.warn(

            "No se pudo reproducir la alerta:",

            error

        );

    }

}


/* =====================================================
   INICIAR CONSULTA AUTOMÁTICA
===================================================== */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        /*
            Aplicar configuración antes de recibir
            los primeros datos.
        */

        aplicarConfiguracionSensor(

            0

        );


        /*
            Primera consulta al ESP32.
        */

        actualizarSensor();


        /*
            Consultar cada segundo.
        */

        setInterval(

            actualizarSensor,

            TIEMPO_ACTUALIZACION

        );

    }

);