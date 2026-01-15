package com.monitor.back.repository;

import com.monitor.back.entity.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StatusRepository extends JpaRepository<Status, String> {
    Optional<Status> findById(String id);

    List<Status> findAllById(String id);
}
