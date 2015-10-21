let Promise = require("bluebird");
let spark = require("spark");
let serveStatic = require("serve-static");
let connect = require("connect");
let app = connect();
let http = require("http");
http = Promise.promisifyAll(http);
let co = require("co");
let socketIo = require('socket.io');

app.use("/", serveStatic(__dirname + "/public"));

let particleAccessToken = process.env.PARTICLE_ACCESS_TOKEN;

co(function* () {
    let sparkLoginPromise;
    if (particleAccessToken) {
        spark.login({accessToken: particleAccessToken});

        sparkLoginPromise = spark.listDevices()
        .then(devices => Promise.all(devices.map(
            // getAttributes does not return a promise
            // Create a list of devices with attributes
            //
            // TODO if `device.variables` works from `listDevices` this step
            // can be skipped. May be an issue in Spark.
            device => Promise.promisify(device.getAttributes, device)()
            .then(
                deviceAttributes => ({device: device, attributes: deviceAttributes})
            )
        )))
        // Filter down to only devices that have the `ocupado` variable
        .then(deviceAttributesList => deviceAttributesList.filter(
            deviceItem => deviceItem.attributes.variables && undefined !== deviceItem.attributes.variables.ocupado
        ))
        // Get the `ocupado` variable value to determine occupancy state
        .then(occupiableDevices => Promise.all(occupiableDevices.map(
            deviceItem => deviceItem.device.getVariable("ocupado").then(ocupado => (
                // FIXME real name should come eventually
                {name: "WaterClosetWizard" == deviceItem.device.name ? "Kitchen-side bathroom" : deviceItem.device.name, ocupado: !!ocupado.result}
            ))
        )));
    }
    else {
        console.log("No Particle access token provided. Dropping into test mode");

        sparkLoginPromise = [
            {name: "test every 5 seconds", ocupado: false},
            {name: "test every 18 seconds", ocupado: true},
        ];
    }

    let server = http.createServer(app);
    let port = process.env.PORT || 3000;

    let [io, deviceList] = yield [
        socketIo(server),
        sparkLoginPromise,
        server.listen(port),
    ];

    console.log("connected", port);

    return {io, deviceList};
}).catch(err => {
    console.error("Startup error", err)
    process.exit(1);
})
.then(startupData => {
    let {io, deviceList} = startupData;
    // Client socket has connected, so give them an initial devices list
    // when the socket is ready to receive the list
    io.on("connection", socket => {
        socket.on("device-request", () => socket.emit("device-list", deviceList));
    });

    // TODO unnamed device in event stream causes it to go crazy
    // Need to test this with more specific device list or perhaps create
    // individual device event listeners and emit to individual sockets
    if (particleAccessToken) {
        spark.getEventStream(false, "WaterClosetWizard", data => {
            spark.getDevice(data.coreid)
                .then(device => {
                    device.name = "WaterClosetWizard" == device.name ? "Kitchen-side bathroom" : device.name;
                    return Promise.all([device.name, device.getVariable("ocupado")]);
                })
                .spread((name, isOccupied) => {
                    let deviceUpdate = {name, ocupado: isOccupied.result};
                    deviceList[deviceList.findIndex(search => search.name === name)].ocupado = !!deviceUpdate.ocupado;
                    io.emit("occupancy-change", deviceUpdate);
                });
        });
    }
    else {
        console.log("setting up two test devices");
        let ocupado5 = false;
        let ocupado18 = true;

        setInterval(() => {
            ocupado5 = !ocupado5;
            io.emit("occupancy-change", {name: "test every 5 seconds", ocupado: ocupado5});
        }, 5000);
        setInterval(() => {
            ocupado18 = !ocupado18;
            io.emit("occupancy-change", {name: "test every 18 seconds", ocupado: ocupado18});
        }, 18000);
    }
});
