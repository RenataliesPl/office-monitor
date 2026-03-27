import React from "react";
import { EventItem } from "../types";

interface Props {
    events: EventItem[];
}

const EventsList: React.FC<Props> = ({ events }) => {

    const renderEventTypeBadge = (event: EventItem) => {
        const type = (event.type || "").toUpperCase();

        if (type === "OPEN") return <span className="badge badge-open">OPEN</span>;
        if (type === "CLOSED") return <span className="badge badge-closed">CLOSED</span>;
        if (type === "MOTION") return <span className="badge badge-motion">MOTION</span>;

        return <span className="badge">{type}</span>;
    };

    return (
        <section className="glass-card">
            <div className="card-title">Zdarzenia</div>

            <table className="table">
                <thead>
                <tr>
                    <th>Czas</th>
                    <th>Sensor</th>
                    <th>Typ</th>
                    <th>Zdarzenie</th>
                </tr>
                </thead>

                <tbody>
                {events.map((e) => (
                    <tr key={e.id ?? `${e.sensor}-${e.timestamp}`}>
                        <td>{e.timestamp?.replace("T", " ")}</td>
                        <td>{e.sensor}</td>
                        <td>{renderEventTypeBadge(e)}</td>
                        <td>{e.payload}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </section>
    );
};

export default EventsList;