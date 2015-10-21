class Device extends React.Component {
    render() {
        return (
            <tr>
                <td>{this.props.name}</td>
                <td>{this.props.ocupado}</td>
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

        socket.on("device-list", devices => this.setState({devices: devices}));
    }
    devicesList() {
        return this.state.devices.map(device => <Device name={device.name} ocupado={device.ocupado} />);
    }
    render() {
        return (
            <table>
                {this.devicesList()}
            </table>
        );
    }
}
React.render(<BathroomsTable />, document.querySelector("#bathrooms"));
