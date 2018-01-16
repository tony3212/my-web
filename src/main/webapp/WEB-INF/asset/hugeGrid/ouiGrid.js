/**
 * @type {object} colModel 列配置项
 * @property {string} colModel.name 列的字段名
 * @property {string} colModel.label 列的展示名称
 * @property {? boolean} colModel.hidden 是否显示列
 * @property {string | function} colModel.formatter 显示值格式器
 * @property {? object} colModel.formatoptions 格式配置项
 * @property {string} colModel.align 对齐方式, left,center,right中的一个值
 * @property {number} colModel.width 宽度，列的宽度
 * @property {boolean} colModel.shrinkToFit 当table的宽度与所有可见列宽总和不等时，是否参与比例缩放
 * @property {? object | function} colModel.cellStyle 单元格样式
 * @property {? string | function} colModel.cellClass 单元格class
 * @property {? string | object | function} colModel.cellAttr 单元格属性
 *
 *
 * @type {object} groupHeader 分组表头信息
 * @property {string} groupHeader.startColumnName 起始列名
 * @property {number} groupHeader.numberOfColumns 列数
 * @property {string} groupHeader.titleText 分组名称
 *
 *
 * @type {object} option 初始化时的配置项
 * @property {string} option.keyName 主键的字段名
 * @property {colModel[]} option.colModel 每列列定义
 * @property {object[]} option.data 要展示的数据
 * @property {boolean} option.rowNumber 是否展示序列号
 * @property {number} option.rowNumberWidth 序列号的宽度
 * @property {string} option.height 表格高度
 * @property {string | integer} option.width 表格宽度
 * @property {?[groupHeader]} option.groupHeaders 分组信息
 * @property {?string} option.stateName 状态字段名称（代表是否编辑过的状态名称）
 * @property {boolean} option.shrinkToFit 当table的宽度与所有可见列宽总和不等时，是否按比例缩放
 * @property {?number} option.scrollWidth 滚动条的宽度
 * @property {string | object | function} option.rowAttr 行dom的属性
 * @property {string | object | function} option.rowClass 行dom的class
 * @property {string | object | function} option.rowStyle 行dom的style
 *
 * @type {object} config
 */
(function ($) {
    function log() {
        console && console.log && console.log.apply(console, arguments);
    }

    function logGroup() {
        console && console.group && console.group.apply(console, arguments);
    }

    function logGroupEnd() {
        console && console.groupEnd && console.groupEnd.apply(console, arguments);
    }

    function binarySearch(arr, sortValue, sortName) {
       var index = indexOf(arr, sortValue, sortName);

       return index === -1 ? null : arr[index];
    }

    function indexOf(arr, sortValue, sortName, from, end) {
        var mid, midValue;

        from = arguments.length < 4 ? 0 : from;
        end = arguments.length < 5 ? arr.length - 1 : end;
        mid = Math.floor((from + end) / 2);
        midValue = arr[mid][sortName];

        if (midValue === sortValue) {
            return mid;
        } else if (midValue < sortValue && arr.length > 1) {
//             log("mid lower index: %i, matchValue: %s, searchValue: %s", mid, midValue, sortValue, arr[mid]);
            return indexOf(arr, sortValue, sortName, mid + 1, end);
        } else if (midValue > sortValue && arr.length > 1) {
//             log("mid higher index: %i, matchValue: %s, searchValue: %s", mid, midValue, sortValue, arr[mid]);
            return indexOf(arr, sortValue, sortName, 0, mid - 1);
        } else {
            return -1;
        }
    }

    /** 根据id查找元素 */
    function $$(id) {
        return document.getElementById(id);
    }

    /**
     * 将dom的属性对象转成dom显示的字符串
     * @example {name: "name", value:"1"} => name="name" value="1"
     * @param attrObject
     * @returns {string}
     */
    function attrObject2String(attrObject) {
        var result = "";
        $.each(attrObject, function (key, value) {
            result += " " + key + "=" + value + " ";
        });
        return result;
    }

    /**
     * 将dom的style对象转成dom的style字符串
     * @example {"text-align": "left", font-size="14px"} => text-align="left"; font-size="14px";
     * @param styleObject
     * @returns {string}
     */
    function styleObject2String(styleObject) {
        var result = "";
        $.each(styleObject, function (key, value) {
            result += key + ":" + value + "; ";
        });
        return result;
    }

    /**
     * 联结字符中
     * @example joinStr('abc', '456') => 'abc456'
     */
    function joinStr() {
        return $.makeArray(arguments).join("");
    }

    /**
     * 联结字符串
     * @example joinStr('abc', '456') => 'abc 456'
     */
    function joinClass() {
        return $.makeArray(arguments).join(" ");
    }

    var SORT_FIELD = "__order";
    var STATE_FIELD = "__state";
    var ORDER_UNIT = 1000000;

    /**
     * @constant
     * @enum
     * @type {{INITIAL: number, NEW: number, DELETED: number, MODIFIED: number}}
     */
    var STATE = {
        /** 0 = 初始状态 */
        INITIAL: 0,

        /** 1 = 新增的状态 */
        NEW: 1,

        /** 2 = 删除的状态 */
        DELETED: 2,

        /** 3 = 修改过的状态 */
        MODIFIED: 3
    };

    var Grid = function (gridBox, option) {
        return new Grid.fn.init(gridBox, option);
    };

    Grid.fn = Grid.prototype = {
        constructor: Grid,

        /** 存储数据容器 */
        store: null,

        event: {},

        classes: {
            grid: "grid",
            templateRow: "grid-template-row",
            templateCell: "grid-template-cell",

            head: "grid-hdiv",
            headBox: "grid-hbox",
            headTable: "grid-htable",
            headCell: "grid-head-cell",

            body: "grid-bdiv",
            bodyTable: "grid-btable",
            bodyRow: "grid-row",
            bodyCell: "grid-cell"
        },

        /** 装载grid的容器（DOM元素） */
        context: null,

        _getStore: function (key) {
            return key ? this.store[key] : this.store;
        },

        _setStore: function (key, value) {
            this.store[key] = value;
        },

        /**
         * 将数据进行分页处理
         * @param data
         * @returns {{pageSize: number, totalPage: number, allRecords: *}}
         * @private
         */
        _pageData: function (data) {
            var pageSize = 40, totalPage = Math.ceil(data.length / pageSize);

            return {
                pageSize: pageSize,
                totalPage: totalPage,
                allRecords: data
            };
        },

        /**
         * 删除前后两页的数据
         * @param renderPageModel
         * @param pageInfo
         * @private
         */
        _removeMoreThen2Page: function (renderPageModel, pageInfo) {
            var self = this, currentPage, pageDiff = 2,
                pageSize, totalPage, allRecords, $body, preScrollTop,
                cachedPage, cachedPageKeys, removeElementHeight = 0,
                before2PageEndIndex, before2PageEndRowId, $before2PageEndRowEle,
                after2PageStartIndex, after2PageStartRowId, $after2PageStartRowEle;

            pageSize = pageInfo.pageSize;
            totalPage = pageInfo.totalPage;
            allRecords = pageInfo["allRecords"];
            currentPage = renderPageModel["page"];
            before2PageEndIndex = currentPage - pageDiff >= 0
                ? renderPageModel.startIndex - (pageDiff - 1) * pageSize
                : null;
            after2PageStartIndex = totalPage - currentPage >= pageDiff
                ? renderPageModel.endIndex + (pageDiff - 1) * pageSize
                : null;


            // 1.删除当前页前两页的数据
            if (before2PageEndIndex != null && before2PageEndIndex >= 0) {
                before2PageEndRowId = self.getRowIdByRowData(self._getRowDataByIndex(before2PageEndIndex));
                $before2PageEndRowEle = $(self.getRowElementByRowId(before2PageEndRowId));
                var $preAll = $before2PageEndRowEle.prevAll("." + this.classes.bodyRow);
                $preAll.each(function () {
                    removeElementHeight += $(this).outerHeight(true);
                });
                log("删除【序号%i】之前的数据，共删除%i个元素", before2PageEndIndex + 1, $preAll.length);
                $body = $(self.getBody());
                preScrollTop = $body.scrollTop();
                $preAll.remove();
                // 为了实现无缝滚动（为了往下翻页时不会出现抖动），重新设置scrollTop
                $body.scrollTop(preScrollTop - removeElementHeight);
            }

            // 2.删除当前页后两页的数据
            if (after2PageStartIndex != null && after2PageStartIndex <= allRecords.length) {
                after2PageStartRowId = self.getRowIdByRowData(self._getRowDataByIndex(after2PageStartIndex));
                $after2PageStartRowEle = $(self.getRowElementByRowId(after2PageStartRowId));
                var $nextAll = $after2PageStartRowEle.nextAll();
                log("删除【序号%i】之后的数据，共删除%i个元素", after2PageStartIndex + 1, $nextAll.length);
                $nextAll.remove();
            }
            log("removeElementHeight: " + removeElementHeight);

            cachedPage = pageInfo["cachedPage"];
            cachedPageKeys = _.keys(pageInfo["cachedPage"]);
            // 3.删除不要的缓存数据
            $.each(cachedPageKeys, function (index, page) {
                if (Math.abs(currentPage - page) >= pageDiff) {
                    delete cachedPage[page];
                }
            });
        },

        /**
         * 根据给定页码信息渲染pageDat里的数据
         * @param renderPageModel
         * @param referenceRowId
         * @param position
         * @private
         */
        _renderRowData: function (renderPageModel, referenceRowId, position) {
            var self = this, $bodyTBody, $body, $referenceElement, trHtml, beforeScrollTop, addedHeight = 0;

            position || (position = "after");
            trHtml = templateUtil.getHTML("ouiGridDataTemplate", {
                renderPageModel: renderPageModel,
                renderModel: self.getRenderModel(),
                gridInstance: self
            });
            $bodyTBody = $(self.getBodyTBody());
            $body = $(self.getBody());
            $referenceElement = !referenceRowId
                ? $bodyTBody
                : $(self.getRowElementByRowId(referenceRowId));

            if (!referenceRowId) {
                $referenceElement.append(trHtml);
            } else if (position === "after") {
                $referenceElement.after(trHtml);
            } else {
                beforeScrollTop = $body.scrollTop();
                $referenceElement.before(trHtml);
                // 为了实现无缝滚动（为了往上翻页时不会出现抖动），重新设置scrollTop
                $referenceElement.prevAll().each(function () {
                    addedHeight += $(this).height();
                });
                $body.scrollTop(beforeScrollTop + addedHeight);
            }
        },

        /**
         * 展示等待条
         * @private
         */
        _showBlock: function () {
            log("加载开始");
        },

        /**
         * 隐藏等待条
         * @private
         */
        _hideBlock: function () {
            log("加载完毕");
        },

        /**
         * 初始化config的初始值
         * @param {option} config
         * @private
         */
        _initConfig: function (config) {
            var self = this,
                width = config["width"],
                renderModel = config.renderModel,
                colModel = renderModel.colModel, defaultColModel, rowNumberCol,
                gridWidth, tableWidth, shrinkToFit,
                totalVisibleColWidth = 0, allNotShrinkToFitWidth = 0, ratio;

            if (width === "auto") {
                gridWidth = $(self.context).innerWidth();
            } else {
                gridWidth = config.width;
            }

            // 当要显示序号时，往colModel插入序号的colModel
            if (config.rowNumber) {
                rowNumberCol = this._getRowNumberColModel(config)
                colModel.unshift(rowNumberCol);
            }

            defaultColModel = self._defaultColModelConfig();
            $.each(colModel, function (index, cellModel) {
                var align = cellModel.align, formatter = cellModel.formatter, col;

                col = $.extend({}, defaultColModel, cellModel);
                // 处理对齐方式
                if (align === undefined) {
                    if (formatter === undefined) {
                        col.align = "left";
                    } else if (formatter === "number" || formatter === "integer" || formatter === "currency") {
                        col.align = "right";
                    } else if (formatter === "typeEnum") {
                        col.align = "center";
                    } else {
                        col.align = "left";
                    }
                }

                if (!col.shrinkToFit) {
                    allNotShrinkToFitWidth += col.width;
                }
                colModel[index] = col;
                !col.hidden && (totalVisibleColWidth += col.width);
            });

            // 设置表格宽度
            if (config.shrinkToFit) {
                tableWidth = gridWidth - config.scrollWidth;
            } else {
                tableWidth = totalVisibleColWidth;
            }

            shrinkToFit = config.shrinkToFit;
            ratio = (tableWidth  - allNotShrinkToFitWidth) / (totalVisibleColWidth - allNotShrinkToFitWidth);
            $.each(colModel, function (index, cellModel) {
                var width = cellModel.width;

                if (!shrinkToFit || !cellModel.shrinkToFit) {
                    cellModel.actualWidth = width;
                } else {
                    cellModel.actualWidth = Math.round(width * ratio);
                }
            });

            config.gridWidth = gridWidth;
            config.tableWidth = tableWidth;
            self._initHeadModel(config);
        },

        /**
         * 初始化表头实体（用于渲染）
         * @param config
         * @private
         */
        _initHeadModel: function (config) {
            var renderModel = config.renderModel,
                colModel = renderModel.colModel,
                groupHeaders = config.groupHeaders, groupHeader,
                headModel = [], groupIndex,
                inColumnHeader = function (text, columnHeaders) {
                    var length = columnHeaders.length, i;
                    for (i = 0; i < length; i++) {
                        if (columnHeaders[i].startColumnName === text) {
                            return i;
                        }
                    }
                    return -1;
                };

            headModel[0] = [];
            groupHeaders && (headModel[1] = []);

            for (var index = 0, length = colModel.length; index < length; index++) {
                var cellModel = colModel[index], tempCellModel, colIndex;

                if (!groupHeaders) {
                    headModel[0].push({
                        label: cellModel.label,
                        rowSpan: 1,
                        colSpan: 1,
                        colIndex: index
                    });
                    continue;
                }
                groupIndex = inColumnHeader(cellModel.name, groupHeaders);
                if (groupIndex >= 0) {
                    groupHeader = groupHeaders[groupIndex];
                    headModel[0].push({
                        label: groupHeader.titleText,
                        rowSpan: 1,
                        colSpan: groupHeader.numberOfColumns,
                        colIndex: null
                    });

                    for(var j = 0; j < groupHeader.numberOfColumns; j++) {
                        colIndex = index + j;
                        tempCellModel = colModel[colIndex];
                        headModel[1].push({
                            label: tempCellModel.label,
                            rowSpan: 1,
                            colSpan: 1,
                            colIndex: colIndex
                        });
                    }
                    // 由于执行此句还会执行index++,所以减1
                    index += (groupHeader.numberOfColumns - 1);
                } else {
                    headModel[0].push({
                        label: cellModel.label,
                        rowSpan: 2,
                        colSpan: 1,
                        colIndex: index
                    });
                }
            }
            renderModel.headModel = headModel;
        },

        _getRowIdOrderMap: function () {
            return this.getConfig("rowIdOrderMap");
        },

        /** 获得状态的字段名称 */
        _getStateName: function () {
            var stateName = this.getConfig("rowStateName");

            return stateName ? stateName : STATE_FIELD;
        },

        /** 数据是否未修改 */
        _isInitial: function (rowData) {
            var stateName = this._getStateName();

            return !rowData[stateName] || rowData[stateName] === STATE.INITIAL;
        },

        /** 如果为初化状态则更改为修改状态 */
        _setModifiedIfInitial: function (rowData) {
            this._isInitial(rowData) && (rowData[this._getStateName()] = STATE.MODIFIED);
        },

        /**
         * 如果给定的数据没有状态，则将数据设置为新增状态
         * @param rowData
         * @private
         */
        _setNewIfNoState: function (rowData) {
            var stateName = this._getStateName();

            rowData[stateName] === undefined && (rowData[stateName] = STATE.NEW);
        },

        /**
         * 根据行id获取行数据（含索引__state、__state字段）
         * @param rowId 行id
         * @returns {*}
         */
        _getRowDataByRowId: function (rowId) {
            var self = this, rowIdOrderMap = self._getRowIdOrderMap(),
                records = self._getAllRowData();

            return binarySearch(records, rowIdOrderMap[rowId], SORT_FIELD);
        },

        /**
         * 获得非保护（插件内部生成的变量）的行数据
         * @param rowData
         * @returns {object|Array}
         * @private
         */
        _getNotProtectRowData: function (rowData) {
            return $.isArray(rowData)
                ? _.map(rowData, function (rowData) {
                    return _.omit(rowData, SORT_FIELD, STATE_FIELD)
                })
                : _.omit(rowData, SORT_FIELD, STATE_FIELD);
        },

        /**
         * 根据行id获取在所有数据中的索引
         * @param rowId
         * @private
         */
        _getIndexByRowId: function (rowId) {
            var self = this, rowIdOrderMap = self._getRowIdOrderMap(),
                records = self._getAllRowData();

            return indexOf(records, rowIdOrderMap[rowId], SORT_FIELD);
        },

        /**
         * 获得所有数据（含索引__state、__state字段）
         * @returns {*}
         * @private
         */
        _getAllRowData: function () {
            return this.getPageInfo()["allRecords"];
        },


        /**
         * 根据索引获得行数据（含索引__state、__state字段）
         * @param index 索引
         * @returns {*}
         */
        _getRowDataByIndex: function (index) {
            return this._getAllRowData()[index];
        },

        /**
         * 获得编辑过（新增、修改、删除）的数据（含索引__state、__state字段）
         * @returns {Array}
         */
        _getEditedRowData: function () {
            var self = this;

            return _.filter(this._getAllRowData(), function (rowData) {
                return !self._isInitial(rowData);
            });
        },

        /**
         * 获得序号的列配置
         * @param config
         * @returns {{name: string, label: string, width: number|*, shrinkToFit: boolean}}
         * @private
         */
        _getRowNumberColModel: function (config) {
            return {
                name: "_rowNumber",
                label: "&nbsp;",
                width: config.rowNumberWidth,
                align: "center",
                shrinkToFit: false
            };
        },

        _defaultColModelConfig: function () {
            return {
                hidden: false,
                align: "left",
                width: 150,
                shrinkToFit: true
            };
        },

        /**
         * 重新加载缓存的页面
         * @private
         */
        _refreshCachedPage: function () {
            var self = this, $body, allRowData, cachedPage, originScrollTop;

            cachedPage = self.getCachedPageNumber();
            allRowData = self._getAllRowData();
            $body = $(self.getBody());
            // 1.记录增加前的位置
            originScrollTop = $body.scrollTop();
            // 2.重新生成分页信息
            self.extendPageInfo($.extend(self._pageData(allRowData), {cachedPage: {}}));
            // 3.将页面生成的内容清空
            $("." + this.classes.bodyRow).remove();
            // 标记为滚动时不翻页（下面重新渲染页面可能会造成页面滚动）
            self._setStore("disableScrollPage", true);
            // 4.重新加载数据
            _.each(cachedPage, function (pageNumber) {
                self._loadPage(+pageNumber);
            });
            // 5.还原到原先位置
            $body.scrollTop(originScrollTop);
            // 还原滚动时可翻页
            self._setStore("disableScrollPage", false);
        },

        /**
         * 根据colModel重新调整每列的宽度
         * @private
         */
        _resizeWidth: function () {
            var self = this, config = self.getConfig(),
                allNotShrinkToFitWidth = 0, totalVisibleColWidth = 0,
                tableWidth, shrinkToFit, ratio,
                $headTemplateRow, $bodyTemplateRow;

            $.each(colModel, function (index, col) {
                if (!col.shrinkToFit) {
                    allNotShrinkToFitWidth += col.width;
                }
                !col.hidden && (totalVisibleColWidth += col.width);
            });

            // 1.计算表格宽度
            tableWidth = config.shrinkToFit ? config.tableWidth : totalVisibleColWidth;

            // 2.计算每列的宽度
            shrinkToFit = config.shrinkToFit;
            ratio = (tableWidth - allNotShrinkToFitWidth) / (totalVisibleColWidth - allNotShrinkToFitWidth);
            $.each(colModel, function (index, cellModel) {
                cellModel.actualWidth = (!shrinkToFit || !cellModel.shrinkToFit)
                    ? cellModel.width : Math.round(cellModel.width * ratio);
                if (!cellModel.hidden) {
                    log("name: %s, width: %i", cellModel.name, cellModel.actualWidth);
                }
            });

            // 4.设置每列的宽度
            $headTemplateRow = $(self.getHeadTemplateRow());
            $bodyTemplateRow = $(self.getBodyTemplateRow())
            $.each(colModel, function (index, col) {
               if (!col.hidden) {
                   $('[data-name="' + col.name + '"]', $headTemplateRow).css("width",  col.actualWidth + "px");
                   $('[data-name="' + col.name + '"]', $bodyTemplateRow).css("width",  col.actualWidth + "px");
               }
            });
            // 5.设置表格宽度
            $(self.getHeadTable()).css("width",  tableWidth + "px");
            $(self.getBodyTable()).css("width",  tableWidth + "px");
        }
    };

    /**
     * 渲染时用到的方法
     */
    $.extend(Grid.prototype, {

        _getGridWidth: function () {
            return this.getConfig("gridWidth");
        },

        _getTableWidth: function () {
            return this.getConfig("tableWidth");
        },

        /**
         * 获得预定义的grid的class样式
         * @private
         */
        _predefineGridClass: function () {
            return "grid";
        },

        /**
         * 获得grid的class的样式，渲染时使用
         * @returns {*|string}
         */
        gridClass: function (renderModel) {
            return this._predefineGridClass(renderModel);
        },

        /**
         * 获得预定义的grid的style样式
         * @private
         */
        _predefineGridStyle: function (renderModel) {
            var self = this, height = renderModel.height, styleValue = {};

            if ($.isNumeric(height)) {
                styleValue.height = height + "px";
            } else if (height) {
                styleValue.height = height;
            }

            styleValue.width = self._getGridWidth() + "px";

            return joinStr(styleObject2String(styleValue));
        },

        /**
         * 获得grid的style的样式，渲染时使用
         * @returns {*|string}
         */
        gridStyle: function (renderModel) {
            return this._predefineGridStyle(renderModel);
        },

        _predefineHeadClass: function (renderModel) {
            return this.classes.head;
        },

        headClass: function (renderModel) {
            return this._predefineHeadClass(renderModel);
        },

        _predefineHeadStyle: function (renderModel) {
            var self = this;

            return styleObject2String({
                width: self._getGridWidth() + "px"
            });
        },

        headStyle: function (renderModel) {
            return this._predefineHeadStyle(renderModel);
        },

        _predefineHeadBoxClass: function (renderModel) {
            return this.classes.headBox;
        },

        headBoxClass: function (renderModel) {
            return this._predefineHeadBoxClass(renderModel);
        },

        _predefineHeadBoxStyle: function (renderModel) {
            var self = this;

            return styleObject2String({
                "padding-right": self.getConfig("scrollWidth") + "px"
            });
        },

        headBoxStyle: function (renderModel) {
            return this._predefineHeadBoxStyle(renderModel);
        },

        _predefineHeadTableClass: function (renderModel) {
            return this.classes.headTable;
        },

        headTableClass: function (renderModel) {
            return this._predefineHeadTableClass(renderModel);
        },

        _predefineHeadTableStyle: function (renderModel) {
            var self = this;

            return styleObject2String({
                width: self._getTableWidth() + "px"
            });
        },

        headTableStyle: function (renderModel) {
            return this._predefineHeadTableStyle(renderModel);
        },

        _predefineTemplateRowClass: function (renderModel) {
            return "grid-template-row";
        },

        templateRowClass: function (renderModel) {
            return this._predefineTemplateRowClass(renderModel);
        },

        _predefineTemplateRowStyle: function (renderModel) {
            return "";
        },

        templateRowStyle: function (renderModel) {
            return this._predefineTemplateRowStyle(renderModel);
        },

        _predefineTemplateCellClass: function (cellModel) {
            return "grid-template-cell";
        },

        templateCellClass: function (cellModel) {
            return this._predefineTemplateCellClass(cellModel);
        },

        _predefineTemplateCellStyle: function (cellModel) {
            var styleObject = {width: cellModel.actualWidth + "px"};

            cellModel.hidden && (styleObject.display = "none");
            return styleObject2String(styleObject);
        },

        templateCellStyle: function (cellModel) {
            return this._predefineTemplateCellStyle(cellModel);
        },

        /**
         * 获得预定义的头头部单元格的样式值
         * @private
         */
        _predefineHeadCellClass: function (cellModel) {
            return joinClass(this.classes.headCell);
        },

        /**
         * 获得头部单元格dom的class的值，渲染单元格时使用
         * @param {colModel} cellModel
         */
        headCellClass: function (cellModel) {
            return this._predefineHeadCellClass(cellModel);
        },

        _predefineHeadCellStyle: function (cellModel) {
            var styleObject = {};

            cellModel.hidden && (styleObject.display = "none");
            return styleObject2String(styleObject);
        },

        /**
         * 获得头部单元格dom的class的值，渲染单元格时使用
         * @param {colModel} cellModel
         */
        headCellStyle: function (cellModel) {
            return this._predefineHeadCellStyle(cellModel);
        },

        /**
         * 获得预定义的grid的body的class样式
         * @private
         */
        _predefineBodyClass: function () {
            return this.classes.body;
        },

        /**
         * 获得body的class的样式，渲染时使用
         * @returns {*|string}
         */
        bodyClass: function (renderModel) {
            return this._predefineBodyClass(renderModel);
        },

        /**
         * 获得预定义的grid的body的style样式
         * @private
         */
        _predefineBodyStyle: function (renderModel) {
            var self = this;

            return joinStr(styleObject2String({
                width: self._getGridWidth() + "px"
            }));
        },

        /**
         * 获得body的style的样式，渲染时使用
         * @returns {*|string}
         */
        bodyStyle: function (renderModel) {
            return this._predefineBodyStyle(renderModel);
        },

        /**
         * 获得预定义的grid的body中table的class样式
         * @private
         */
        _predefineBodyTableClass: function () {
            return "grid-btable";
        },

        /**
         * 获得body中table的class的样式，渲染时使用
         * @returns {*|string}
         */
        bodyTableClass: function (renderModel) {
            return this._predefineBodyTableClass(renderModel);
        },

        /**
         * 获得预定义的grid的body中table的style样式
         * @private
         */
        _predefineBodyTableStyle: function (renderModel) {
            var self = this;

            return joinStr(styleObject2String({
                width: self._getTableWidth() + "px"
            }));
        },

        /**
         * 获得body中table的style的样式，渲染时使用
         * @returns {*|string}
         */
        bodyTableStyle: function (renderModel) {
            return this._predefineBodyTableStyle(renderModel);
        },

        /**
         * 获得grid行的自定义属性，渲染单元格时使用
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        rowAttr: function (rowData, rowId) {
            var self = this, attrValue, opts, type;

            attrValue = self.getConfig("rowAttr");
            type = $.type(attrValue);

            if (type === "undefined") {
                return "";
            }

            if (type === "string") {
                return attrValue;
            }

            if (type === "function") {
                opts = {rowId: rowId, gid: $(this.context).attr("id")};
                attrValue = attrValue.call(self, rowData, rowId, opts);
                if ($.type(attrValue) === "string") {
                    return attrValue;
                }
                if ($.type(attrValue) === "object") {
                    return attrObject2String(attrValue);
                }
            }

            if (type === "object") {
                return attrObject2String(attrValue);
            }

            return "";
        },

        /**
         * 获得预定义行的class样式
         * @param rowData
         * @param rowId
         * @returns {string}
         * @private
         */
        _predefineRowClass: function (rowData, rowId) {
            return this.classes.bodyRow;
        },

        /**
         * 获得grid行的的class值，渲染单元格时使用
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        rowClass: function (rowData, rowId) {
            var self = this, classValue, opts, type, predefineRowClass;

            predefineRowClass = self._predefineRowClass(rowData, rowId)
            classValue = self.getConfig("rowClass");
            type = $.type(classValue);

            if (type === "undefined") {
                return predefineRowClass;
            }

            if (type === "string") {
                return joinClass(predefineRowClass, classValue);
            }

            if (type === "function") {
                opts = {rowId: rowId, gid: $(this.context).attr("id")};
                return joinClass(predefineRowClass, classValue.call(self, rowData, rowId, opts));
            }

            return predefineRowClass;
        },

        /**
         * 预定义行样式
         * @private
         */
        _predefineRowStyle: function (rowData, rowId) {
            return "";
        },

        /**
         * 获得grid行的的style值，渲染单元格时使用
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        rowStyle: function (rowData, rowId) {
            var self = this, styleValue, opts, type, predefineRowStyle;

            predefineRowStyle = self._predefineRowStyle(rowData, rowId)
            styleValue = self.getConfig("rowStyle");
            type = $.type(styleValue);

            if (type === "undefined") {
                return predefineRowStyle;
            }

            if (type === "string") {
                return joinStr(predefineRowStyle, styleValue);
            }

            if (type === "function") {
                opts = {rowId: rowId, gid: $(this.context).attr("id")};
                styleValue = styleValue.call(self, rowData, rowId, opts);
                if ($.type(styleValue) === "string") {
                    return joinStr(predefineRowStyle, styleValue);
                }
                if ($.type(styleValue) === "object") {
                    return joinStr(predefineRowStyle, styleObject2String(styleValue));
                }
            }

            if (type === "object") {
                return joinStr(predefineRowStyle, styleObject2String(styleValue));
            }

            return predefineRowStyle;
        },

        /**
         * 获得单元格dom的自定义属性，渲染单元格时使用
         * @param {colModel} cellModel 单元格的配置项
         * @param {*} cellVal 单元格的值
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        cellAttr: function (cellModel, cellVal, rowData, rowId) {
            var attrValue, opts, type;

            attrValue = cellModel["cellAttr"];
            type = $.type(attrValue);

            if (type === "undefined") {
                return "";
            }

            if (type === "string") {
                return attrValue;
            }

            if (type === "function") {
                opts = {rowId: rowId, colModel: cellModel, gid: $(this.context).attr("id")};
                attrValue = attrValue.call(self, cellVal, opts, rowData, rowId);
                if ($.type(attrValue) === "string") {
                    return attrValue;
                }
                if ($.type(attrValue) === "object") {
                    return attrObject2String(attrValue);
                }
            }

            if (type === "object") {
                return attrObject2String(attrValue);
            }

            return "";
        },

        /**
         * 获得预定义的class样式
         * @param {colModel} cellModel
         * @param {*} cellVal 单元格的值
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         * @private
         */
        _predefineCellClass: function (cellModel, cellVal, rowData, rowId) {
            return joinClass(this.classes.bodyCell);
        },

        /**
         * 获得单元格dom的class的值，渲染单元格时使用
         * @param {colModel} cellModel 单元格的配置项
         * @param {*} cellVal 单元格的值
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        cellClass: function (cellModel, cellVal, rowData, rowId) {
            var self = this, classValue, opts, type, predefineCellClass;

            predefineCellClass = self._predefineCellClass(cellModel, cellVal, rowData, rowId);
            classValue = cellModel["cellClass"];
            type = $.type(classValue);

            if (type === "undefined") {
                return predefineCellClass;
            }

            if (type === "string") {
                return joinClass(predefineCellClass, classValue);
            }

            if (type === "function") {
                opts = {rowId: rowId, colModel: cellModel, gid: $(this.context).attr("id")};
                return joinClass(predefineCellClass, classValue.call(self, cellVal, opts, rowData, rowId));
            }

            return predefineCellClass;
        },

        /**
         * 获得预定义的样式
         * @param {colModel} cellModel
         * @param {*} cellVal 单元格的值
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         * @private
         */
        _predefineCellStyle: function (cellModel, cellVal, rowData, rowId) {
            var styleObject = {"text-align" : cellModel.align};

            cellModel.hidden && (styleObject.display = "none");
            return joinStr(styleObject2String(styleObject));
        },

        /**
         * 获得单元格dom的style值，渲染单元格时使用
         * @param {colModel} cellModel 单元格的配置项
         * @param {*} cellVal 单元格的值
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        cellStyle: function (cellModel, cellVal, rowData, rowId) {
            var self = this, styleValue, opts, type, predefineCellStyle;

            predefineCellStyle = self._predefineCellStyle(cellModel, cellVal, rowData, rowId);
            styleValue = cellModel["cellStyle"];
            type = $.type(styleValue);

            if (type === "undefined") {
                return predefineCellStyle;
            }

            if (type === "string") {
                return joinStr(predefineCellStyle, predefineCellStyle);
            }

            if (type === "function") {
                opts = {rowId: rowId, colModel: cellModel, gid: $(this.context).attr("id")};
                styleValue = styleValue.call(self, cellVal, opts, rowData, rowId);
                if ($.type(styleValue) === "string") {
                    return joinStr(predefineCellStyle, styleValue);
                }
                if ($.type(styleValue) === "object") {
                    return joinStr(predefineCellStyle, styleObject2String(styleValue));
                }
            }

            if (type === "object") {
                return joinStr(predefineCellStyle, styleObject2String(styleValue));
            }

            return predefineCellStyle;
        },

        /**
         * 获得格式化单元格的值，渲染单元格时使用
         * @param {colModel} cellModel 单元格的配置项
         * @param {*} cellVal 单元格的值
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        format: function (cellModel, cellVal, rowData, rowId) {
            var self = this, opts, formatter;

            opts = {rowId: rowId, colModel: cellModel, gid: $(this.context).attr("id")};

            formatter = cellModel["formatter"];

            if (!formatter) {
                return cellVal;
            }

            if ($.isFunction(formatter)) {
                return formatter.call(self, cellVal, opts, rowData);
            }

            if ($.type(formatter) === "string") {
                return Grid.fmatter.format(formatter, cellVal, opts, rowData);
            }

            return cellVal;
        }
    });

    $.extend(Grid.prototype, {
        /**
         * 获取配置项
         * @returns {option}
         */
        getOption: function () {
            return this._getStore("option");
        },

        /**
         * 设置配置项
         * @param {option} option
         */
        setOption: function (option) {
            this._setStore("option", option);
        },

        getConfig: function (keyName) {
            var config = this._getStore("config");
            return keyName ? config[keyName] : config;
        },

        setConfig: function (config) {
            return this._setStore("config", config);
        },

        extendConfig: function (config) {
            $.extend(this._getStore("config"), config);
        },

        /**
         * 获得渲染模型
         * @returns {*}
         */
        getRenderModel: function () {
            return this.getConfig()["renderModel"];
        },

        /**
         * 根据行id查找行元素
         * @param rowId
         * @returns {HTMLElement | null}
         */
        getRowElementByRowId: function (rowId) {
            return document.getElementById(rowId);
        },

        /**
         * 根据行数据取行id
         * @param rowData
         * @returns {*}
         */
        getRowIdByRowData: function (rowData) {
            return rowData[this.getConfig("keyName")];
        },

        /**
         * 根据行id获取行数据, 没有传时，返回所有数据
         * @param rowId 行id
         * @returns {*}
         */
        getRowData: function (rowId) {
            var self = this;

            return self._getNotProtectRowData(rowId ? self._getRowDataByRowId(rowId) : self._getAllRowData());
        },

        /** 根据索引查行数据（不含__state、__state字段） */
        getRowDataByIndex: function (index) {
            return this._getNotProtectRowData(this._getRowDataByIndex(index));
        },

        /**
         * 获得编辑过（新增、修改、删除）的数据
         * @returns {Array}
         */
        getEditedRowData: function () {
            return this._getNotProtectRowData(this._getEditedRowData());
        },

        /**
         * 设置行数据
         * @param rowId
         * @param rowData
         */
        setRowData: function (rowId, rowData) {
            var self = this, $row, index, oldRowData, newRowData, rowHtml;

            index = self._getIndexByRowId(rowId);
            if (index === -1) {
                throw "can't find rowData rowId:" + rowId;
            }

            oldRowData = self._getAllRowData()[index];
            // 更新数据
            newRowData = $.extend(oldRowData, rowData);
            // 如果是未修改状态，则标记为修改状态
            self._setModifiedIfInitial(newRowData)

            // 如果已经加在载页面中，则重新渲染
            $row = $($$(rowId));
            if ($row.length > 0) {
                rowHtml = templateUtil.getHTML("ouiGridDataTemplate", {
                    renderPageModel: {
                        startIndex: index,
                        endIndex: index,
                        pageData: [newRowData]
                    },
                    renderModel: self.getRenderModel(),
                    gridInstance: self
                });
                $row.replaceWith(rowHtml);
            }
        },

        /**
         * 添加数据
         * @param rowData 行数据
         * @param position 位置
         * @param refRowId
         */
        addRowData: function (rowData, position, refRowId) {
            var self = this, allRowData, lastRowData,
                beforeIndex, afterIndex, beforeOrder, afterOrder,
                newRowData, order;

            position || (position = "last");
            allRowData = self._getAllRowData();
            if (!refRowId) {
                lastRowData = _.last(allRowData);
                refRowId = self.getRowIdByRowData(lastRowData);
            }

            switch (position) {
                case "last":
                    beforeIndex = self._getAllRowData().length - 1;
                    break;
                case "first":
                    beforeIndex = -1;
                    break;
                case "after":
                    beforeIndex = self._getIndexByRowId(refRowId);
                    break;
                case "before":
                    beforeIndex = self._getIndexByRowId(refRowId) - 1;
                    break;
            }

            // 计算排序号
            afterIndex = beforeIndex + 1;
            beforeOrder = beforeIndex < 0 ? 0 : allRowData[beforeIndex][SORT_FIELD];
            afterOrder = afterIndex >= allRowData.length ? (afterIndex + 1) * ORDER_UNIT : allRowData[afterIndex][SORT_FIELD];
            order = Math.floor((beforeOrder + afterOrder) / 2);

            refRowId = self.getRowIdByRowData(allRowData[beforeIndex < 0 ? 0 : beforeIndex]);

            // 初始化数据
            newRowData = $.extend(true, {}, rowData, _.object([SORT_FIELD], [order]));
            // 如果给定的数据中没有状态，则将数据置为新增状态
            self._setNewIfNoState(newRowData);
            // 插入数据
            allRowData.splice(beforeIndex + 1, 0, newRowData);

            // 已经加载在页面中，则在页面中显示
            if ($($$(refRowId)).length > 0) {
                self._refreshCachedPage($($$(refRowId)));
            }
        },

        /**
         * 获得分页信息
         * @returns {*}
         */
        getPageInfo: function () {
            return this.getConfig()["pageInfo"];
        },

        /**
         * 扩展分页信息
         * @param pageInfo 分布信息
         */
        extendPageInfo: function (pageInfo) {
            var config = this.getConfig();

            return $.extend(config["pageInfo"], pageInfo);
        },

        /** 销毁对象 */
        destroy: function () {
            var self = this;

            $(self.context).html("");
            self.store = null;
            self = null;
        },

        /**
         * 初始化
         * @param gridBox
         * @param {option} option
         */
        init: function (gridBox, option) {
            var self = this, config, rowDataList, rowIdOrderMap = {}, colModel, renderModel;

            self.store = {
                option: {
                    keyName: "id",
                    colModel: null,
                    colName: null,
                    data: null
                },
                config: {
                    keyName: "id",
                    colModel: null,
                    colName: null,
                    rowIdOrderMap: {},
                    pageInfo: {
                        pageSize: null,
                        totalPage: null,
                        allRecords: null,
                        // 缓存了页面数据
                        cachedPage: {}
                    }
                }
            };
            config = self.store.config
            // 1.设定上下文
            self.context = $(gridBox)[0];
            self.setOption(option);

            // 2.初始化相关数据
            colModel = option.colModel;
            renderModel = {
                keyName: option.keyName,
                colModel: colModel,
                rowNumber: option.rowNumber,
                rowNumberWidth: option.rowNumberWidth,
                height: option.height
            };
            rowDataList = $.extend(true, [], option.data);
            _.each(rowDataList, function (rowData, index) {
                rowData[SORT_FIELD] = (index + 1) * ORDER_UNIT;
                rowIdOrderMap[rowData[option.keyName]] = rowData[SORT_FIELD];
            });
            config = $.extend(true, {}, config, _.omit(option, "data"), {
                renderModel: renderModel,
                rowIdOrderMap: rowIdOrderMap
            });
            self._initConfig(config);
            self.setConfig(config);

            // 3.将数据进行分页，并存储分布信息
            self.extendPageInfo(self._pageData(rowDataList));

            // 4.渲染grid基本内容
            self.renderGridContent(config.renderModel);
            $(self.getBody()).height($(self.getGrid()).height() - $(self.getHead()).outerHeight(true));

            // 5.绑定事件
            self.bindEvent();

            // 6.展示第1页数据
            self._loadPage(1);
        },

        /**
         * 初始化grid
         * @param renderModel
         */
        renderGridContent: function (renderModel) {
            var self = this, context = self.context;

            $(context).html(templateUtil.getHTML("ouiGridTemplate", {renderModel: renderModel, gridInstance: self}));
        },

        /**
         * 绑定事件
         */
        bindEvent: function () {
            var self = this, context = self.context,
                $grid = $(context),
                $body = $(self.getBody()),
                lastScrollTop = 0;

            $body.off("scroll.gridPage")
                .on("scroll.gridPage", function (event) {
                    var tBody = this, $tBody = $(tBody), scrollTop, reservedHeight = 150,
                        nearlyReachTop = false, nearlyReachBottom = false,
                        scrollHeight, scrollInnerHeight;

                    if (self._getStore("disableScrollPage")) {
                        return;
                    }

                    scrollTop = $tBody.scrollTop();
                    // 向上滚动
                    if (scrollTop < lastScrollTop) {
                        nearlyReachTop = Boolean(reservedHeight >= scrollTop && scrollTop >= 0);
                        if (nearlyReachTop) {
                            $grid.trigger("gridReachTopAreaEvent", event);
                        }
                    }
                    // 向下滚动
                    else {
                        scrollHeight = $tBody[0].scrollHeight;
                        scrollInnerHeight = scrollTop + $tBody.innerHeight();

                        if (scrollHeight - scrollInnerHeight < 150) {
                            log("attention");
                        }

                        nearlyReachBottom = Boolean(scrollHeight - scrollInnerHeight >= 0 &&
                            scrollHeight - (scrollInnerHeight + reservedHeight) <= 0);

                        if (nearlyReachBottom) {
                            $grid.trigger("gridReachBottomAreaEvent", event);
                        }
                    }
                    lastScrollTop = scrollTop;
                    event.stopPropagation();
                });

            $grid
                .off("gridReachTopAreaEvent")
                .on("gridReachTopAreaEvent", function () {
                    log("gridReachTopAreaEvent");
                    self.loadPrevPage();
                })

                .off("gridReachBottomAreaEvent")
                .on("gridReachBottomAreaEvent", function () {
                    log("gridReachBottomAreaEvent");
                    self.loadNextPage();
                });

            $body.scroll(function () {
                $(self.getHead()).scrollLeft($(this).scrollLeft());
            });

        },

        /**
         * 获取缓存的页码数
         * @param cachedPage
         * @returns {string[]}
         */
        getCachedPageNumber: function (cachedPage) {
            var self = this, pageArray;

            cachedPage || (cachedPage = self.getPageInfo()["cachedPage"]);
            pageArray = _.map(_.keys(cachedPage), function (pageStr) {
                return +pageStr;
            });
            return pageArray.sort(function (numA, numB) {
                return Number(numA) - Number(numB);
            });
        },

        /**
         * 获取缓存的最小页码数
         * @param cachedPage
         * @returns {string}
         */
        getCachedMinPageNo: function (cachedPage) {
            var first = _.first(this.getCachedPageNumber(cachedPage))
            return first ? +first : null;
        },

        /**
         * 获取缓存的最大页码数
         * @param cachedPage
         * @returns {string}
         */
        getCachedMaxPageNo: function (cachedPage) {
            var last = _.last(this.getCachedPageNumber(cachedPage))
            return last ? +last : null;
        },

        getGrid: function () {
            return $(".grid", this.context).get(0);
        },

        getHead: function () {
            return $("." + this.classes.head, this.context).get(0);
        },

        getHeadTable: function () {
            return $("." + this.classes.headTable, this.getHead());
        },

        getHeadTemplateRow: function () {
            return $("." + this.classes.templateRow, this.getHead());
        },

        getBodyTemplateRow: function () {
            return $("." + this.classes.templateRow, this.getBodyTBody());
        },

        /** 获得表体元素 */
        getBody: function () {
            return $("." + this.classes.body, this.context).get(0);
        },

        getBodyTable: function () {
            return $("." + this.classes.bodyTable, this.getBody()).get(0);
        },

        getBodyTBody: function () {
            return $("tbody", this.getBody()).get(0);
        },

        /**
         * 获得列定义
         * @returns {Array}
         */
        getColModel: function () {
            return this.getConfig("colModel");
        },

        /**
         * 根据给定的页加载数据
         * @param loadingPage
         * @private
         */
        _loadPage: function (loadingPage) {
            var self = this, pageInfo, cachedPageSize,
                renderPageModel, refRowId, position,
                cachedPage, sortedCachedPageKeys;

            logGroup("-----------------------开始加载第%i页数据------------------------", loadingPage);
            if (self.getConfig("loading")) {
                return;
            }

            self.extendConfig({"loading": true});
            self._showBlock();
            pageInfo = self.getPageInfo()
            cachedPage = pageInfo["cachedPage"];

            // 已经加载了数据，则直接返回
            if (cachedPage[loadingPage] != null) {
                log("第%i页已缓存", loadingPage);
                self._hideBlock();
                return;
            }

            // 对缓存的页数按从小到大规则排序
            sortedCachedPageKeys = self.getCachedPageNumber(cachedPage);

            cachedPageSize = _.size(sortedCachedPageKeys)
            position = cachedPageSize > 0 && _.first(sortedCachedPageKeys) > loadingPage ? "before" : "after";
            refRowId = cachedPageSize === 0
                ? null
                : position === "before"
                    ? self.getRowIdByRowData(self._getRowDataByIndex(cachedPage[self.getCachedMinPageNo(cachedPage)].startIndex))
                    : self.getRowIdByRowData(self._getRowDataByIndex(cachedPage[self.getCachedMaxPageNo(cachedPage)].endIndex));
            renderPageModel = self.getRenderPageModel(loadingPage);
            log("第%i页的起始【序号%i】，结束【序号%i】，共%i条数据",
                loadingPage,
                renderPageModel.startIndex + 1,
                renderPageModel.endIndex + 1,
                renderPageModel.pageData.length
            );
            $.extend(pageInfo["cachedPage"], _.object([loadingPage], [renderPageModel]));
            self._renderRowData(renderPageModel, refRowId, position);
            self._removeMoreThen2Page(renderPageModel, pageInfo);
            log("缓存页面：" + self.getCachedPageNumber());
            self.extendConfig({"loading": false});
            self._hideBlock();
            logGroupEnd("-----------------------------------------------");
        },

        /**
         * 加载上一页数据
         */
        loadPrevPage: function () {
            var self = this, minPage = self.getCachedMinPageNo();

            if (minPage === 1) {
                log("已是第一页");
                return;
            }
            self._loadPage(minPage - 1);
        },

        /**
         * 加载下一页数据
         */
        loadNextPage: function () {
            var self = this, pageInfo = self.getPageInfo(),
                maxPage = self.getCachedMaxPageNo();

            if (maxPage === pageInfo.totalPage) {
                log("已是最后一页");
                return;
            }
            self._loadPage(maxPage + 1);
        },

        /**
         * 返回给定页码的数据
         * @param page 页码
         * @returns {*}
         */
        getRenderPageModel: function (page) {
            var self = this, pageInfo, maxIndex, allRecords, startIndex, endIndex;

            pageInfo = self.getPageInfo();
            allRecords = pageInfo.allRecords;
            if (!allRecords) {
                return null;
            }

            maxIndex = allRecords.length - 1;
            startIndex = (page - 1) * pageInfo.pageSize;
            endIndex = page * pageInfo.pageSize - 1;
            endIndex = maxIndex < endIndex ? maxIndex : endIndex;
            return {
                page: page,
                startIndex: startIndex,
                endIndex: endIndex,
                pageData: allRecords.slice(startIndex, endIndex + 1)
            };
        },

        /**
         * 显示或隐藏列
         * @param {string | Array} colNameList 列名称
         * @param visible 是否显示
         */
        toggleView: function (colNameList, visible) {
            var self = this, colModel, method;

            colNameList = $.isArray(colNameList) ? colNameList : [colNameList];
            method  = visible ? "show" : "hide";
            // 1.找出该列的配制项，将将该配制项的hidden置为true
            colModel =  self.getRenderModel().colModel;

            _.each(colModel, function (cellModel) {
                if (_.contains(colNameList, cellModel.name)) {
                    cellModel.hidden = !visible;

                    $('[data-name="' + cellModel.name + '"]', $(self.getHead()))[method]();
                    $('[data-name="' + cellModel.name + '"]', $(self.getBodyTBody()))[method]();
                }
            });
            self._resizeWidth();
        },

        /**
         * 隐藏列
         * @param {string | Array} colNameList 列名称
         */
        hideCol: function (colNameList) {
            this.toggleView(colNameList, false);
        },
        
        /**
         * 显示列
         * @param {string | Array} colNameList 列名称
         */
        showCol: function (colNameList) {
            this.toggleView(colNameList, true);
        }
    });
    Grid.prototype.init.prototype = Grid.prototype;

    Grid.fmatter = {
        isBoolean: function (o) {
            return typeof o === "boolean";
        },
        isObject: function (o) {
            return (o && (typeof o === "object" || $.isFunction(o))) || false;
        },
        isString: function (o) {
            return typeof o === "string";
        },
        isNumber: function (o) {
            return typeof o === "number" && isFinite(o);
        },
        isValue: function (o) {
            return (this.isObject(o) || this.isString(o) || this.isNumber(o) || this.isBoolean(o));
        },
        isEmpty: function (o) {
            if (!this.isString(o) && this.isValue(o)) {
                return false;
            }
            if (!this.isValue(o)) {
                return true;
            }
            o = $.trim(o).replace(/&nbsp;/ig, "").replace(/&#160;/ig, "");
            return o === "";
        },

        /**
         * 格式化
         * @param formatType
         * @param cellVal
         * @param options
         * @param rowData
         * @returns {*}
         */
        format: function (formatType, cellVal, options, rowData) {
            var v = cellVal;

            options = $.extend({}, Grid.fmatter.defaults, options);
            try {
                v = Grid.fmatter[formatType].call(this, cellVal, options, rowData);
            } catch (fe) {
                log(fe);
            }
            return v;
        }
    };
    Grid.fmatter.util = {
        /**
         * Taken from YAHOO utils
         * @param nData
         * @param opts
         * @returns {*}
         * @constructor
         */
        NumberFormat: function (nData, opts) {
            if (!$.isNumeric(nData)) {
                nData *= 1;
            }
            if ($.isNumeric(nData)) {
                var bNegative = (nData < 0);
                var sOutput = String(nData);
                var sDecimalSeparator = opts.decimalSeparator || ".";
                var nDotIndex;
                if ($.isNumeric(opts.decimalPlaces)) {
                    // Round to the correct decimal place
                    var nDecimalPlaces = opts.decimalPlaces;
                    var nDecimal = Math.pow(10, nDecimalPlaces);
                    sOutput = String(Math.round(nData * nDecimal) / nDecimal);
                    nDotIndex = sOutput.lastIndexOf(".");
                    if (nDecimalPlaces > 0) {
                        // Add the decimal separator
                        if (nDotIndex < 0) {
                            sOutput += sDecimalSeparator;
                            nDotIndex = sOutput.length - 1;
                        }
                        // Replace the "."
                        else if (sDecimalSeparator !== ".") {
                            sOutput = sOutput.replace(".", sDecimalSeparator);
                        }
                        // Add missing zeros
                        while ((sOutput.length - 1 - nDotIndex) < nDecimalPlaces) {
                            sOutput += "0";
                        }
                    }
                }
                if (opts.thousandsSeparator) {
                    var sThousandsSeparator = opts.thousandsSeparator;
                    nDotIndex = sOutput.lastIndexOf(sDecimalSeparator);
                    nDotIndex = (nDotIndex > -1) ? nDotIndex : sOutput.length;
                    var sNewOutput = sOutput.substring(nDotIndex);
                    var nCount = -1, i;
                    for (i = nDotIndex; i > 0; i--) {
                        nCount++;
                        if ((nCount % 3 === 0) && (i !== nDotIndex) && (!bNegative || (i > 1))) {
                            sNewOutput = sThousandsSeparator + sNewOutput;
                        }
                        sNewOutput = sOutput.charAt(i - 1) + sNewOutput;
                    }
                    sOutput = sNewOutput;
                }
                // Prepend prefix
                sOutput = (opts.prefix) ? opts.prefix + sOutput : sOutput;
                // Append suffix
                sOutput = (opts.suffix) ? sOutput + opts.suffix : sOutput;
                return sOutput;

            }
            return nData;
        }
    };
    $.extend(Grid.fmatter, {
        defaultFormat: function (cellVal, opts) {
            return (Grid.fmatter.isValue(cellVal) && cellVal !== "") ? cellVal : opts.defaultValue || "&#160;";
        },

        integer: function (cellVal, opts) {
            var op = $.extend({}, opts.integer);
            if (opts.colModel !== undefined && opts.colModel.formatoptions !== undefined) {
                op = $.extend({}, op, opts.colModel.formatoptions);
            }
            if (Grid.fmatter.isEmpty(cellVal)) {
                return op.defaultValue;
            }
            return Grid.fmatter.util.NumberFormat(cellVal, op);
        },

        number: function (cellVal, opts) {
            var op = $.extend({}, opts.number);
            if (opts.colModel !== undefined && opts.colModel.formatoptions !== undefined) {
                op = $.extend({}, op, opts.colModel.formatoptions);
            }
            if (Grid.fmatter.isEmpty(cellVal)) {
                return op.defaultValue;
            }
            return Grid.fmatter.util.NumberFormat(cellVal, op);
        },

        currency: function (cellVal, opts) {
            var op = $.extend({}, opts.currency);
            if (opts.colModel !== undefined && opts.colModel.formatoptions !== undefined) {
                op = $.extend({}, op, opts.colModel.formatoptions);
            }
            if (Grid.fmatter.isEmpty(cellVal)) {
                return op.defaultValue;
            }
            return Grid.fmatter.util.NumberFormat(cellVal, op);
        },

        /**
         * e.g. colModel中使用举例如下
         * formatter: "typeEnum", formatoptions: {typeEnum: {"1": "待处理", "2": "待审核", "3": "已审核"}}
         */
        typeEnum: function (cellVal, options/*, rowObject*/) {
            var formatoptions = options.colModel.formatoptions,
                typeEnum = formatoptions && formatoptions.typeEnum || {};

            return typeEnum[cellVal] || "&#160;";
        }

    });


    /**
     * 初始化ouiGrid或者调用ouiGrid方法
     * @param {string | option}pin
     * @returns {*}
     */
    $.fn.ouiGrid = function (pin) {
        if (typeof pin === "string") {
            var fn, args, noReturnValue = void 0, returnValue = void 0;

            args = $.makeArray(arguments).slice(1);
            this.each(function () {
                var gridInstance = $(this).data("gridInstance");

                if (pin === "getInstance") {
                    returnValue = gridInstance || null;
                    return false;
                } else if (pin === "destroy") {
                    $(this).data("gridInstance", null);
                }

                fn = gridInstance[pin];

                if (!fn) {
                    throw ("ouiGrid - No such method: " + pin);
                }
                returnValue = fn.apply(gridInstance, args);
                if (returnValue !== noReturnValue) {
                    return false;
                }
            });
            return returnValue === noReturnValue ? this : returnValue;
        }

        return this.each(function () {
            var gridInstance = Grid(this, $.extend(true, {}, $.fn.ouiGrid.defaults, pin));

            $(this).data("gridInstance", gridInstance);
        });
    };

    Grid.defaults = $.fn.ouiGrid.defaults = {
        keyName: "id",
        rowNumber: true,
        rowNumWidth: 30,
        width: "auto",
        shrinkToFit: false,
        scrollWidth: 18
    };

    Grid.fmatter.defaults = $.fn.ouiGrid.fmatter = {
        integer: {thousandsSeparator: "", defaultValue: "0"},
        number: {decimalSeparator: ",", thousandsSeparator: "", decimalPlaces: 2, defaultValue: "0.00"},
        currency: {
            decimalSeparator: ".",
            thousandsSeparator: ",",
            decimalPlaces: 2,
            prefix: "",
            suffix: "",
            defaultValue: "0.00"
        }
    };
})(jQuery);