package com.shutdowntracker.api.importbatch.handoff;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/import-batches")
@ConditionalOnProperty(prefix = "shutdown-tracker.persistence", name = "enabled", havingValue = "true")
public class ImportBatchParseSnapshotHandoffController {

    private final ImportBatchParseSnapshotHandoffService service;

    public ImportBatchParseSnapshotHandoffController(ImportBatchParseSnapshotHandoffService service) {
        this.service = service;
    }

    @PostMapping("/{importBatchId}/request-parse-snapshot")
    public ImportBatchParseSnapshotHandoffResponse requestParseSnapshot(
            @PathVariable UUID projectId,
            @PathVariable UUID importBatchId
    ) {
        return service.requestParseSnapshot(projectId, importBatchId);
    }
}
