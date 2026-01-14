package com.monitor.back.service;

import com.monitor.back.entity.Event;
import com.monitor.back.entity.Status;
import com.monitor.back.repository.EventRepository;
import com.monitor.back.repository.StatusRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class MqttService {

    private final StatusRepository statusRepository;
    private final EventRepository eventRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MqttService(StatusRepository statusRepository,
                       EventRepository eventRepository,
                       SimpMessagingTemplate messagingTemplate) {
        this.statusRepository = statusRepository;
        this.eventRepository = eventRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public void handleMessage(String topic, String payload) {
        try {
            if (topic.startsWith("home/status/")) {
                handleStatus(topic, payload);
            } else if (topic.startsWith("home/alerts/")) {
                handleAlert(topic, payload);
            }
        } catch (Exception e) {
            System.err.println("Error handling MQTT message: " + e.getMessage());
        }
    }

    private void handleStatus(String topic, String payload) throws Exception {
        JsonNode json = objectMapper.readTree(payload);
        String deviceId = topic.split("/")[2]; // home/status/esp32_1 → esp32_1

        Status status = statusRepository.findById(deviceId).orElse(new Status());
        status.setId(deviceId);
        status.setTemperature(json.get("temp").asDouble());
        status.setHumidity(json.get("hum").asDouble());
        status.setLastUpdated(LocalDateTime.now());

        statusRepository.save(status);

        // Wyślij przez WebSocket
        messagingTemplate.convertAndSend("/topic/status", status);
    }

    private void handleAlert(String topic, String payload) {
        String sensor = topic.split("/")[2]; // home/alerts/door1 → door1

        Event event = new Event();
        event.setType(payload); // "OPEN", "MOTION"
        event.setSensor(sensor);
        event.setPayload(payload);
        eventRepository.save(event);

        // Wyślij przez WebSocket
        messagingTemplate.convertAndSend("/topic/alerts", event);
    }
}
