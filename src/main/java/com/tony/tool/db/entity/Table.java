package com.tony.tool.db.entity;

import java.io.Serializable;
import java.util.List;

/**
 * Created by Tony on 2017/4/24.
 */
public class Table implements Serializable {

    private Row header;

    private List<Row> body;

    public Table() {
    }

    public Table(Row header, List<Row> body) {
        this.header = header;
        this.body = body;
    }

    public Row getHeader() {
        return header;
    }

    public void setHeader(Row header) {
        this.header = header;
    }

    public List<Row> getBody() {
        return body;
    }

    public void setBody(List<Row> body) {
        this.body = body;
    }
}
