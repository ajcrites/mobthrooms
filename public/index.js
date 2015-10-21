class Device extends React.Component {
    render() {
        let indicators = (
            <span>
                <i className="not-occupied">
                    <i className="displayer"></i>
                </i>
            </span>
        );
        if (this.props.ocupado) {
            indicators = (
                <span>
                    <i className="occupied">
                        <i className="displayer"></i>
                    </i>
                </span>
            );
        }
        return (
            <tr>
                <td>{this.props.name}</td>
                <td>
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
            devices: [{
                name: "test",
                ocupado: false,
            }]
        };

        // socket.on("device-list", devices => this.setState({devices: devices}))
        socket.on("occupancy-change", device => {
            let devices = this.state.devices;
            devices[devices.findIndex(search => search.name === device.name)].ocupado = device.ocupado;
            this.setState({devices: devices});
        });
    }
    devicesList() {
        return this.state.devices.map(device => <Device name={device.name} ocupado={device.ocupado} />);
    }
    render() {
        return <table>{this.devicesList()}</table>;
    }
}
React.render(<BathroomsTable />, document.querySelector("#bathrooms"));
