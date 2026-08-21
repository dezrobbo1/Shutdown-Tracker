package com.shutdowntracker.projectimport.contract;

import java.time.LocalDateTime;
import java.util.List;

public record ProjectParseSnapshotResponse(
        ProjectParseSummaryResponse summary,
        String externalProjectUid,
        LocalDateTime projectStatusDate,
        List<ProjectParsedTask> tasks
) {
    public ProjectParseSnapshotResponse {
        if (summary == null) {
            throw new IllegalArgumentException("summary is required.");
        }
        tasks = tasks == null ? List.of() : List.copyOf(tasks);
    }
}
