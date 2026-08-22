package com.shutdowntracker.api.importbatch.handoff;

import com.shutdowntracker.projectimport.contract.ProjectParseSnapshotResponse;
import com.shutdowntracker.projectimport.contract.ProjectParseSummaryRequest;
import java.util.Objects;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
        prefix = "shutdown-tracker.project-parse-worker",
        name = "enabled",
        havingValue = "false",
        matchIfMissing = true
)
public class DisconnectedProjectParseSnapshotJobClient implements ProjectParseSnapshotJobClient {

    @Override
    public ProjectParseSnapshotResponse requestParseSnapshot(ProjectParseSummaryRequest request) {
        Objects.requireNonNull(request, "request is required.");
        throw new UnsupportedOperationException(
                "Project snapshot parse handoff is not connected. Start the project worker and enable "
                        + "shutdown-tracker.project-parse-worker before using the browser round-trip importer."
        );
    }
}
