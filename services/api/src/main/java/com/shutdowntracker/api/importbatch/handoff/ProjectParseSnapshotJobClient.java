package com.shutdowntracker.api.importbatch.handoff;

import com.shutdowntracker.projectimport.contract.ProjectParseSnapshotResponse;
import com.shutdowntracker.projectimport.contract.ProjectParseSummaryRequest;

public interface ProjectParseSnapshotJobClient {

    ProjectParseSnapshotResponse requestParseSnapshot(ProjectParseSummaryRequest request);
}
