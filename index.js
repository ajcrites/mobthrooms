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
let sparkListPromise;

if (particleAccessToken) {
    spark.login({accessToken: particleAccessToken});
    sparkListPromise = co(function* () {
        let devices = yield spark.listDevices();
        let deviceAttributesList = yield devices.map(device =>
            co(function* () {
                let deviceAttributes = yield Promise.promisify(device.getAttributes, device)();
                return {device: device, attributes: deviceAttributes};
            })
        );
        let occupiableDevices = yield deviceAttributesList.filter(
            deviceItem => deviceItem.attributes.variables
            && undefined !== deviceItem.attributes.variables.ocupado
        );

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

    // TODO unnamed device in event stream causes it to go crazy
    // Need to test this with more specific device list or perhaps create
    // individual device event listeners and emit to individual sockets
    if (particleAccessToken) {
        spark.getEventStream("occupancy-change", false, data => co(function* () {
            let device = yield spark.getDevice(data.coreid);
            let [name, isOccupied] = yield [
                device.getVariable("name"),
                device.getVariable("ocupado"),
            ];
            let deviceUpdate = {name: name.result, ocupado: isOccupied.result};

            io.emit("occupancy-change", deviceUpdate);
            deviceList[deviceList.findIndex(search => search.name === name)].ocupado = !!deviceUpdate.ocupado;
        }));
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
}).catch(err => {
    console.error("Startup error", err)
    console.error(err.stack)
    process.exit(1);
});
