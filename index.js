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

co(function* () {
    spark.login({accessToken: process.env.SPARK_ACCESS_TOKEN});

    let server = http.createServer(app);
    let port = process.env.PORT || 3000;

    let [io] = yield [
        socketIo(server),
        server.listen(port),
    ];

    console.log("connected", port);

    return io;
}).catch(err => console.error("Startup error", err))
.then(io => {
    // Client socket has connected, so give them an initial devices list
    io.on("connection", socket => {
        spark.listDevices().then(devices => Promise.all(devices.map(
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
                {name: deviceItem.device.name == "WaterClosetWizard" ? "Kitchen-side bathroom" : deviceItem.device.name, ocupado: !!ocupado.result}
            ))
        )))
        // Provide the client with the device name and its occupancy state
        .then(deviceList => socket.emit("device-list", deviceList))
        .catch(err => console.error(err));
    });

    // TODO unnamed device in event stream causes it to go crazy
    // Need to test this with more specific device list or perhaps create
    // individual device event listeners and emit to individual sockets
    spark.getEventStream(false, "WaterClosetWizard", data => {
        console.log("Event: ", data);
        spark.getDevice(data.coreid)
            .then(device => {
                console.log("got the device");
                return Promise.all([device.name, device.getVariable("ocupado")]);
            })
            .spread((name, isOccupied) => io.emit("occupancy-change",
                {name: name, ocupado: isOccupied.result}
            ));
    });
});
