package com.shutdowntracker.api.exportpreview.handoff;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

class ExportArtifactSourceKindTests {

    @Test
    void plainXmlAndExplicitMspdiKindsProceedToWorkerContentValidation() throws Exception {
        ExportArtifactHandoffService service = new ExportArtifactHandoffService(null, null, null, null);
        Method method = ExportArtifactHandoffService.class.getDeclaredMethod("isXmlCandidateSource", String.class);
        method.setAccessible(true);

        assertThat(method.invoke(service, "xml")).isEqualTo(true);
        assertThat(method.invoke(service, "mspdi_xml")).isEqualTo(true);
        assertThat(method.invoke(service, "mpp")).isEqualTo(false);
        assertThat(method.invoke(service, "other")).isEqualTo(false);
    }
}
