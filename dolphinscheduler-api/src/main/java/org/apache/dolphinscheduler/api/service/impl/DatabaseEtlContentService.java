/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 */
package org.apache.dolphinscheduler.api.service.impl;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;

import java.util.List;
import java.util.stream.Collectors;

/** Stores ETL JSON content in the DS database. */
@Service
public class DatabaseEtlContentService {

    private static final String TABLE = "t_ds_etl_content";

    private final JdbcTemplate jdbcTemplate;

    public DatabaseEtlContentService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void ensureTable() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + TABLE + " ("
                + "id BIGINT NOT NULL AUTO_INCREMENT,"
                + "full_name VARCHAR(512) NOT NULL,"
                + "file_name VARCHAR(255) NOT NULL,"
                + "content LONGTEXT NOT NULL,"
                + "description VARCHAR(500),"
                + "user_id BIGINT,"
                + "content_size BIGINT NOT NULL DEFAULT 0,"
                + "create_time DATETIME NOT NULL,"
                + "update_time DATETIME NOT NULL,"
                + "PRIMARY KEY (id), UNIQUE KEY uk_etl_full_name (full_name)"
                + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    public void save(String fullName, String fileName, String content, String description, Long userId) {
        String sql = "INSERT INTO " + TABLE
                + " (full_name,file_name,content,description,user_id,content_size,create_time,update_time)"
                + " VALUES (?,?,?,?,?,?,NOW(),NOW())"
                + " ON DUPLICATE KEY UPDATE file_name=VALUES(file_name),content=VALUES(content),"
                + "description=VALUES(description),user_id=VALUES(user_id),content_size=VALUES(content_size),"
                + "update_time=NOW()";
        jdbcTemplate.update(sql, fullName, fileName, content, description, userId,
                (long) (content == null ? 0 : content.getBytes(java.nio.charset.StandardCharsets.UTF_8).length));
    }

    public String find(String fullName) {
        return jdbcTemplate.query("SELECT content FROM " + TABLE + " WHERE full_name=?",
                ps -> ps.setString(1, fullName), rs -> rs.next() ? rs.getString(1) : null);
    }

    public List<ContentRecord> list(String parentPath) {
        String prefix = parentPath.endsWith("/") ? parentPath : parentPath + "/";
        return jdbcTemplate.query("SELECT full_name,file_name,content_size,create_time,update_time FROM " + TABLE
                        + " WHERE full_name LIKE ? ORDER BY file_name",
                ps -> ps.setString(1, prefix + "%"), (rs, rowNum) -> new ContentRecord(
                        rs.getString("full_name"), rs.getString("file_name"), rs.getLong("content_size"),
                        rs.getTimestamp("create_time"), rs.getTimestamp("update_time")))
                .stream()
                .filter(record -> record.fullName.substring(prefix.length()).indexOf('/') < 0)
                .collect(Collectors.toList());
    }

    public List<ContentRecord> listAll() {
        return jdbcTemplate.query("SELECT full_name,file_name,content_size,create_time,update_time FROM " + TABLE
                        + " ORDER BY full_name", (rs, rowNum) -> new ContentRecord(
                        rs.getString("full_name"), rs.getString("file_name"), rs.getLong("content_size"),
                        rs.getTimestamp("create_time"), rs.getTimestamp("update_time")));
    }

    public void delete(String fullName) {
        jdbcTemplate.update("DELETE FROM " + TABLE + " WHERE full_name=?", fullName);
    }

    public static class ContentRecord {
        private final String fullName;
        private final String fileName;
        private final long size;
        private final java.util.Date createTime;
        private final java.util.Date updateTime;

        public ContentRecord(String fullName, String fileName, long size,
                             java.util.Date createTime, java.util.Date updateTime) {
            this.fullName = fullName;
            this.fileName = fileName;
            this.size = size;
            this.createTime = createTime;
            this.updateTime = updateTime;
        }

        public String getFullName() { return fullName; }
        public String getFileName() { return fileName; }
        public long getSize() { return size; }
        public java.util.Date getCreateTime() { return createTime; }
        public java.util.Date getUpdateTime() { return updateTime; }
    }
}
