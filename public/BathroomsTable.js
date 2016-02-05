class BathroomsTable extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            devices: []
        };

        socket.on("device-list", devices => {
            if (window.Notification) {
                // initial permission request
                if (Notification.permission !== "granted" && Notification.permission !== "denied") {
                    Notification.requestPermission();
                }
            }

            this.setState({devices: devices});
        })
        socket.on("occupancy-change", device => {
            let updatedDevice;
            let devices = this.state.devices;
            let currentDeviceIndex = devices.findIndex(search => search.name === device.name);

            if (-1 === currentDeviceIndex) {
                updatedDevice = device;
                updatedDevice.notify = false;
                devices.push(updatedDevice);
            }
            else {
                updatedDevice = devices[currentDeviceIndex];
            }

            updatedDevice.ocupado = device.ocupado;

            // Device has become available
            if (window.Notification && !updatedDevice.ocupado && updatedDevice.notify) {
                Notification.requestPermission(permission => {
                    if ("granted" === permission) {
                        new Notification(updatedDevice.name + " is available");
                    }
                });
            }

            this.setState({devices: devices});
        });

        // Initial device list load
        socket.emit("device-request");
    }
    onUpdate(device, notify) {
        let devices = this.state.devices;
        let updatedDevice = devices[devices.findIndex(search => search.name === device.name)];
        updatedDevice.notify = notify;
        this.setState({devices: devices});
    }
    devicesList() {
        return this.state.devices.map(device => <Device device={device} onUpdate={this.onUpdate.bind(this)} />);
    }
    render() {
        return (
            <table className="bathrooms-table">
                <thead>
                    <tr>
                        <th className="notifier">Notify me</th>
                        <th>Bathroom Name</th>
                        <th colSpan="2">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {this.devicesList()}
                </tbody>
            </table>
        );
    }
}
window.BathroomsTable = BathroomsTable;
