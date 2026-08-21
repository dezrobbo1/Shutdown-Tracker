package com.shutdowntracker.projectworker.handoff;

import static org.assertj.core.api.Assertions.assertThat;

import com.shutdowntracker.projectexport.contract.ProjectExportArtifactField;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactFieldValue;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactGenerationRequest;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactGenerationResponse;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactRequest;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactSource;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactSummary;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactTask;
import com.shutdowntracker.projectworker.exporter.MpxjMspdiExportArtifactService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mpxj.ProjectFile;
import org.mpxj.Task;
import org.mpxj.reader.UniversalProjectReader;
import org.springframework.boot.json.JsonParserFactory;

class WorkerProjectExportArtifactExpectedOutputTests {

    private final WorkerProjectExportArtifactHandoffService service =
            new WorkerProjectExportArtifactHandoffService(new MpxjMspdiExportArtifactService());

    @TempDir
    Path tempDir;

    @Test
    void syntheticCandidateMatchesExpectedOutputSummaryAndPreservesScheduleContext() throws Exception {
        Path root = repositoryRoot();
        Map<String, Object> expected = parseJson(root.resolve(
                "fixtures/import-export/synthetic-basic-wbs/expected-export-artifact-summary.json"));
        Map<String, Object> expectedSummary = map(expected.get("expected_summary"));
        Path output = tempDir.resolve(stringValue(expected, "output_filename"));
        UUID batchId = UUID.fromString("00000000-0000-0000-0000-000000000029");
        UUID projectId = UUID.fromString("00000000-0000-0000-0000-000000000030");

        ProjectExportArtifactGenerationResponse response = service.generateArtifact(
                new ProjectExportArtifactGenerationRequest(
                        batchId,
                        projectId,
                        output.toString(),
                        artifactRequest(expected, root)
                )
        );

        ProjectExportArtifactSummary summary = response.artifactSummary();
        assertThat(response.exportBatchId()).isEqualTo(batchId);
        assertThat(response.projectId()).isEqualTo(projectId);
        assertThat(response.exportFileUri()).isEqualTo(output.toAbsolutePath().normalize().toUri().toString());
        assertThat(response.exportFileHash()).isEqualTo(summary.sha256());
        assertThat(response.message()).contains("accepted source").contains("No Microsoft Project write-back");
        assertThat(summary.outputFilename()).isEqualTo(stringValue(expected, "output_filename"));
        assertThat(summary.artifactFormat()).isEqualTo(stringValue(expected, "artifact_format"));
        assertThat(summary.taskCount()).isEqualTo(intValue(expectedSummary, "task_count"));
        assertThat(summary.sourceTaskCount()).isEqualTo(intValue(expectedSummary, "source_task_count"));
        assertThat(summary.exportedFieldCount()).isEqualTo(intValue(expectedSummary, "exported_field_count"));
        assertThat(summary.sizeBytes()).isGreaterThanOrEqualTo(longValue(expectedSummary, "minimum_size_bytes"));
        assertThat(summary.sha256()).matches(stringValue(expectedSummary, "sha256_pattern"));
        assertThat(summary.notes()).containsExactlyElementsOf(stringList(expectedSummary.get("expected_notes")));

        ProjectFile project = readProject(output);
        assertThat(project.getProjectProperties().getName()).isEqualTo(stringValue(expected, "project_name"));
        assertThat(project.getTasks()).hasSize(intValue(expectedSummary, "source_task_count"));
        assertThat(project.getCalendars()).hasSize(1);
        assertExpectedTasks(project, expected);

        String xml = Files.readString(output);
        assertThat(xml).contains("<Calendars>", "<WBS>", "<Duration>", "<PredecessorLink>");
        assertThat(xml).doesNotContain("<PhysicalPercentComplete>");
        assertThat(root.resolve("fixtures/import-export/synthetic-basic-wbs/synthetic-candidate.mspdi.xml"))
                .doesNotExist();
    }

    @Test
    void expectedOutputDocumentsTemporarySyntheticScope() {
        Map<String, Object> expected = parseJson(repositoryRoot().resolve(
                "fixtures/import-export/synthetic-basic-wbs/expected-export-artifact-summary.json"));

        assertThat(expected.get("fixture_id")).isEqualTo("synthetic-basic-wbs");
        assertThat(expected.get("candidate_derived_from_accepted_source")).isEqualTo(Boolean.TRUE);
        assertThat(expected.get("synthetic_or_sanitized")).isEqualTo("synthetic");
        assertThat(expected.get("contains_real_project_data")).isEqualTo(Boolean.FALSE);
        assertThat(expected.get("generated_artifact_committed")).isEqualTo(Boolean.FALSE);
        assertThat(objectList(expected.get("expected_tasks")).stream()
                .flatMap(task -> map(task.get("expected_fields")).values().stream())
                .map(String::valueOf))
                .anyMatch(value -> value.endsWith("+08:00"));
        assertThat(stringList(expected.get("expected_preserved_elements")))
                .contains("Calendars", "PredecessorLink", "WBS", "Duration", "Summary");
        assertThat(stringList(expected.get("excluded_scope")))
                .contains("summary task exports", "native MPP writing", "Microsoft Project automation",
                        "Project write-back", "schedule calculations by Shutdown Tracker");
    }

    private ProjectExportArtifactRequest artifactRequest(Map<String, Object> expected, Path root) throws Exception {
        Path sourcePath = root.resolve("fixtures/import-export/synthetic-basic-wbs")
                .resolve(stringValue(expected, "source_file"));
        ProjectExportArtifactSource source = new ProjectExportArtifactSource(
                UUID.fromString("00000000-0000-0000-0000-0000000000f1"),
                sourcePath.toUri().toString(),
                HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(sourcePath)))
        );
        return new ProjectExportArtifactRequest(
                stringValue(expected, "project_name"),
                source,
                objectList(expected.get("expected_tasks")).stream().map(this::artifactTask).toList()
        );
    }

    private ProjectExportArtifactTask artifactTask(Map<String, Object> expectedTask) {
        List<ProjectExportArtifactFieldValue> values = map(expectedTask.get("expected_fields")).entrySet().stream()
                .map(entry -> new ProjectExportArtifactFieldValue(
                        ProjectExportArtifactField.fromFieldName(entry.getKey()), String.valueOf(entry.getValue())))
                .toList();
        return new ProjectExportArtifactTask(
                stringValue(expectedTask, "imported_task_id"),
                String.valueOf(intValue(expectedTask, "microsoft_project_task_uid")),
                String.valueOf(intValue(expectedTask, "microsoft_project_task_id")),
                stringValue(expectedTask, "task_name"),
                booleanValue(expectedTask, "leaf_task"),
                values
        );
    }

    private void assertExpectedTasks(ProjectFile project, Map<String, Object> expected) {
        for (Map<String, Object> expectedTask : objectList(expected.get("expected_tasks"))) {
            Task actual = taskWithUid(project, intValue(expectedTask, "microsoft_project_task_uid"));
            assertThat(actual.getID()).isEqualTo(intValue(expectedTask, "microsoft_project_task_id"));
            assertThat(actual.getName()).isEqualTo(stringValue(expectedTask, "task_name"));
            Map<String, Object> fields = map(expectedTask.get("expected_fields"));
            if (fields.containsKey("percent_complete")) {
                assertThat(actual.getPercentageComplete().intValue()).isEqualTo(intValue(fields, "percent_complete"));
            }
            if (fields.containsKey("actual_start")) {
                assertThat(actual.getActualStart()).isEqualTo(dateTimeValue(fields, "actual_start"));
            }
            if (fields.containsKey("actual_finish")) {
                assertThat(actual.getActualFinish()).isEqualTo(dateTimeValue(fields, "actual_finish"));
            }
        }
    }

    private ProjectFile readProject(Path path) {
        try {
            UniversalProjectReader reader = new UniversalProjectReader();
            try (UniversalProjectReader.ProjectReaderProxy proxy = reader.getProjectReaderProxy(path.toFile())) {
                return proxy.read();
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to read generated candidate MSPDI/XML.", exception);
        }
    }

    private Task taskWithUid(ProjectFile project, int uid) {
        return project.getTasks().stream()
                .filter(task -> task != null && Integer.valueOf(uid).equals(task.getUniqueID()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Expected task UID was not found: " + uid));
    }

    private Path repositoryRoot() {
        Path current = Path.of("").toAbsolutePath().normalize();
        while (current != null) {
            if (Files.isRegularFile(current.resolve(
                    "fixtures/import-export/synthetic-basic-wbs/expected-export-artifact-summary.json"))) {
                return current;
            }
            current = current.getParent();
        }
        throw new IllegalStateException("Repository root with export fixture was not found.");
    }

    private Map<String, Object> parseJson(Path path) {
        try {
            return JsonParserFactory.getJsonParser().parseMap(Files.readString(path));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to read test file: " + path, exception);
        }
    }

    @SuppressWarnings("unchecked") private Map<String, Object> map(Object value) { return (Map<String, Object>) value; }
    @SuppressWarnings("unchecked") private List<Map<String, Object>> objectList(Object value) { return (List<Map<String, Object>>) value; }
    @SuppressWarnings("unchecked") private List<String> stringList(Object value) { return (List<String>) value; }
    private String stringValue(Map<String, Object> values, String key) { return (String) values.get(key); }
    private int intValue(Map<String, Object> values, String key) { return ((Number) values.get(key)).intValue(); }
    private long longValue(Map<String, Object> values, String key) { return ((Number) values.get(key)).longValue(); }
    private boolean booleanValue(Map<String, Object> values, String key) { return (Boolean) values.get(key); }
    private LocalDateTime dateTimeValue(Map<String, Object> values, String key) {
        return OffsetDateTime.parse(stringValue(values, key)).toLocalDateTime();
    }
}
