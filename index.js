let Promise = require("bluebird");
let spark = require("spark");
let serveStatic = require("serve-static");
let connect = require("connect");
let app = connect();
let http = require("http");
http = Promise.promisifyAll(http);
let co = require("co");
// FIXME awaiting deployment fix <https://github.com/socketio/socket.io/issues/2155>
let socketIo = require('./socket.io');

app.use("/", serveStatic(__dirname + "/public"));

co(function* () {
    spark.login({accessToken: process.env.SPARK_ACCESS_TOKEN});

    let server = http.createServer(app);
    let port = process.env.PORT || 3000;

    let [io, deviceList] = yield [
        socketIo(server),
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
                {name: "WaterClosetWizard" == deviceItem.device.name ? "Kitchen-side bathroom" : deviceItem.device.name, ocupado: !!ocupado.result}
            ))
        ))),
        server.listen(port),
    ];

    console.log("connected", port);

    return {io, deviceList};
}).catch(err => console.error("Startup error", err))
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
});
