package com.example.flink.pipeline;

import org.apache.flink.table.functions.ScalarFunction;

import java.nio.charset.StandardCharsets;

/**
 * 把各种 LOB / 类对象 反序列化成可读字符串。
 *
 * 达梦 JDBC 把 CLOB/NClob/BLOB 反序列化成强类型对象:
 *   - dm.jdbc.driver.DmdbClob      (implements java.sql.Clob, 含 public String data)
 *   - dm.jdbc.driver.DmdbNClob     (extends DmdbClob)
 *   - dm.jdbc.driver.DmdbBlob      (implements java.sql.Blob, 含 public byte[] data)
 *
 * Flink SQL 默认 toString 只能拿到对象 hash 字符串，对业务没意义。
 *
 * AS_TEXT UDF:
 *   - eval(byte[])  → UTF-8 string
 *   - eval(String)  → 原样
 *
 * 用法: SELECT id, AS_TEXT(c_clob) AS c_clob, AS_TEXT(c_blob) AS c_blob FROM source1
 *
 * 重要: 不能重载 eval(NClob/Clob/Blob) 这些 interface — Flink 1.18 Type Inference 会尝试
 *   把它们当 structured type extract, 抛 "Class must not be abstract".
 *   期望的反序列化器 DmDialectConverter 已把 LOB 转成 byte[] 或 String 进 view, 这里无需再处理.
 */
public class AsTextUdf extends ScalarFunction {

    public String eval(byte[] value) {
        if (value == null) return null;
        return new String(value, StandardCharsets.UTF_8);
    }

    public String eval(String value) {
        return value;
    }
}
