package com.shutdowntracker.api.importbatch.handoff;

import com.shutdowntracker.api.importbatch.ImportBatchRecord;
import com.shutdowntracker.api.importbatch.ImportBatchService;
import com.shutdowntracker.api.importbatch.ImportBatchStatus;
import com.shutdowntracker.api.importedproject.ImportedProjectEntities;
import com.shutdowntracker.api.importedproject.ImportedProjectPersistenceResult;
import com.shutdowntracker.api.importedproject.ImportedProjectPersistenceService;
import com.shutdowntracker.api.importedproject.ImportedProjectSnapshotCreateRequest;
import com.shutdowntracker.api.importedproject.ImportedTaskCreateRequest;
import com.shutdowntracker.api.importreview.ImportReviewService;
import com.shutdowntracker.api.importreview.ImportReviewSnapshotDetail;
import com.shutdowntracker.api.sourcefile.metadata.SourceFileMetadataRecord;
import com.shutdowntracker.api.sourcefile.metadata.SourceFileMetadataService;
import com.shutdowntracker.projectimport.contract.ProjectParseSnapshotResponse;
import com.shutdowntracker.projectimport.contract.ProjectParseSummaryRequest;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@ConditionalOnProperty(prefix = "shutdown-tracker.persistence", name = "enabled", havingValue = "true")
public class ImportBatchParseSnapshotHandoffService {

    private final ImportBatchService importBatchService;
    private final SourceFileMetadataService sourceFileMetadataService;
    private final ProjectParseSnapshotJobClient snapshotJobClient;
    private final ImportedProjectPersistenceService persistenceService;
    private final ImportReviewService importReviewService;

    public ImportBatchParseSnapshotHandoffService(
            ImportBatchService importBatchService,
            SourceFileMetadataService sourceFileMetadataService,
            ProjectParseSnapshotJobClient snapshotJobClient,
            ImportedProjectPersistenceService persistenceService,
            ImportReviewService importReviewService
    ) {
        this.importBatchService = importBatchService;
        this.sourceFileMetadataService = sourceFileMetadataService;
        this.snapshotJobClient = snapshotJobClient;
        this.persistenceService = persistenceService;
        this.importReviewService = importReviewService;
    }

    @Transactional
    public ImportBatchParseSnapshotHandoffResponse requestParseSnapshot(UUID projectId, UUID importBatchId) {
        Objects.requireNonNull(projectId, "projectId is required.");
        Objects.requireNonNull(importBatchId, "importBatchId is required.");

        ImportBatchRecord importBatch = importBatchService.find(projectId, importBatchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Import batch not found."));
        if (importBatch.status() != ImportBatchStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending import batches can request snapshot parsing.");
        }

        SourceFileMetadataRecord sourceFile = sourceFileMetadataService.find(projectId, importBatch.sourceFileId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source file metadata not found."));

        ImportBatchRecord parsingBatch = importBatchService.updateStatus(importBatchId, ImportBatchStatus.PARSING);
        ProjectParseSnapshotResponse parsed = snapshotJobClient.requestParseSnapshot(new ProjectParseSummaryRequest(
                parsingBatch.id(),
                parsingBatch.projectId(),
                parsingBatch.sourceFileId(),
                sourceFile.storageUri(),
                sourceFile.originalFilename()
        ));

        if (!parsed.summary().importBatchId().equals(importBatchId)) {
            throw new IllegalStateException("Worker snapshot response referenced a different import batch.");
        }

        ImportBatchRecord parsedBatch = importBatchService.recordParsedSummary(parsed.summary());
        ImportedProjectPersistenceResult persisted = persistenceService.persistParsedSnapshot(
                new ImportedProjectSnapshotCreateRequest(
                        projectId,
                        importBatchId,
                        parsed.externalProjectUid(),
                        parsed.summary().projectName(),
                        toOffset(parsed.projectStatusDate()),
                        snapshotMetadata(sourceFile, parsed),
                        new ImportedProjectEntities(
                                parsed.tasks().stream().map(task -> new ImportedTaskCreateRequest(
                                        task.externalUid(),
                                        task.externalId(),
                                        task.name(),
                                        task.wbs(),
                                        task.outlineNumber(),
                                        task.outlineLevel(),
                                        task.summary(),
                                        task.parentExternalUid(),
                                        null,
                                        toOffset(task.plannedStart()),
                                        toOffset(task.plannedFinish()),
                                        toOffset(task.actualStart()),
                                        toOffset(task.actualFinish()),
                                        task.percentComplete(),
                                        task.physicalPercentComplete(),
                                        task.notes(),
                                        Map.of(
                                                "source", "project-worker",
                                                "parser", parsed.summary().parserName()
                                        )
                                )).toList(),
                                List.of(),
                                List.of(),
                                List.of()
                        )
                )
        );

        ImportReviewSnapshotDetail snapshot = importReviewService.getSnapshot(projectId, persisted.snapshot().id());
        return new ImportBatchParseSnapshotHandoffResponse(
                parsedBatch,
                snapshot,
                parsed.summary(),
                "Project file parsed by the project worker and persisted as a reviewable snapshot."
        );
    }

    private OffsetDateTime toOffset(LocalDateTime value) {
        return value == null ? null : value.atOffset(ZoneOffset.UTC);
    }

    private Map<String, Object> snapshotMetadata(
            SourceFileMetadataRecord sourceFile,
            ProjectParseSnapshotResponse parsed
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("sourceFileId", sourceFile.id().toString());
        metadata.put("sourceStorageUri", sourceFile.storageUri());
        metadata.put("sourceContentHash", sourceFile.contentHash());
        metadata.put("sourceFilename", sourceFile.originalFilename());
        metadata.put("parserName", parsed.summary().parserName());
        metadata.put("parserVersion", parsed.summary().parserVersion());
        metadata.put("roundTripImport", true);
        metadata.put("scheduleCalculatedByShutdownTracker", false);
        return Map.copyOf(metadata);
    }
}
