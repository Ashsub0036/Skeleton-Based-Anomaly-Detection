package com.cctv.surveillance;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class AnomalyEventController {

    @Autowired
    private AnomalyEventRepository repository;

    @GetMapping
    public List<AnomalyEvent> getAllEvents() {
        return repository.findAll();
    }

    @GetMapping("/latest")
    public List<AnomalyEvent> getLatestEvents() {
        return repository.findTop10ByOrderByTimestampDesc();
    }

    @GetMapping("/dangerous")
    public List<AnomalyEvent> getDangerousEvents() {
        return repository.findByEventType("DANGEROUS");
    }

    @GetMapping("/suspicious")
    public List<AnomalyEvent> getSuspiciousEvents() {
        return repository.findByEventType("SUSPICIOUS");
    }
}