package com.shutdowntracker.projectworker.exporter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.shutdowntracker.projectexport.contract.ProjectExportArtifactField;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactFieldValue;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactRequest;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactSource;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactSummary;
import com.shutdowntracker.projectexport.contract.ProjectExportArtifactTask;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mpxj.ProjectFile;
import org.mpxj.Task;
import org.mpxj.reader.UniversalProjectReader;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

class MpxjMspdiExportArtifactServiceTests {

    private static final String NOTE =
            "Candidate schedule derived from the accepted source; no schedule calculations or "
                    + "Microsoft Project write-back were run by Shutdown Tracker.";
    private static final Path SOURCE = Path.of("..", "..", "fixtures", "import-export",
            "synthetic-basic-wbs", "synthetic-basic-wbs.mspdi.xml").toAbsolutePath().normalize();

    private static ProjectExportArtifactSource SOURCE_DESCRIPTOR;

    private final MpxjMspdiExportArtifactService service = new MpxjMspdiExportArtifactService();

    @TempDir
    Path tempDir;

    @BeforeAll
    static void sourceDescriptor() throws Exception {
        SOURCE_DESCRIPTOR = descriptor(SOURCE);
    }

    @Test
    void generatesCompleteCandidateAndPreservesSourceScheduleContext() throws Exception {
        Path output = tempDir.resolve("candidate.mspdi.xml");

        ProjectExportArtifactSummary summary = service.generate(request(), SOURCE, output);

        assertThat(summary.taskCount()).isEqualTo(2);
        assertThat(summary.sourceTaskCount()).isEqualTo(6);
        assertThat(summary.exportedFieldCount()).isEqualTo(3);
        assertThat(summary.notes()).containsExactly(NOTE);
        assertThat(summary.sha256()).hasSize(64);

        Element project = parse(output);
        assertThat(directNames(project)).contains("Calendars", "Tasks", "Name");
        Element tasks = child(project, "Tasks");
        assertThat(directNames(tasks)).containsOnly("Task").hasSize(6);
        assertThat(directNames(taskElement(tasks, "2")))
                .contains("WBS", "OutlineNumber", "OutlineLevel", "Duration", "PercentComplete", "ActualStart");
        assertThat(directNames(taskElement(tasks, "3"))).contains("PredecessorLink", "ActualFinish");
        assertThat(directNames(taskElement(tasks, "1"))).contains("Summary");
        assertThat(directNames(taskElement(tasks, "4"))).contains("Summary");

        ProjectFile parsed = readProject(output);
        assertThat(parsed.getProjectProperties().getName()).isEqualTo("Synthetic Basic WBS");
        assertThat(parsed.getTasks()).hasSize(6);
        assertThat(parsed.getCalendars()).hasSize(1);
        Task a1 = task(parsed, 2);
        assertThat(a1.getPercentageComplete().intValue()).isEqualTo(75);
        assertThat(a1.getActualStart()).isEqualTo(LocalDateTime.of(2026, 1, 5, 7, 0));
        assertThat(a1.getWBS()).isEqualTo("1.1");
        Task a2 = task(parsed, 3);
        assertThat(a2.getActualFinish()).isEqualTo(LocalDateTime.of(2026, 1, 6, 15, 0));
        assertThat(a2.getPredecessors()).hasSize(1);
    }

    @Test
    void insertsApprovedFieldsInMspdiTaskSequence() throws Exception {
        Path output = tempDir.resolve("ordered.mspdi.xml");
        service.generate(request(), SOURCE, output);

        Element tasks = child(parse(output), "Tasks");
        assertThat(directNames(taskElement(tasks, "2")))
                .endsWith("Summary", "PercentComplete", "ActualStart");
        assertThat(directNames(taskElement(tasks, "3")))
                .endsWith("Summary", "ActualFinish", "PredecessorLink");
    }

    @Test
    void unknownNewerProjectElementCannotMisplaceApprovedField() throws Exception {
        Path source = tempDir.resolve("newer-source.xml");
        Files.writeString(source, Files.readString(SOURCE).replace(
                "<OutlineNumber>1.2</OutlineNumber>",
                "<OutlineNumber>1.2</OutlineNumber>\n      <UnmodelledTaskElement>1</UnmodelledTaskElement>"
        ));
        ProjectExportArtifactRequest request = new ProjectExportArtifactRequest(
                "Diagnostic",
                descriptor(source),
                List.of(actualFinishA2())
        );
        Path output = tempDir.resolve("newer-candidate.xml");

        service.generate(request, source, output);

        List<String> names = directNames(taskElement(child(parse(output), "Tasks"), "3"));
        assertThat(names).containsSequence("OutlineNumber", "UnmodelledTaskElement", "OutlineLevel");
        assertThat(names).containsSequence("Summary", "ActualFinish", "PredecessorLink");
    }

    @Test
    void refusesSourceWhoseBytesNoLongerMatchImportedHash() throws Exception {
        Path changed = tempDir.resolve("changed.xml");
        Files.writeString(changed, Files.readString(SOURCE).replace("Synthetic Basic WBS", "Changed project"));

        assertThatThrownBy(() -> service.generate(request(), changed, tempDir.resolve("out.xml")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no longer matches the hash recorded at import");
    }

    @Test
    void refusesApprovedTaskMissingFromAcceptedSource() {
        ProjectExportArtifactRequest missing = new ProjectExportArtifactRequest(
                "Missing task",
                SOURCE_DESCRIPTOR,
                List.of(percentTask("missing", "999", "999", "Missing task", "50"))
        );

        assertThatThrownBy(() -> service.generate(missing, SOURCE, tempDir.resolve("missing.xml")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("absent from the accepted source schedule")
                .hasMessageContaining("999");
    }

    @Test
    void refusesReviewedIdentityThatNoLongerMatchesAcceptedSource() {
        ProjectExportArtifactRequest mismatched = new ProjectExportArtifactRequest(
                "Mismatched task",
                SOURCE_DESCRIPTOR,
                List.of(percentTask("a1", "2", "2", "Wrong task name", "50"))
        );

        assertThatThrownBy(() -> service.generate(mismatched, SOURCE, tempDir.resolve("mismatch.xml")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no longer matches the reviewed Name");
    }

    @Test
    void acceptsWholeNumberProgressAndPreservesReviewedWallClock() throws Exception {
        ProjectExportArtifactRequest request = new ProjectExportArtifactRequest(
                "Boundary inputs",
                SOURCE_DESCRIPTOR,
                List.of(
                        percentTask("b1", "5", "5", "Synthetic Task B1", "100.0"),
                        new ProjectExportArtifactTask(
                                "b2", "6", "6", "Synthetic Task B2", true,
                                List.of(new ProjectExportArtifactFieldValue(
                                        ProjectExportArtifactField.ACTUAL_START,
                                        "2026-01-08T07:00:00.000000+08:00"))
                        )
                )
        );
        Path output = tempDir.resolve("boundaries.xml");
        service.generate(request, SOURCE, output);

        assertThat(request.tasks().getFirst().fieldValues().getFirst().newValue()).isEqualTo("100");
        assertThat(request.tasks().get(1).fieldValues().getFirst().newValue())
                .isEqualTo("2026-01-08T07:00:00+08:00");
        assertThat(task(readProject(output), 5).getPercentageComplete().intValue()).isEqualTo(100);
        assertThat(task(readProject(output), 6).getActualStart())
                .isEqualTo(LocalDateTime.of(2026, 1, 8, 7, 0));
    }

    @Test
    void rejectsInvalidPercentAndOffsetFreeDatesAtContractBoundary() {
        assertThatThrownBy(() -> new ProjectExportArtifactFieldValue(ProjectExportArtifactField.PERCENT_COMPLETE, "101"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Percent complete must be between 0 and 100.");
        assertThatThrownBy(() -> new ProjectExportArtifactFieldValue(ProjectExportArtifactField.PERCENT_COMPLETE, "75.5"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Percent complete must be a whole number between 0 and 100.");
        assertThatThrownBy(() -> new ProjectExportArtifactFieldValue(
                ProjectExportArtifactField.ACTUAL_FINISH, "2026-01-05T16:00:00"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Project date-time value must be an ISO-8601 offset date-time.");
    }

    @Test
    void rejectsPhysicalPercentUntilASeparateHandoffPolicySupportsIt() {
        assertThatThrownBy(() -> ProjectExportArtifactField.fromFieldName("physical_percent_complete"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unsupported export artifact field: physical_percent_complete");
    }

    @Test
    void rejectsSummaryCandidatesDuplicateCandidatesAndAmbiguousTaskIdentity() {
        assertThatThrownBy(() -> new ProjectExportArtifactTask(
                "summary", "1", "1", "Synthetic Summary A", false,
                List.of(new ProjectExportArtifactFieldValue(ProjectExportArtifactField.PERCENT_COMPLETE, "50"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only leaf-task export candidates");

        ProjectExportArtifactTask first = percentTask("same", "2", "2", "Synthetic Task A1", "50");
        ProjectExportArtifactTask duplicate = percentTask("same", "2", "2", "Synthetic Task A1", "75");
        assertThatThrownBy(() -> new ProjectExportArtifactRequest("Duplicate", SOURCE_DESCRIPTOR, List.of(first, duplicate)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Duplicate export artifact candidate");

        ProjectExportArtifactTask one = percentTask("one", "5", "5", "Synthetic Task B1", "25");
        ProjectExportArtifactTask reusedId = percentTask("two", "6", "5", "Synthetic Task B2", "50");
        assertThatThrownBy(() -> new ProjectExportArtifactRequest("Ambiguous", SOURCE_DESCRIPTOR, List.of(one, reusedId)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Each Microsoft Project task ID must map to exactly one imported task");
    }

    @Test
    void rejectsNonXmlOutputPathAndNonCanonicalIdentity() {
        assertThatThrownBy(() -> service.generate(request(), SOURCE, tempDir.resolve("candidate.zip")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must end with .xml");
        assertThatThrownBy(() -> percentTask("bad", "+2", "2", "Synthetic Task A1", "25"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("microsoftProjectTaskUid must be a canonical positive integer.");
    }

    private ProjectExportArtifactRequest request() {
        return new ProjectExportArtifactRequest(
                "Synthetic Export Preview",
                SOURCE_DESCRIPTOR,
                List.of(
                        new ProjectExportArtifactTask(
                                "a1", "2", "2", "Synthetic Task A1", true,
                                List.of(
                                        new ProjectExportArtifactFieldValue(ProjectExportArtifactField.PERCENT_COMPLETE, "75"),
                                        new ProjectExportArtifactFieldValue(ProjectExportArtifactField.ACTUAL_START, "2026-01-05T07:00:00Z")
                                )
                        ),
                        actualFinishA2()
                )
        );
    }

    private ProjectExportArtifactTask actualFinishA2() {
        return new ProjectExportArtifactTask(
                "a2", "3", "3", "Synthetic Task A2", true,
                List.of(new ProjectExportArtifactFieldValue(ProjectExportArtifactField.ACTUAL_FINISH, "2026-01-06T15:00:00Z"))
        );
    }

    private ProjectExportArtifactTask percentTask(String importedId, String uid, String id, String name, String value) {
        return new ProjectExportArtifactTask(
                importedId, uid, id, name, true,
                List.of(new ProjectExportArtifactFieldValue(ProjectExportArtifactField.PERCENT_COMPLETE, value))
        );
    }

    private static ProjectExportArtifactSource descriptor(Path path) throws Exception {
        return new ProjectExportArtifactSource(
                UUID.fromString("00000000-0000-0000-0000-0000000000f1"),
                path.toUri().toString(),
                HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(path)))
        );
    }

    private Element parse(Path path) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        return factory.newDocumentBuilder().parse(path.toFile()).getDocumentElement();
    }

    private Element child(Element parent, String name) {
        Node child = parent.getFirstChild();
        while (child != null) {
            if (child instanceof Element element && name.equals(element.getLocalName())) {
                return element;
            }
            child = child.getNextSibling();
        }
        throw new AssertionError("Missing XML child " + name);
    }

    private Element taskElement(Element tasks, String uid) {
        Node node = tasks.getFirstChild();
        while (node != null) {
            if (node instanceof Element element
                    && "Task".equals(element.getLocalName())
                    && uid.equals(child(element, "UID").getTextContent().trim())) {
                return element;
            }
            node = node.getNextSibling();
        }
        throw new AssertionError("Missing task UID " + uid);
    }

    private List<String> directNames(Element parent) {
        List<String> names = new ArrayList<>();
        Node child = parent.getFirstChild();
        while (child != null) {
            if (child instanceof Element element) {
                names.add(element.getLocalName());
            }
            child = child.getNextSibling();
        }
        return names;
    }

    private ProjectFile readProject(Path path) {
        try {
            UniversalProjectReader reader = new UniversalProjectReader();
            try (UniversalProjectReader.ProjectReaderProxy proxy = reader.getProjectReaderProxy(path.toFile())) {
                return proxy.read();
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to read candidate MSPDI/XML.", exception);
        }
    }

    private Task task(ProjectFile file, int uid) {
        return file.getTasks().stream()
                .filter(task -> task != null && Integer.valueOf(uid).equals(task.getUniqueID()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing Project task UID " + uid));
    }
}
