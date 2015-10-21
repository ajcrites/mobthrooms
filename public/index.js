class Device extends React.Component {
    render() {
        let indicators = (
            <span>
                <i className="not-occupied">
                    <i className="indicator"></i>
                    <i className="displayer"></i>
                </i>
            </span>
        );
        let text = "Vacant";
        if (this.props.ocupado) {
            indicators = (
                <span>
                    <i className="occupied">
                        <i className="indicator"></i>
                        <i className="displayer"></i>
                    </i>
                </span>
            );
            text = "Occupied";
        }
        let key = this.props.name + text;
        return (
            <tr>
                <td>{this.props.name}</td>
                <td>
                    <span className="text-cell" key={key + 'text'}>{text}</span>
                </td>
                <td className="device-cell" key={key}>
                    {indicators}
                </td>
            </tr>
        );
    }
}

class BathroomsTable extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            devices: []
        };

        socket.on("device-list", devices => {
            console.log("requesting");
            this.setState({devices: devices});
        })
        socket.on("occupancy-change", device => {
            let devices = this.state.devices;
            devices[devices.findIndex(search => search.name === device.name)].ocupado = device.ocupado;
            this.setState({devices: devices});
        });
        // Initial device list load
        socket.emit("device-request");
    }
    devicesList() {
        return this.state.devices.map(device => <Device name={device.name} ocupado={device.ocupado} />);
    }
    render() {
        return <table className="bathrooms-table">{this.devicesList()}</table>;
    }
}

class BathroomsManager extends React.Component {
    render() {
        return (
            <div>
                <h1 className="title">Mobiquity 606 Bathroom Occupancy Checker</h1>
                <BathroomsTable />
            </div>
        );
    }
}
React.render(<BathroomsManager />, document.querySelector("#bathrooms"));
