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

window.BathroomsManager = BathroomsManager;
