var pageObj = {};
$(function () {
    $.extend(pageObj, {
        init: function () {
            var colModel = [
                {name: "assitCode", label: "科目编码"},
                {name: "assitName", label: "科目名称"},
                {name: "subjectOrient", label: "方向"},
                {name: "endAmt", label: "金额"}
            ];

            var data = window["originData"]["records"].slice(0, 120);
            $("#grid").ouiGrid({
                keyName: "assitCode",
                colModel: colModel,
                data: data
            });
        }
    });

    pageObj.init();
});