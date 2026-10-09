package com.cctv.surveillance;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnomalyEventRepository extends JpaRepository<AnomalyEvent, Long> {
    List<AnomalyEvent> findTop10ByOrderByTimestampDesc();
    List<AnomalyEvent> findByEventType(String eventType);
}