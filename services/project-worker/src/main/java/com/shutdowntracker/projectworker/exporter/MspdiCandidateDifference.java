package com.shutdowntracker.projectworker.exporter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.xml.XMLConstants;
import org.w3c.dom.Attr;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;

/**
 * Reports every way a generated candidate schedule differs from the accepted source.
 *
 * <p>This is the proof that Shutdown Tracker authored nothing but the approved execution inputs.
 * Repeated siblings are matched by name and occurrence, while tasks are matched by Project UID.
 */
final class MspdiCandidateDifference {

    private MspdiCandidateDifference() {
    }

    static List<String> find(
            Element source,
            Element candidate,
            Map<String, Map<String, String>> approvedByTaskUid
    ) {
        List<String> differences = new ArrayList<>();
        compare(source, candidate, "", approvedByTaskUid, differences);
        return List.copyOf(differences);
    }

    private static void compare(
            Element source,
            Element candidate,
            String path,
            Map<String, Map<String, String>> approved,
            List<String> differences
    ) {
        compareAttributes(source, candidate, path, differences);

        List<Element> sourceChildren = elementChildren(source);
        List<Element> candidateChildren = elementChildren(candidate);

        if (sourceChildren.isEmpty() && candidateChildren.isEmpty()) {
            if (!textOf(source).equals(textOf(candidate))) {
                differences.add("changed " + path);
            }
            return;
        }

        Map<String, Element> sourceByKey = indexByKey(sourceChildren);
        Map<String, Element> candidateByKey = indexByKey(candidateChildren);

        for (String key : sourceByKey.keySet()) {
            if (!candidateByKey.containsKey(key)) {
                differences.add("removed " + path + "/" + key);
            }
        }
        for (String key : candidateByKey.keySet()) {
            if (!sourceByKey.containsKey(key) && !isApprovedField(path, key, approved)) {
                differences.add("added " + path + "/" + key);
            }
        }
        for (Map.Entry<String, Element> entry : sourceByKey.entrySet()) {
            Element candidateChild = candidateByKey.get(entry.getKey());
            if (candidateChild == null || isApprovedField(path, entry.getKey(), approved)) {
                continue;
            }
            compare(entry.getValue(), candidateChild, path + "/" + entry.getKey(), approved, differences);
        }
    }

    private static void compareAttributes(
            Element source,
            Element candidate,
            String path,
            List<String> differences
    ) {
        Map<String, String> sourceAttributes = attributesOf(source);
        Map<String, String> candidateAttributes = attributesOf(candidate);

        for (Map.Entry<String, String> entry : sourceAttributes.entrySet()) {
            String candidateValue = candidateAttributes.get(entry.getKey());
            if (candidateValue == null) {
                differences.add("removed " + path + "/@" + entry.getKey());
            } else if (!candidateValue.equals(entry.getValue())) {
                differences.add("changed " + path + "/@" + entry.getKey());
            }
        }
        for (String name : candidateAttributes.keySet()) {
            if (!sourceAttributes.containsKey(name)) {
                differences.add("added " + path + "/@" + name);
            }
        }
    }

    private static Map<String, String> attributesOf(Element element) {
        Map<String, String> attributes = new LinkedHashMap<>();
        NamedNodeMap nodes = element.getAttributes();
        for (int index = 0; index < nodes.getLength(); index++) {
            Attr attribute = (Attr) nodes.item(index);
            if (XMLConstants.XMLNS_ATTRIBUTE_NS_URI.equals(attribute.getNamespaceURI())) {
                continue;
            }
            attributes.put(attribute.getName(), attribute.getValue());
        }
        return attributes;
    }

    private static Map<String, Element> indexByKey(List<Element> elements) {
        Map<String, Integer> seen = new LinkedHashMap<>();
        Map<String, Element> byKey = new LinkedHashMap<>();
        for (Element element : elements) {
            String identity = identityOf(element);
            int occurrence = seen.merge(identity, 1, Integer::sum) - 1;
            byKey.put(identity + "#" + occurrence, element);
        }
        return byKey;
    }

    private static String identityOf(Element element) {
        if (!"Task".equals(element.getLocalName())) {
            return element.getLocalName();
        }
        Element uid = firstChild(element, "UID");
        return "Task[" + (uid == null ? "?" : textOf(uid)) + "]";
    }

    private static boolean isApprovedField(
            String parentPath,
            String key,
            Map<String, Map<String, String>> approved
    ) {
        int occurrenceMark = key.lastIndexOf('#');
        if (occurrenceMark < 0 || !"0".equals(key.substring(occurrenceMark + 1))) {
            return false;
        }
        return approvedFieldsFor(parentPath, approved).containsKey(key.substring(0, occurrenceMark));
    }

    private static Map<String, String> approvedFieldsFor(
            String parentPath,
            Map<String, Map<String, String>> approved
    ) {
        int start = parentPath.lastIndexOf("Task[");
        if (start < 0) {
            return Map.of();
        }
        int end = parentPath.indexOf(']', start);
        if (end < 0 || parentPath.indexOf('/', end) >= 0) {
            return Map.of();
        }
        return approved.getOrDefault(parentPath.substring(start + "Task[".length(), end), Map.of());
    }

    private static List<Element> elementChildren(Element parent) {
        List<Element> children = new ArrayList<>();
        Node child = parent.getFirstChild();
        while (child != null) {
            if (child instanceof Element element) {
                children.add(element);
            }
            child = child.getNextSibling();
        }
        return children;
    }

    private static Element firstChild(Element parent, String localName) {
        Node child = parent.getFirstChild();
        while (child != null) {
            if (child instanceof Element element && localName.equals(element.getLocalName())) {
                return element;
            }
            child = child.getNextSibling();
        }
        return null;
    }

    private static String textOf(Element element) {
        StringBuilder text = new StringBuilder();
        Node child = element.getFirstChild();
        while (child != null) {
            if (child.getNodeType() == Node.TEXT_NODE || child.getNodeType() == Node.CDATA_SECTION_NODE) {
                text.append(child.getNodeValue());
            }
            child = child.getNextSibling();
        }
        return text.toString().trim();
    }
}
