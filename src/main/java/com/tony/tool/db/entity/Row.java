package com.tony.tool.db.entity;

import java.io.Serializable;
import java.util.List;

/**
 * Created by Tony on 2017/4/24.
 */
public class Row<T> implements Serializable{
    private List<T> cells;

    public Row(List cells) {
        this.cells = cells;
    }

    public List<T> getCells() {
        return cells;
    }

    public void setCells(List<T> cells) {
        this.cells = cells;
    }
}
