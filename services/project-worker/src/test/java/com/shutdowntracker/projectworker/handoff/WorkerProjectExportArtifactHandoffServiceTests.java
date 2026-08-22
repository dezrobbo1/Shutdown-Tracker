package com.shutdowntracker.projectworker.handoff;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.shutdowntracker.projectexport.contract.ProjectExportArtifactField;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactFieldValue;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactGenerationRequest;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactGenerationResponse;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactRequest;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactSource;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactSummary;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactTask;
import com.shutdowntracker.projectworker.exporter.ProjectExportArtifactService;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class WorkerProjectExportArtifactHandoffServiceTests {

    @TempDir
    Path tempDir;

    @Test
    void passesAcceptedSourceAndOutputPathToCandidateGenerator() {
        UUID projectId = UUID.randomUUID();
        UUID exportBatchId = UUID.randomUUID();
        Path sourcePath = tempDir.resolve("accepted-source.mspdi.xml").toAbsolutePath().normalize();
        Path outputPath = tempDir.resolve("candidate.mspdi.xml").toAbsolutePath().normalize();
        CapturingProjectExportArtifactService artifactService = new CapturingProjectExportArtifactService();
        WorkerProjectExportArtifactHandoffService service = new WorkerProjectExportArtifactHandoffService(artifactService);
        ProjectExportArtifactGenerationRequest request = new ProjectExportArtifactGenerationRequest(
                exportBatchId,
                projectId,
                outputPath.toString(),
                new ProjectExportArtifactRequest(
                        "Synthetic Export Preview",
                        new ProjectExportArtifactSource(UUID.randomUUID(), sourcePath.toUri().toString(), "a".repeat(64)),
                        List.of(new ProjectExportArtifactTask(
                                "a1", "2", "2", "Synthetic Task A1", true,
                                List.of(new ProjectExportArtifactFieldValue(ProjectExportArtifactField.PERCENT_COMPLETE, "75"))
                        ))
                )
        );

        ProjectExportArtifactGenerationResponse response = service.generateArtifact(request);

        assertThat(artifactService.request).isEqualTo(request.artifactRequest());
        assertThat(artifactService.sourcePath).isEqualTo(sourcePath);
        assertThat(artifactService.outputPath).isEqualTo(outputPath);
        assertThat(response.exportBatchId()).isEqualTo(exportBatchId);
        assertThat(response.projectId()).isEqualTo(projectId);
        assertThat(response.exportFileUri()).isEqualTo(outputPath.toUri().toString());
        assertThat(response.exportFileHash()).isEqualTo("synthetic-sha256");
        assertThat(response.artifactSummary().sourceTaskCount()).isEqualTo(6);
        assertThat(response.message()).contains("accepted source").contains("No Microsoft Project write-back");
    }

    @Test
    void rejectsNonLocalAcceptedSourceUntilStorageContractSupportsIt() {
        WorkerProjectExportArtifactHandoffService service =
                new WorkerProjectExportArtifactHandoffService(new CapturingProjectExportArtifactService());
        ProjectExportArtifactGenerationRequest request = new ProjectExportArtifactGenerationRequest(
                UUID.randomUUID(),
                UUID.randomUUID(),
                tempDir.resolve("candidate.xml").toString(),
                new ProjectExportArtifactRequest(
                        "Synthetic",
                        new ProjectExportArtifactSource(UUID.randomUUID(), "s3://bucket/source.xml", "a".repeat(64)),
                        List.of(new ProjectExportArtifactTask(
                                "a1", "2", "2", "Synthetic Task A1", true,
                                List.of(new ProjectExportArtifactFieldValue(ProjectExportArtifactField.PERCENT_COMPLETE, "75"))
                        ))
                )
        );

        assertThatThrownBy(() -> service.generateArtifact(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("requires a local file source URI");
    }

    private static class CapturingProjectExportArtifactService implements ProjectExportArtifactService {
        private ProjectExportArtifactRequest request;
        private Path sourcePath;
        private Path outputPath;

        @Override
        public ProjectExportArtifactSummary generate(ProjectExportArtifactRequest request, Path sourcePath, Path outputPath) {
            this.request = request;
            this.sourcePath = sourcePath;
            this.outputPath = outputPath;
            return new ProjectExportArtifactSummary(
                    outputPath.getFileName().toString(),
                    "mspdi_xml",
                    request.tasks().size(),
                    6,
                    request.tasks().stream().mapToInt(task -> task.fieldValues().size()).sum(),
                    512,
                    "synthetic-sha256",
                    List.of("Candidate schedule derived from accepted source")
            );
        }
    }
}
