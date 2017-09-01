package com.tony.tool.db.tool;

import com.tony.tool.db.entity.Row;
import com.tony.tool.db.entity.Table;
import com.tony.tool.db.service.ITableResolver;
import com.tony.tool.db.service.impl.DefaultTableResolver;
import org.apache.commons.lang3.StringUtils;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.List;

/**
 * Created by Tony on 2017/4/25.
 */
public class Main {

    /**
     * 根据文件路径读出文件内容
     *
     * @param filePath 文件路径
     */
    public static String getContentByTableFile(String filePath) throws IOException {
        InputStream is = null;
        BufferedReader reader = null;
        StringBuilder result;
        try {
            is = new FileInputStream(filePath);
            reader = new BufferedReader(new InputStreamReader(is));
            result = new StringBuilder();
            String str = reader.readLine();
            String separator = System.getProperty("line.separator");
            while (str != null) {
                result.append(str).append(separator);
                str = reader.readLine();
            }

        } finally {
            if (is != null) {
                is.close();
            }
            if (reader != null) {
                reader.close();
            }
        }
        return result.toString();
    }

    /**
     * 根据给定表数据字符串的内容转为行数据
     *
     * @param fileContent 表数据字符串
     * @param resolver    解析器
     */
    public static List<Row> resolve(String fileContent, ITableResolver resolver) {
        List<Row> rows = new ArrayList<Row>();
        String[] lines = StringUtils.split(fileContent, System.getProperty("line.separator"));
        if (lines != null && lines.length > 0) {
            for (String line : lines) {
                if (resolver.isTableRow(line)) {
                    rows.add(resolver.getRowData(line));
                }
            }
        }
        return rows;
    }

    /**
     * 根据给定表数据字符串的内容转为行数据，默认采用DefaultTableResolver解析器
     *
     * @param fileContent 表数据字符串
     */
    public static List<Row> resolve(String fileContent) {
        return resolve(fileContent, new DefaultTableResolver());
    }

    public static Table resolve2Table(List<Row> rows) {
        return new Table(rows.get(0), rows.subList(1, rows.size()));
    }

    /**
     * 转成sql
     * <p>
     * INSERT INTO tab_comp VALUES(item1, price1, qty1),
     * (item2, price2, qty2),
     * (item3, price3, qty3);
     * </p>
     * @param table     表数据
     * @param tableName 表名
     */
    public static String toSql(Table table, String tableName) {
        StringBuilder sb = new StringBuilder();
        sb.append("INSERT INTO " + tableName + " ");
        List cells = table.getHeader().getCells();
        sb.append("(").append(StringUtils.join(cells, ",")).append(")");
        List<Row> body = table.getBody();
        int i = 0;
        sb.append(" values ");
        for (Row row : body) {
            List cell = row.getCells();
            List cellFormtList = new ArrayList();
            for (Object obj : cell) {
                String str = (String)obj;
                if (StringUtils.isBlank(str) || str.equals("None")) {
                    cellFormtList.add("null");
                } else {
                    cellFormtList.add("'" + str + "'");
                }
            }
            sb.append("(").append(StringUtils.join(cellFormtList, ",")).append(")");
            if (++i != body.size()) {
                sb.append(",");
            }
        }
        return sb.toString();
    }

    /**
     * 将表数据转成csv文件
     * @param table 表数据
     * @param filePath 路径
     */
    public static void toCsv(Table table, String filePath) throws FileNotFoundException, UnsupportedEncodingException {
        File file = new File(filePath);
        PrintWriter pw = new PrintWriter(file, "UTF8");
        Row header = table.getHeader();
        if (header != null) {
            pw.println(StringUtils.join(header.getCells(), ","));
        }
        List<Row> body = table.getBody();
        if (!body.isEmpty()) {
            for (Row row : body) {
                pw.println(StringUtils.join(row.getCells(), ","));
            }
        }
        pw.flush();
        pw.close();
    }

    public static void main(String[] args) throws IOException {
        String content = Main.getContentByTableFile("/Users/Tony/Desktop/TODO/test.txt");
        System.out.println("获取文件内容");
        System.out.println("=================================");
        System.out.println(content);
        List<Row> rows = resolve(content);
        Table table = resolve2Table(rows);
        System.out.println(toSql(table, " t_vop_bil_bill"));
        toCsv(table, "/Users/Tony/Desktop/TODO/t_vop_soa_account_setxxx.csv");
    }
}
