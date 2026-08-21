package com.shutdowntracker.projectworker.importer;

import com.shutdowntracker.projectimport.contract.ProjectParsedTask;
import java.time.LocalDateTime;
import java.util.List;

public record ProjectImportSnapshot(
        ProjectImportSummary summary,
        String externalProjectUid,
        LocalDateTime projectStatusDate,
        List<ProjectParsedTask> tasks
) {
    public ProjectImportSnapshot {
        tasks = tasks == null ? List.of() : List.copyOf(tasks);
    }
}
