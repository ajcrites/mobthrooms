let Promise = require("bluebird");
let spark = require("spark");
let serveStatic = require("serve-static");
let connect = require("connect");
let app = connect();
let http = require("http");
http = Promise.promisifyAll(http);
let co = require("co");
let socketIo = require('socket.io');

app.use(serveStatic(__dirname + "/public"));

let particleAccessToken = process.env.PARTICLE_ACCESS_TOKEN;
// Synchronize device list fetching
let sparkListPromise;

// If particle access token is provided we can use the devices
// Othewrise, we create a test device list in memory
if (particleAccessToken) {
    spark.login({accessToken: particleAccessToken});
    sparkListPromise = co(function* () {
        // Retreive device list
        let devices = yield spark.listDevices();

        // Get all attributes for devices
        let deviceAttributesList = yield devices.map(device =>
            co(function* () {
                // `device.getAttributes` does not return a promise
                let deviceAttributes = yield Promise.promisify(device.getAttributes, device)();
                return {device: device, attributes: deviceAttributes};
            })
        );

        // Filter these down to devices that have an `ocupado` attribute
        let occupiableDevices = yield deviceAttributesList.filter(
            deviceItem => deviceItem.attributes.variables
            && undefined !== deviceItem.attributes.variables.ocupado
        );

        // Get the name and ocupado properties from the filtered device list
        return yield occupiableDevices.map(deviceItem =>
            co(function* () {
                let [name, ocupado] = yield [
                    deviceItem.device.getVariable("name"),
                    deviceItem.device.getVariable("ocupado"),
                ];
                return {name: name.result, ocupado: !!ocupado.result};
            })
        );
    });
}
else {
    console.log("No Particle access token provided. Dropping into test mode");

    sparkListPromise = [
        {name: "test every 5 seconds", ocupado: false},
        {name: "test every 18 seconds", ocupado: true},
    ];
}

co(function* () {
    let server = http.createServer(app);
    let port = process.env.PORT || 3000;

    // Create the socket connection and the server
    let [io, deviceList] = yield [
        socketIo(server),
        sparkListPromise,
        server.listen(port),
    ];

    console.log("connected", port);

    // Client socket has connected, so give them an initial devices list
    // when the socket is ready to receive the list
    io.on("connection", socket => {
        socket.on("device-request", () => socket.emit("device-list", deviceList));
    });

    app.use((req, res) => {
        const url = req.url.match(/^\/status\/([^\/]+)\/?$/);

        if (!url || !url[1]) {
            res.writeHead(404);
            return res.end();
        }

        const requestedDevice = decodeURIComponent(url[1]);
        const requestedDeviceIndex = deviceList.findIndex(search => search.name == requestedDevice);

        if (-1 === requestedDeviceIndex) {
            res.writeHead(404);
            return res.end("Device not found");
        }

        if (deviceList[requestedDeviceIndex].ocupado) {
            res.writeHead(409);
            return res.end("occupied");
        }

        res.end("open");
    });

    if (particleAccessToken) {
        // When occupancy has changed, we update the device list (for new
        // user connections) and send the updated device to currently
        // connected clients
        spark.getEventStream("occupancy-change", false, data => co(function* () {
            let device = yield spark.getDevice(data.coreid);
            let [name, isOccupied] = yield [
                device.getVariable("name"),
                device.getVariable("ocupado"),
            ];
            let deviceUpdate = {name: name.result, ocupado: isOccupied.result};
            let currentDeviceIndex = deviceList.findIndex(search => search.name === name.result);

            // Device with this name was not in the list, so we add it
            if (-1 === currentDeviceIndex) {
                deviceList.push(deviceUpdate);
            }
            else {
                deviceList[currentDeviceIndex].ocupado = !!deviceUpdate.ocupado;
            }

            io.emit("occupancy-change", deviceUpdate);
        }).catch(err => console.log(err.stack)));
    }
    else {
        console.log("setting up test devices");
        let ocupado5 = false;
        let ocupado18 = true;
        let ocupado30 = false;

        setInterval(() => {
            ocupado5 = !ocupado5;
            io.emit("occupancy-change", {name: "test every 5 seconds", ocupado: ocupado5});
        }, 5000);
        setInterval(() => {
            ocupado18 = !ocupado18;
            io.emit("occupancy-change", {name: "test every 18 seconds", ocupado: ocupado18});
        }, 18000);

        // Not on the initial list to test frontend handling of added devices
        setInterval(() => {
            ocupado30 = !ocupado30;
            io.emit("occupancy-change", {name: "test every 30 seconds and new", ocupado: ocupado30});
        }, 30000);
    }
}).catch(err => {
    console.error("Startup error", err)
    console.error(err.stack)
    process.exit(1);
});
