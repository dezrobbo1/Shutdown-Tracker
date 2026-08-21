package com.shutdowntracker.projectworker.handoff;

import com.shutdowntracker.projectimport.contract.ProjectParseSnapshotResponse;
import com.shutdowntracker.projectimport.contract.ProjectParseSummaryRequest;
import com.shutdowntracker.projectimport.contract.ProjectParseSummaryResponse;
import com.shutdowntracker.projectworker.importer.ProjectImportSnapshot;
import com.shutdowntracker.projectworker.importer.ProjectImportSnapshotService;
import com.shutdowntracker.projectworker.importer.ProjectImportSummary;
import java.net.URI;
import java.nio.file.Path;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class WorkerProjectSnapshotHandoffService {

    private static final String LOCAL_FILE_SCHEME = "file";

    private final ProjectImportSnapshotService snapshotService;

    public WorkerProjectSnapshotHandoffService(ProjectImportSnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    public ProjectParseSnapshotResponse parse(ProjectParseSummaryRequest request) {
        Objects.requireNonNull(request, "request is required.");
        ProjectImportSnapshot snapshot = snapshotService.parse(resolveLocalPath(request.storageUri()));
        ProjectImportSummary summary = snapshot.summary();
        ProjectParseSummaryResponse summaryResponse = new ProjectParseSummaryResponse(
                request.importBatchId(),
                "mpxj",
                mpxjVersion(),
                summary.sourceFilename(),
                summary.detectedFormat(),
                summary.projectName(),
                summary.taskCount(),
                summary.summaryTaskCount(),
                summary.leafTaskCount(),
                summary.resourceCount(),
                summary.assignmentCount(),
                summary.calendarCount(),
                summary.customFieldCount(),
                warningCount(summary),
                0,
                summary.notes()
        );
        return new ProjectParseSnapshotResponse(
                summaryResponse,
                snapshot.externalProjectUid(),
                snapshot.projectStatusDate(),
                snapshot.tasks()
        );
    }

    private Path resolveLocalPath(String storageUri) {
        URI uri = URI.create(storageUri);
        if (uri.getScheme() == null) {
            return Path.of(storageUri);
        }
        if (LOCAL_FILE_SCHEME.equalsIgnoreCase(uri.getScheme())) {
            return Path.of(uri);
        }
        throw new IllegalArgumentException("Project worker snapshot handoff only supports local file storage URIs for now.");
    }

    private int warningCount(ProjectImportSummary summary) {
        return (int) summary.notes().stream()
                .filter(note -> note.startsWith("Ignored read issue:"))
                .count();
    }

    private String mpxjVersion() {
        Package mpxjPackage = org.mpxj.ProjectFile.class.getPackage();
        String implementationVersion = mpxjPackage.getImplementationVersion();
        return implementationVersion == null || implementationVersion.isBlank() ? "unknown" : implementationVersion;
    }
}
