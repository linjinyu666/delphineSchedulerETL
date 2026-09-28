package com.example.flink.pipeline;

import java.util.regex.Pattern;
import java.util.regex.Matcher;

/** Removes credential values from diagnostic text before it is written to ETL logs. */
public final class LogSanitizer {

    private static final String SECRET_KEY = "(?:username|user|password|passwd|pwd|secret(?:[-_]?key)?|access[-_]?key|token|client[-_]?secret)";
    private static final Pattern SECRET_ASSIGNMENT_PREFIX = Pattern.compile(
            "(?i)(?<![A-Za-z0-9_])['\"]?" + SECRET_KEY + "['\"]?\\s*[:=]\\s*");
    private static final Pattern URL_USER_INFO = Pattern.compile(
            "(jdbc:[^\\s'\"]*?://)([^:/@\\s]+):([^@/\\s'\"]+)(@)", Pattern.CASE_INSENSITIVE);

    private LogSanitizer() {
    }

    /**
     * Redacts common JDBC/SQL/property credential assignments while preserving the surrounding
     * diagnostic text. This is intentionally applied to log text only; runtime configuration and
     * SQL sent to Flink are not modified.
     */
    public static String redactCredentials(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }

        String sanitized = replaceAssignedSecrets(text);
        Matcher urlMatcher = URL_USER_INFO.matcher(sanitized);
        return urlMatcher.replaceAll("$1******:******$4");
    }

    private static String replaceAssignedSecrets(String text) {
        Matcher matcher = SECRET_ASSIGNMENT_PREFIX.matcher(text);
        StringBuilder result = new StringBuilder(text.length());
        int copiedThrough = 0;
        while (matcher.find(copiedThrough)) {
            int valueStart = matcher.end();
            result.append(text, copiedThrough, valueStart);
            if (valueStart < text.length() && (text.charAt(valueStart) == '\'' || text.charAt(valueStart) == '"')) {
                char quote = text.charAt(valueStart);
                result.append(quote).append("******");
                int valueEnd = valueStart + 1;
                while (valueEnd < text.length()) {
                    char current = text.charAt(valueEnd);
                    if (current == '\\' && valueEnd + 1 < text.length() && text.charAt(valueEnd + 1) == quote) {
                        valueEnd += 2;
                    } else if (current == quote && valueEnd + 1 < text.length() && text.charAt(valueEnd + 1) == quote) {
                        valueEnd += 2;
                    } else if (current == quote) {
                        valueEnd++;
                        break;
                    } else {
                        valueEnd++;
                    }
                }
                if (valueEnd <= text.length() && valueEnd > valueStart + 1
                        && text.charAt(valueEnd - 1) == quote) {
                    result.append(quote);
                }
                copiedThrough = valueEnd;
            } else {
                int valueEnd = valueStart;
                while (valueEnd < text.length()) {
                    char current = text.charAt(valueEnd);
                    if (Character.isWhitespace(current) || current == ',' || current == ';'
                            || current == ')' || current == '}' || current == '&') {
                        break;
                    }
                    valueEnd++;
                }
                result.append("******");
                copiedThrough = valueEnd;
            }
        }
        result.append(text, copiedThrough, text.length());
        return result.toString();
    }
}
