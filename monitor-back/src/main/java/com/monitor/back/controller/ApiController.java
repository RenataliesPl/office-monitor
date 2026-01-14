package com.monitor.back.controller;

import com.monitor.back.entity.Status;
import com.monitor.back.entity.Event;
import com.monitor.back.repository.EventRepository;
import com.monitor.back.repository.StatusRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
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
}
