package com.shutdowntracker.projectworker.importer;

import com.shutdowntracker.projectimport.contract.ProjectParsedTask;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Objects;
import org.mpxj.ProjectFile;
import org.mpxj.ProjectProperties;
import org.mpxj.Task;
import org.mpxj.reader.ProjectReader;
import org.mpxj.reader.UniversalProjectReader;
import org.springframework.stereotype.Service;

@Service
public class MpxjProjectImportSnapshotService implements ProjectImportSnapshotService {

    private final MpxjProjectImportSummaryService summaryService;

    public MpxjProjectImportSnapshotService(MpxjProjectImportSummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @Override
    public ProjectImportSnapshot parse(Path sourcePath) {
        Path normalizedPath = sourcePath.toAbsolutePath().normalize();
        if (!Files.isRegularFile(normalizedPath)) {
            throw new IllegalArgumentException("Project import path must point to a local file: " + normalizedPath);
        }

        UniversalProjectReader universalReader = new UniversalProjectReader();
        try (UniversalProjectReader.ProjectReaderProxy proxy =
                     universalReader.getProjectReaderProxy(normalizedPath.toFile())) {
            ProjectReader reader = proxy.getProjectReader();
            ProjectFile project = proxy.read();
            ProjectImportSummary summary = summaryService.summarize(
                    project,
                    normalizedPath.getFileName().toString(),
                    reader.getClass().getSimpleName()
            );
            ProjectProperties properties = project.getProjectProperties();
            List<ProjectParsedTask> tasks = project.getTasks().stream()
                    .filter(Objects::nonNull)
                    .map(this::mapTask)
                    .toList();

            return new ProjectImportSnapshot(
                    summary,
                    externalProjectUid(properties),
                    properties.getStatusDate(),
                    tasks
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to read project snapshot: " + normalizedPath.getFileName(), ex);
        }
    }

    private ProjectParsedTask mapTask(Task task) {
        Integer uniqueId = task.getUniqueID();
        String name = task.getName();
        if (name == null || name.isBlank()) {
            name = uniqueId == null ? "Unnamed task" : "Task " + uniqueId;
        }
        Task parent = task.getParentTask();

        return new ProjectParsedTask(
                text(uniqueId),
                text(task.getID()),
                name,
                task.getWBS(),
                task.getOutlineNumber(),
                task.getOutlineLevel(),
                task.getSummary(),
                parent == null ? null : text(parent.getUniqueID()),
                task.getStart(),
                task.getFinish(),
                task.getActualStart(),
                task.getActualFinish(),
                decimal(task.getPercentageComplete()),
                decimal(task.getPhysicalPercentComplete()),
                task.getNotes()
        );
    }

    private String externalProjectUid(ProjectProperties properties) {
        if (properties.getGUID() != null) {
            return properties.getGUID().toString();
        }
        return text(properties.getUniqueID());
    }

    private String text(Object value) {
        return value == null ? null : value.toString();
    }

    private BigDecimal decimal(Number value) {
        return value == null ? null : new BigDecimal(value.toString());
    }
}
