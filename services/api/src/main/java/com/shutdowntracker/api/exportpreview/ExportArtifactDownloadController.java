package com.shutdowntracker.api.exportpreview;

import com.shutdowntracker.api.exportpreview.storage.ExportArtifactStorageProperties;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/projects/{projectId}/export-preview")
@ConditionalOnProperty(prefix = "shutdown-tracker.persistence", name = "enabled", havingValue = "true")
public class ExportArtifactDownloadController {

    private final ExportPreviewService previewService;
    private final ExportArtifactStorageProperties storageProperties;

    public ExportArtifactDownloadController(
            ExportPreviewService previewService,
            ExportArtifactStorageProperties storageProperties
    ) {
        this.previewService = previewService;
        this.storageProperties = storageProperties;
    }

    @GetMapping("/{exportBatchId}/artifact")
    public ResponseEntity<byte[]> download(
            @PathVariable UUID projectId,
            @PathVariable UUID exportBatchId
    ) {
        ExportPreviewDetail detail = previewService.getPreview(projectId, exportBatchId);
        String artifactUri = detail.batch().exportFileUri();
        String expectedHash = detail.batch().exportFileHash();
        if (artifactUri == null || artifactUri.isBlank() || expectedHash == null || expectedHash.isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Export artifact has not been generated yet.");
        }

        URI uri = URI.create(artifactUri);
        if (!"file".equalsIgnoreCase(uri.getScheme())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_IMPLEMENTED,
                    "Browser artifact download currently supports local file storage only."
            );
        }

        Path root = storageProperties.localRoot().toAbsolutePath().normalize();
        Path projectRoot = root.resolve(projectId.toString()).normalize();
        Path artifactPath = Path.of(uri).toAbsolutePath().normalize();
        if (!artifactPath.startsWith(projectRoot)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Export artifact path is outside the configured project storage root.");
        }
        if (!Files.isRegularFile(artifactPath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Generated export artifact file was not found.");
        }

        try {
            byte[] bytes = Files.readAllBytes(artifactPath);
            String actualHash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
            if (!actualHash.equalsIgnoreCase(expectedHash)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Stored export artifact hash does not match recorded provenance.");
            }

            String filename = artifactPath.getFileName().toString();
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_XML)
                    .contentLength(bytes.length)
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.attachment().filename(filename).build().toString()
                    )
                    .header("X-Shutdown-Tracker-SHA256", actualHash)
                    .body(bytes);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read generated export artifact.", exception);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to verify generated export artifact.", exception);
        }
    }
}
