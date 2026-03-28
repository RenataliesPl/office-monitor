const Topbar = ({ connected, lastUpdate }: any) => (
    <header className="topbar">
        <div className="connection">
            <span className={"connection-indicator " + (connected ? "connection-ok" : "connection-off")} />
            {connected ? "Podgląd na żywo" : "Brak podglądu"}
        </div>

        <div className="timestamp">
            {lastUpdate || "No data"}
        </div>
    </header>
);

export default Topbar;