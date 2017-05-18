package com.tony.tool.db.service.impl;

import com.tony.tool.db.service.ITableResolver;
import junit.framework.TestCase;
import org.junit.Before;
import org.junit.Test;

import org.junit.Assert;

/**
 * Created by Tony on 2017/4/25.
 */
public class TestDefaultTableResolver{
    private static ITableResolver tableResolver = new DefaultTableResolver();

    @Test
    public void isTableRow() {
        boolean test1 = tableResolver.isTableRow("+++++++++++++--------------------");
        Assert.assertTrue("true", !test1);
        boolean test2 = tableResolver.isTableRow("+++++++++++++-asdfasf-------------------");
        Assert.assertTrue("false", test2);
    }
}
