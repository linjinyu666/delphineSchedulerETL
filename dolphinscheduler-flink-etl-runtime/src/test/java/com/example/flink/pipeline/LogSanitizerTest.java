package com.example.flink.pipeline;

import org.junit.Test;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class LogSanitizerTest {

    @Test
    public void redactsQuotedFlinkJdbcOptionsButKeepsDiagnosticContext() {
        String rawPassword = "local-db-password-should-not-appear";
        String rawUsername = "etl-user-should-not-appear";
        String ddl = "CREATE TABLE source1 WITH ('username' = '" + rawUsername
                + "', 'password' = '" + rawPassword + "', 'table-name' = 'orders')";

        String sanitized = LogSanitizer.redactCredentials(ddl);

        assertFalse(sanitized.contains(rawPassword));
        assertFalse(sanitized.contains(rawUsername));
        assertTrue(sanitized.contains("'password' = '******'"));
        assertTrue(sanitized.contains("'username' = '******'"));
        assertTrue(sanitized.contains("'table-name' = 'orders'"));
    }

    @Test
    public void redactsPropertiesUrlCredentialsAndUnquotedSecrets() {
        String rawPassword = "url-password-should-not-appear";
        String rawToken = "token-should-not-appear";
        String diagnostics = "jdbc:mysql://etluser:" + rawPassword
                + "@db.internal:3306/etl?useSSL=false token=" + rawToken + " retry=3";

        String sanitized = LogSanitizer.redactCredentials(diagnostics);

        assertFalse(sanitized.contains(rawPassword));
        assertFalse(sanitized.contains(rawToken));
        assertTrue(sanitized, sanitized.contains("jdbc:mysql://******:******@db.internal:3306/etl"));
        assertTrue(sanitized.contains("token=****** retry=3"));
    }

    @Test
    public void leavesOrdinarySqlIdentifiersUntouched() {
        String diagnostics = "SELECT password_hash, user_id FROM customer";

        assertTrue(LogSanitizer.redactCredentials(diagnostics).equals(diagnostics));
    }
}
