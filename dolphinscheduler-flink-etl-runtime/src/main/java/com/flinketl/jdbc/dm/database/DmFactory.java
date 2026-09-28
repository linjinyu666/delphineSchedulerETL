package com.flinketl.jdbc.dm.database;

import com.flinketl.jdbc.dm.database.dialect.DmDialect;
import org.apache.flink.connector.jdbc.core.database.JdbcFactory;
import org.apache.flink.connector.jdbc.core.database.catalog.JdbcCatalog;
import org.apache.flink.connector.jdbc.core.database.dialect.JdbcDialect;

/**
 * 达梦 JDBC Factory：注册到 META-INF/services 后，Flink SQL 就能用
 * WITH ('connector'='jdbc','driver'='dm.jdbc.driver.DmDriver',...) 建表
 *
 * 设计决策：
 *   - 达梦 JDBC 是商业产品，Flink 官方没有内置 DmFactory，需要我们以 SPI 方式扩展
 *   - 传入 com.flinketl.jdbc.dm.* 包路径，避免与 Flink 自身的 javax/jdbc 包冲突
 *   - URL 前缀 jdbc:dm: 与 内置 Oracle/MySQL/Postgres/... Factory 都不冲突
 */
public class DmFactory implements JdbcFactory {

    @Override
    public boolean acceptsURL(String url) {
        return url != null && url.startsWith("jdbc:dm:");
    }

    @Override
    public JdbcDialect createDialect() {
        return new DmDialect();
    }

    @Override
    public JdbcCatalog createCatalog(ClassLoader classLoader, String catalogName,
                                     String defaultDatabase, String username, String password, String baseUrl) {
        // 达梦暂不支持作为 Catalog；走 inline DDL 的方式
        return null;
    }
}
