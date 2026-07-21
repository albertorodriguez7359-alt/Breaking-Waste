const ESP32 = "http://192.168.0.26";

function actualizarSensor() {

    fetch(ESP32 + "/estado")
        .then(response => response.json())
        .then(datos => {

            console.log(datos);

            document.getElementById("porcentaje").textContent = datos.estado;
            document.getElementById("estado").textContent = "Conectado";

        })
        .catch(error => {

            console.error(error);

            document.getElementById("estado").textContent = "Sin conexión";
        });

}

actualizarSensor();
setInterval(actualizarSensor, 1000);