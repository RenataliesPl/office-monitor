import React from "react";

const CameraGrid = () => {

    return (
        <div className="camera-grid">
            {[1,2,3,4].map(i => (
                <div key={i} className="camera-box">
                    <div className="camera-label">Pomieszczenie {i}</div>
                    <div className="camera-view">Brak obrazu</div>
                </div>
            ))}
        </div>
    );
};

export default CameraGrid;