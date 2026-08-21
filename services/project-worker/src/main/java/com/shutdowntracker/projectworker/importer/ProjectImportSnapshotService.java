package com.shutdowntracker.projectworker.importer;

import java.nio.file.Path;

public interface ProjectImportSnapshotService {

    ProjectImportSnapshot parse(Path sourcePath);
}
