package com.tony.tool.db.service;

import com.tony.tool.db.entity.Row;

/**
 * Created by Tony on 2017/4/25.
 */
public interface ITableResolver {
    boolean isTableRow (String line);

    Row getRowData(String line);
}
