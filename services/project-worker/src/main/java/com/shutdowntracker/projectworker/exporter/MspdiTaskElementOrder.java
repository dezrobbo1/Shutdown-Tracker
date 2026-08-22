package com.shutdowntracker.projectworker.exporter;

import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlType;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;

/**
 * The order MSPDI requires for the child elements of a {@code <Task>}.
 *
 * <p>The order is read from MPXJ's own JAXB binding rather than maintained separately, so a new
 * approved field is inserted where the schema expects it. Unknown elements from a newer Project
 * version are ignored for placement rather than guessed to be last.
 */
final class MspdiTaskElementOrder {

    private static final String MSPDI_TASK_CLASS = "org.mpxj.mspdi.schema.Project$Tasks$Task";
    private static final Map<String, Integer> POSITIONS = loadPositions();

    private MspdiTaskElementOrder() {
    }

    static int positionOf(String elementLocalName) {
        Integer position = POSITIONS.get(elementLocalName);
        if (position == null) {
            throw new IllegalArgumentException("'" + elementLocalName + "' is not an MSPDI task element.");
        }
        return position;
    }

    static OptionalInt knownPositionOf(String elementLocalName) {
        Integer position = POSITIONS.get(elementLocalName);
        return position == null ? OptionalInt.empty() : OptionalInt.of(position);
    }

    private static Map<String, Integer> loadPositions() {
        Class<?> taskClass;
        try {
            taskClass = Class.forName(MSPDI_TASK_CLASS);
        } catch (ClassNotFoundException exception) {
            throw new IllegalStateException(
                    "MPXJ's MSPDI task binding is required to place approved fields in schema order.",
                    exception
            );
        }

        XmlType xmlType = taskClass.getAnnotation(XmlType.class);
        if (xmlType == null || xmlType.propOrder().length == 0) {
            throw new IllegalStateException("MPXJ's MSPDI task binding no longer declares an element order.");
        }

        Map<String, String> elementNamesByProperty = new HashMap<>();
        for (Field field : taskClass.getDeclaredFields()) {
            XmlElement element = field.getAnnotation(XmlElement.class);
            boolean named = element != null && !"##default".equals(element.name());
            elementNamesByProperty.put(field.getName(), named ? element.name() : field.getName());
        }

        List<String> ordered = new ArrayList<>();
        for (String property : xmlType.propOrder()) {
            String elementName = elementNamesByProperty.get(property);
            if (elementName == null) {
                throw new IllegalStateException(
                        "MPXJ's MSPDI task binding declares an element order entry with no matching field: "
                                + property
                );
            }
            ordered.add(elementName);
        }

        Map<String, Integer> positions = new HashMap<>();
        for (int index = 0; index < ordered.size(); index++) {
            positions.putIfAbsent(ordered.get(index), index);
        }
        return Map.copyOf(positions);
    }
}
