class Device extends React.Component {
    updateNotifyStatus() {
        this.props.onUpdate(this.props.device, this.refs.notifier.getDOMNode().checked);
    }
    render() {
        let device = this.props.device;
        let indicators = (
            <span>
                <i className="not-occupied">
                    <i className="indicator"></i>
                    <i className="displayer"></i>
                </i>
            </span>
        );
        let text = "Vacant";
        if (device.ocupado) {
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
        let key = device.name + text;
        return (
            <tr>
                <td className="notifier"><input type="checkbox" ref="notifier" onChange={this.updateNotifyStatus.bind(this)} /></td>
                <td>{device.name}</td>
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
window.Device = Device;
