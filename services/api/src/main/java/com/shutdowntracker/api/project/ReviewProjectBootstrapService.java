package com.shutdowntracker.api.project;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "shutdown-tracker.persistence", name = "enabled", havingValue = "true")
public class ReviewProjectBootstrapService {

    private final ProjectRepository projectRepository;
    private final ReviewProjectBootstrapProperties properties;

    public ReviewProjectBootstrapService(
            ProjectRepository projectRepository,
            ReviewProjectBootstrapProperties properties
    ) {
        this.projectRepository = projectRepository;
        this.properties = properties;
    }

    public ProjectRecord ensureReviewProject() {
        return projectRepository.findReviewBootstrapProject(properties.projectName())
                .orElseGet(() -> createReviewProject(properties.projectName(), properties.description()));
    }

    public ProjectRecord createFreshReviewProject() {
        String runSuffix = UUID.randomUUID().toString().substring(0, 8);
        return createReviewProject(
                properties.projectName() + " · " + runSuffix,
                properties.description() + " Fresh isolated acceptance run; prior immutable test history is retained."
        );
    }

    private ProjectRecord createReviewProject(String name, String description) {
        return projectRepository.createReviewBootstrapProject(new ReviewProjectCreateRequest(
                name,
                description,
                properties.timezone()
        ));
    }
}
