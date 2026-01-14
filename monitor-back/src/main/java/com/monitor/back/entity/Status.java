package com.monitor.back.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "status")
public class Status {
    @Id
    private String id; // np. "esp32_1"

    private Double temperature;
    private Double humidity;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    // getters/setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Double getTemperature() { return temperature; }
    public void setTemperature(Double temperature) { this.temperature = temperature; }
    public Double getHumidity() { return humidity; }
    public void setHumidity(Double humidity) { this.humidity = humidity; }
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
}
