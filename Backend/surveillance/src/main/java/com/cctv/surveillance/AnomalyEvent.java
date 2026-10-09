package com.cctv.surveillance;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "anomaly_events")
public class AnomalyEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String cameraId;
    private String eventType;
    private String reason;
    private Float anomalyScore;
    private Integer numPeople;
    private LocalDateTime timestamp;

    public Long getId() { return id; }
    public String getCameraId() { return cameraId; }
    public String getEventType() { return eventType; }
    public String getReason() { return reason; }
    public Float getAnomalyScore() { return anomalyScore; }
    public Integer getNumPeople() { return numPeople; }
    public LocalDateTime getTimestamp() { return timestamp; }
}