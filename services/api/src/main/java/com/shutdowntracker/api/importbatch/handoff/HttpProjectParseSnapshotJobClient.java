package com.shutdowntracker.api.importbatch.handoff;

import com.shutdowntracker.projectimport.contract.ProjectParseSnapshotResponse;
import com.shutdowntracker.projectimport.contract.ProjectParseSummaryRequest;
import java.util.Objects;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@ConditionalOnProperty(prefix = "shutdown-tracker.project-parse-worker", name = "enabled", havingValue = "true")
public class HttpProjectParseSnapshotJobClient implements ProjectParseSnapshotJobClient {

    private static final String PARSE_SNAPSHOT_PATH = "/worker/project-import/parse-snapshot";
    private final RestClient restClient;

    public HttpProjectParseSnapshotJobClient(
            RestClient.Builder restClientBuilder,
            ProjectParseWorkerClientProperties properties
    ) {
        this.restClient = restClientBuilder
                .baseUrl(properties.baseUrl())
                .build();
    }

    @Override
    public ProjectParseSnapshotResponse requestParseSnapshot(ProjectParseSummaryRequest request) {
        Objects.requireNonNull(request, "request is required.");
        return restClient.post()
                .uri(PARSE_SNAPSHOT_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ProjectParseSnapshotResponse.class);
    }
}
