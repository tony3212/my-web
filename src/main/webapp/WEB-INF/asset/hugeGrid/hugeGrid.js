var pageObj = {};
$(function () {
    $.extend(pageObj, {
        init: function () {
            var colModel = [
                {
                    name: "assitCode",
                    label: "科目编码",
                    width: 150,
                    shrinkToFit: true
                },
                {
                    name: "assitName", 
                    label: "科目名称",
                    width: 300,
                    cellAttr: function (cellColModel, cellVal, rowData, rowId) {
                        return {
                            "rowId": rowId
                        };
                    },
                    cellStyle: {
                        "color": "red",
                        "font-weight": "bold"
                    },
                    cellClass: function () {
                        return "bold";
                    }
                },
                {
                    name: "subjectOrient",
                    label: "方向",
                    width: 40,
                    formatter: "typeEnum",
                    formatoptions: {typeEnum: {"0": "否", "1": "是"}}
                },
                {
                    name: "endAmt",
                    label: "金额",
                    width: 100,
                    formatter: "currency"
                }
            ];

            var data = window["originData"]["records"];//.slice(0, 120);
            $("#grid").ouiGrid({
                keyName: "assitCode",
                colModel: colModel,
                data: data,
                rowNumber: true,
                rowNumberWidth: 35,
                height: 500,
                shrinkToFit: false
//                rowAttr: function (rowData, rowId, options) {
//                    return {
//                        "data-row-name": rowId
//                    };
//                },
//                rowClass: function (rowData, rowId, options) {
//                   return "grid-row-" + rowId;
//                },
//                rowStyle: function (rowData, rowId, options) {
//                    return {
//                        "background-color": "#eee"
//                    };
//                }
            });
        },

        addRowData: function () {
            var rowData = {
                assitCode: "1002201_075_1",
                assitName: "测试新增",
                subjectOrient: "0",
                endAmt: 1000
            };
            $("#grid").ouiGrid("addRowData", rowData, "after", "112201_075");
        }
    });

    pageObj.init();
});