package com.shutdowntracker.projectworker.exporter;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Element;

class MspdiCandidateDifferenceTests {

    @Test
    void allowsOnlyTheExactApprovedTaskFieldDifference() throws Exception {
        Element source = xml("""
                <Project xmlns="http://schemas.microsoft.com/project"><Tasks><Task><UID>2</UID><ID>2</ID></Task></Tasks></Project>
                """);
        Element candidate = xml("""
                <Project xmlns="http://schemas.microsoft.com/project"><Tasks><Task><UID>2</UID><ID>2</ID><PercentComplete>75</PercentComplete></Task></Tasks></Project>
                """);

        assertThat(MspdiCandidateDifference.find(
                source,
                candidate,
                Map.of("2", Map.of("PercentComplete", "75"))
        )).isEmpty();
    }

    @Test
    void detectsUnapprovedFieldAndAttributeChanges() throws Exception {
        Element source = xml("""
                <Project xmlns="http://schemas.microsoft.com/project"><Tasks flag="one"><Task><UID>2</UID><ID>2</ID></Task></Tasks></Project>
                """);
        Element candidate = xml("""
                <Project xmlns="http://schemas.microsoft.com/project"><Tasks flag="two"><Task><UID>2</UID><ID>3</ID></Task></Tasks></Project>
                """);

        List<String> differences = MspdiCandidateDifference.find(source, candidate, Map.of());
        assertThat(differences).anyMatch(value -> value.contains("@flag"));
        assertThat(differences).anyMatch(value -> value.contains("ID"));
    }

    @Test
    void comparesEveryRepeatedSiblingRatherThanOnlyTheFirst() throws Exception {
        Element source = xml("""
                <Project xmlns="http://schemas.microsoft.com/project"><Calendars><Calendar><WeekDays>
                  <WeekDay><DayType>1</DayType></WeekDay><WeekDay><DayType>2</DayType></WeekDay>
                </WeekDays></Calendar></Calendars></Project>
                """);
        Element candidate = xml("""
                <Project xmlns="http://schemas.microsoft.com/project"><Calendars><Calendar><WeekDays>
                  <WeekDay><DayType>1</DayType></WeekDay><WeekDay><DayType>7</DayType></WeekDay>
                </WeekDays></Calendar></Calendars></Project>
                """);

        assertThat(MspdiCandidateDifference.find(source, candidate, Map.of()))
                .anyMatch(value -> value.contains("WeekDay#1") && value.contains("DayType"));
    }

    @Test
    void matchesTasksByProjectUidRatherThanDocumentPosition() throws Exception {
        Element source = xml("""
                <Project xmlns="http://schemas.microsoft.com/project"><Tasks>
                  <Task><UID>2</UID><ID>2</ID><Name>A</Name></Task>
                  <Task><UID>3</UID><ID>3</ID><Name>B</Name></Task>
                </Tasks></Project>
                """);
        Element candidate = xml("""
                <Project xmlns="http://schemas.microsoft.com/project"><Tasks>
                  <Task><UID>3</UID><ID>3</ID><Name>B</Name></Task>
                  <Task><UID>2</UID><ID>2</ID><Name>A</Name></Task>
                </Tasks></Project>
                """);

        assertThat(MspdiCandidateDifference.find(source, candidate, Map.of())).isEmpty();
    }

    private Element xml(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        return factory.newDocumentBuilder()
                .parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)))
                .getDocumentElement();
    }
}
