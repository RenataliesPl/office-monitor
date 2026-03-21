package com.monitor.back.controller;

import com.monitor.back.entity.Status;
import com.monitor.back.entity.Event;
import com.monitor.back.repository.EventRepository;
import com.monitor.back.repository.StatusRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
public class ApiController {

    private final StatusRepository statusRepository;
    private final EventRepository eventRepository;

    public ApiController(StatusRepository statusRepository, EventRepository eventRepository) {
        this.statusRepository = statusRepository;
        this.eventRepository = eventRepository;
    }

    @GetMapping("/api/status")
    public List<Status> getStatus() {
        return statusRepository.findAll();
    }

    @GetMapping("/api/events")
    public List<Event> getRecentEvents() {
        return eventRepository.findTop10ByOrderByTimestampDesc();
    }

    @GetMapping("/api/events/{sensor}")
    public List<Event> findAllBySensorOrderByTimestampDesc(@PathVariable String sensor) {
        return eventRepository.findAllBySensorOrderByTimestampDesc(sensor);
    }

    // 🔥 NOWY ENDPOINT
    @GetMapping("/api/stats")
    public StatsResponse getStats() {

        long totalEvents = eventRepository.count();

        long eventsLast24h = eventRepository.countByTimestampAfter(
                LocalDateTime.now().minusHours(24)
        );

        long totalDevices = statusRepository.count();

        long recentEventsCount = eventRepository.findTop10ByOrderByTimestampDesc().size();

        return new StatsResponse(
                totalEvents,
                eventsLast24h,
                totalDevices,
                recentEventsCount
        );
    }
}