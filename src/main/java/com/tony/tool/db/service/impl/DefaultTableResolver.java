package com.tony.tool.db.service.impl;

import com.tony.tool.db.entity.Row;
import com.tony.tool.db.service.ITableResolver;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Created by Tony on 2017/4/25.
 */
public class DefaultTableResolver implements ITableResolver {
    public boolean isTableRow(String line) {
        return !Pattern.matches("[+\\-]+", line);
    }

    /**
     * 将类似"| id | union_domain | url_dev | url_test |"的行数据转为行数据
     */
    public Row getRowData(String line) {
        List cells = new ArrayList();
        // 匹配类似"| test "的字符串
        Pattern compile = Pattern.compile("\\|\\s*([^|\\s]+)\\s*");
        Matcher matcher = compile.matcher(line);
        while(matcher.find()) {
            // | url_prd => url_prd
            cells.add(matcher.group(1));
        }
        return new Row(cells);
    }
}
