package com.shutdowntracker.api.importbatch.handoff;

import com.shutdowntracker.api.importbatch.ImportBatchRecord;
import com.shutdowntracker.api.importreview.ImportReviewSnapshotDetail;
import com.shutdowntracker.projectimport.contract.ProjectParseSummaryResponse;

public record ImportBatchParseSnapshotHandoffResponse(
        ImportBatchRecord importBatch,
        ImportReviewSnapshotDetail snapshot,
        ProjectParseSummaryResponse parseSummary,
        String message
) {
}
