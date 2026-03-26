package com.monitor.back.repository;

import com.monitor.back.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.time.LocalDateTime;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findTop10ByOrderByTimestampDesc();
    List<Event> findAllBySensorOrderByTimestampDesc(String sensor);
    long countByTimestampAfter(LocalDateTime timestamp);
}
