package com.shutdowntracker.projectworker.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class MpxjProjectImportSnapshotServiceTests {

    private final MpxjProjectImportSnapshotService service = new MpxjProjectImportSnapshotService(
            new MpxjProjectImportSummaryService()
    );

    @Test
    void parsesSyntheticFixtureIntoReviewableTaskFactsWithoutScheduling() {
        ProjectImportSnapshot snapshot = service.parse(repositoryRoot()
                .resolve("fixtures/import-export/synthetic-basic-wbs/synthetic-basic-wbs.mspdi.xml"));

        assertThat(snapshot.summary().projectName()).isEqualTo("Synthetic Basic WBS");
        assertThat(snapshot.tasks()).hasSize(6);
        assertThat(snapshot.tasks()).filteredOn(task -> task.summary()).hasSize(2);
        assertThat(snapshot.tasks()).filteredOn(task -> !task.summary()).hasSize(4);

        var taskA1 = snapshot.tasks().stream()
                .filter(task -> "2".equals(task.externalUid()))
                .findFirst()
                .orElseThrow();

        assertThat(taskA1.externalId()).isEqualTo("2");
        assertThat(taskA1.name()).isEqualTo("Synthetic Task A1");
        assertThat(taskA1.wbs()).isEqualTo("1.1");
        assertThat(taskA1.outlineNumber()).isEqualTo("1.1");
        assertThat(taskA1.outlineLevel()).isEqualTo(2);
        assertThat(taskA1.summary()).isFalse();
        assertThat(taskA1.parentExternalUid()).isEqualTo("1");
        assertThat(taskA1.plannedStart()).isNotNull();
        assertThat(taskA1.plannedFinish()).isNotNull();
        assertThat(taskA1.actualStart()).isNull();
        assertThat(taskA1.actualFinish()).isNull();
    }

    private Path repositoryRoot() {
        Path current = Path.of("").toAbsolutePath().normalize();
        while (current != null) {
            Path fixture = current.resolve("fixtures/import-export/synthetic-basic-wbs/synthetic-basic-wbs.mspdi.xml");
            if (Files.isRegularFile(fixture)) {
                return current;
            }
            current = current.getParent();
        }
        throw new IllegalStateException("Repository root with synthetic MSPDI fixture was not found.");
    }
}
