package com.shutdowntracker.api.project;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/review-project")
@ConditionalOnProperty(prefix = "shutdown-tracker.review-project-bootstrap", name = "enabled", havingValue = "true")
public class ReviewProjectBootstrapController {

    private final ReviewProjectBootstrapService service;

    public ReviewProjectBootstrapController(ReviewProjectBootstrapService service) {
        this.service = service;
    }

    @GetMapping
    public ProjectRecord getOrCreateReviewProject() {
        return service.ensureReviewProject();
    }
}
