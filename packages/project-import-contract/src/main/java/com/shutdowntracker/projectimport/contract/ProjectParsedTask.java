package com.shutdowntracker.projectimport.contract;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProjectParsedTask(
        String externalUid,
        String externalId,
        String name,
        String wbs,
        String outlineNumber,
        Integer outlineLevel,
        boolean summary,
        String parentExternalUid,
        LocalDateTime plannedStart,
        LocalDateTime plannedFinish,
        LocalDateTime actualStart,
        LocalDateTime actualFinish,
        BigDecimal percentComplete,
        BigDecimal physicalPercentComplete,
        String notes
) {
}
