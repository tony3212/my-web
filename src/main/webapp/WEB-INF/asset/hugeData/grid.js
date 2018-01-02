/**
 * @type {object} colModel 列配置项
 * @property {string} colModel.name 列的字段名
 * @property {string} colModel.label 列的展示名称
 * @property {string | function} colModel.formatter 显示值格式器
 * @property {? object} colModel.formatoptions 格式配置项
 * @property {string} colModel.align 对齐方式, left,center,right中的一个值
 * @property {? object | function} colModel.cellStyle 单元格样式
 * @property {? string | function} colModel.cellClass 单元格class
 * @property {? string | object | function} colModel.cellAttr 单元格属性
 *
 * @type {object} option 初始化时的配置项
 * @property {string} option.keyName 主键的字段名
 * @property {colModel[]} option.colModel 每列列定义
 * @property {object[]} option.data 要展示的数据
 * @property {boolean} option.rowNumber 是否展示序列号
 * @property {string | object | function} option.rowAttr 行dom的属性
 * @property {string | object | function} option.rowClass 行dom的class
 * @property {string | object | function} option.rowStyle 行dom的style
 */
(function ($) {
    function log() {
        console.log.apply(console, arguments);
    }

    function logGroup() {
        console.group.apply(console, arguments);
    }

    function logGroupEnd() {
        console.groupEnd.apply(console, arguments);
    }

    var Grid = function (gridBox, option) {
        return new Grid.fn.init(gridBox, option);
    };

    Grid.fn = Grid.prototype = {
        constructor: Grid,

        /** 存储数据容器 */
        store: {
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
                data: null,
                dataMap: {},
                pageInfo: {
                    pageSize: null,
                    totalPage: null,
                    allRecords: null,
                    // 缓存了页面数据
                    cachedPage: {}
                }
            }
        },

        event: {},

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
                pageSize, totalPage, allRecords, $tbody, preScrollTop,
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
                before2PageEndRowId = self.getRowIdByRowData(self.getRowDataByIndex(before2PageEndIndex));
                $before2PageEndRowEle = $(self.getRowElementByRowId(before2PageEndRowId));
                var $preAll = $before2PageEndRowEle.prevAll();
                $preAll.each(function () {
                    removeElementHeight += $(this).outerHeight(true);
                });
                log("删除【序号%i】之前的数据，共删除%i个元素", before2PageEndIndex + 1, $preAll.length);
                $tbody = $(self.getGridBody());
                preScrollTop = $tbody.scrollTop();
                $preAll.remove();
                // 为了实现无缝滚动（为了往下翻页时不会出现抖动），重新设置scrollTop
                $tbody.scrollTop(preScrollTop - removeElementHeight);
            }

            // 2.删除当前页后两页的数据
            if (after2PageStartIndex != null && after2PageStartIndex <= allRecords.length) {
                after2PageStartRowId = self.getRowIdByRowData(self.getRowDataByIndex(after2PageStartIndex));
                $after2PageStartRowEle = $(self.getRowElementByRowId(after2PageStartRowId));
                var $nextAll = $after2PageStartRowEle.nextAll();
                log("删除【序号%i】之后的数据，共删除%i个元素", after2PageStartIndex + 1, $nextAll.length);
                $nextAll.remove();
            }
            log("removeElementHeight: " + removeElementHeight);

            cachedPage = pageInfo["cachedPage"];
            cachedPageKeys = Object.keys(pageInfo["cachedPage"]);
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
            var self = this, $tbody, $referenceElement, trHtml, beforeScrollTop, addedHeight = 0;

            position || (position = "after");
            trHtml = templateUtil.getHTML("gridDataTemplate", {
                renderPageModel: renderPageModel,
                renderModel: self.getRenderModel(),
                gridInstance: self
            });
            $tbody = $(self.getGridBody());
            $referenceElement = !referenceRowId
                ? $tbody
                : $(self.getRowElementByRowId(referenceRowId));

            if (!referenceRowId) {
                $referenceElement.append(trHtml);
            } else if (position === "after") {
                $referenceElement.after(trHtml);
            } else {
                beforeScrollTop = $tbody.scrollTop();
                $referenceElement.before(trHtml);
                // 为了实现无缝滚动（为了往上翻页时不会出现抖动），重新设置scrollTop
                $referenceElement.prevAll().each(function () {
                    addedHeight += $(this).height();
                });
                $tbody.scrollTop(beforeScrollTop + addedHeight);
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
         * 初始化colModel的初始值
         * @param {colModel} colModel
         */
        _initColModel: function (colModel) {
            $.each(colModel, function (index, cellModel) {
                var align = cellModel.align, formatter = cellModel.formatter;

                // 处理对齐方式
                if ( align === undefined) {
                    if (formatter === undefined) {
                        cellModel.align = "left";
                    } else if (formatter === "number" || formatter === "integer" || formatter === "currency") {
                        cellModel.align = "right";
                    } else if (formatter === "typeEnum") {
                        cellModel.align = "center";
                    } else {
                        cellModel.align = "left";
                    }
                }
            });
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
            var classArray = [];

            classArray.push("grid-cell");

            return classArray.join(" ");
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
            var classArray = [];

            classArray.push("text-align" + ":" + cellModel.align + ";");

            return classArray.join("");
        },

        /**
         * 获得预定义行的class样式
         * @param rowData
         * @param rowId
         * @returns {string}
         * @private
         */
        _predefineRowClass: function (rowData, rowId) {
            return "grid-row";
        },

        /**
         * 预定义行样式
         * @private
         */
        _predefineRowStyle: function (rowData, rowId) {
            return "background: yellow;";
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
            var attrValue, opts, type, result;

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
                    result = "";
                    $.each(attrValue, function (key, value) {
                        result += " " + key + "=" + value + " ";
                    });
                    return result;
                }
            }

            if (type === "object") {
                result = "";
                $.each(attrValue, function (key, value) {
                    result += " " + key + "=" + value + " ";
                });
                return result;
            }

            return "";
        },

        /**
         * 获得单元格dom的class属性，渲染单元格时使用
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
                return [predefineCellClass, classValue].join(" ");
            }

            if (type === "function") {
                opts = {rowId: rowId, colModel: cellModel, gid: $(this.context).attr("id")};
                return [predefineCellClass, classValue.call(self, cellVal, opts, rowData, rowId)].join(" ");
            }

            return predefineCellClass;
        },

        /**
         * 获得单元格dom的style属性，渲染单元格时使用
         * @param {colModel} cellModel 单元格的配置项
         * @param {*} cellVal 单元格的值
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        cellStyle: function (cellModel, cellVal, rowData, rowId) {
            var self = this, styleValue, opts, type, result, predefineCellStyle;

            predefineCellStyle = self._predefineCellStyle(cellModel, cellVal, rowData, rowId);
            styleValue = cellModel["cellStyle"];
            type = $.type(styleValue);

            if (type === "undefined") {
                return predefineCellStyle;
            }

            if (type === "string") {
                return [predefineCellStyle, styleValue].join(" ");
            }

            if (type === "function") {
                opts = {rowId: rowId, colModel: cellModel, gid: $(this.context).attr("id")};
                styleValue = styleValue.call(self, cellVal, opts, rowData, rowId);
                if ($.type(styleValue) === "string") {
                    return [predefineCellStyle, styleValue].join(" ");
                }
                if ($.type(styleValue) === "object") {
                    result = "";
                    $.each(styleValue, function (key, value) {
                        result += " " + key + ":" + value + "; ";
                    });
                    return [predefineCellStyle, result].join(" ");
                }
            }

            if (type === "object") {
                result = "";
                $.each(styleValue, function (key, value) {
                    result += " " + key + ":" + value + "; ";
                });
                return [predefineCellStyle, result].join(" ");
            }

            return predefineCellStyle;
        },

        /**
         * 获得grid行的自定义属性，渲染单元格时使用
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        rowAttr: function (rowData, rowId) {
            var self = this, attrValue, opts, type, result;

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
                    result = "";
                    $.each(attrValue, function (key, value) {
                        result += " " + key + "=" + value + " ";
                    });
                    return result;
                }
            }

            if (type === "object") {
                result = "";
                $.each(attrValue, function (key, value) {
                    result += " " + key + "=" + value + " ";
                });
                return result;
            }

            return "";
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
                return [predefineRowClass, classValue].join(" ");
            }

            if (type === "function") {
                opts = {rowId: rowId, gid: $(this.context).attr("id")};
                return [predefineRowClass, classValue.call(self, rowData, rowId, opts)].join(" ");
            }

            return predefineRowClass;
        },

        /**
         * 获得grid行的的style属性，渲染单元格时使用
         * @param {object} rowData 行数据
         * @param {string} rowId 行id
         * @returns {string}
         */
        rowStyle: function (rowData, rowId) {
            var self = this, styleValue, opts, type, result, predefineRowStyle;

            predefineRowStyle = self._predefineRowStyle(rowData, rowId)
            styleValue = self.getConfig("rowStyle");
            type = $.type(styleValue);

            if (type === "undefined") {
                return predefineRowStyle;
            }

            if (type === "string") {
                return [predefineRowStyle, styleValue].join(" ");
            }

            if (type === "function") {
                opts = {rowId: rowId, gid: $(this.context).attr("id")};
                styleValue = styleValue.call(self, rowData, rowId, opts);
                if ($.type(styleValue) === "string") {
                    return [predefineRowStyle, styleValue].join(" ");
                }
                if ($.type(styleValue) === "object") {
                    result = "";
                    $.each(styleValue, function (key, value) {
                        result += " " + key + ":" + value + "; ";
                    });
                    return [predefineRowStyle, result].join(" ");
                }
            }

            if (type === "object") {
                result = "";
                $.each(styleValue, function (key, value) {
                    result += " " + key + ":" + value + "; ";
                });
                return result;
            }

            return "";
        }
    };

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

        getDataMap: function () {
            return this.getConfig("dataMap");
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
         * 根据行id获取行数据, 没有传时，返回所有数据
         * @param rowId 行id
         * @returns {*}
         */
        getRowData: function (rowId) {
            var dataMap = this.getDataMap();

            return rowId ? dataMap[rowId] : dataMap;
        },

        /**
         * 根据行数据取行id
         * @param rowData
         * @returns {*}
         */
        getRowIdByRowData: function (rowData) {
            var self = this, keyName = self.getConfig("keyName");

            return rowData[keyName];
        },

        /**
         * 根据索引获得行数据
         * @param index 索引
         * @returns {*}
         */
        getRowDataByIndex: function (index) {
            return this.getConfig("data")[index];
        },

        /**
         * 设置行数据
         * @param rowId
         * @param rowData
         */
        setRowData: function (rowId, rowData) {
            var self = this;

            $.extend(self.getRowData(rowId), rowData);
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

        /**
         * 初始化
         * @param gridBox
         * @param {option} option
         */
        init: function (gridBox, option) {
            var self = this, config = self.store.config, rowDataList, dataMap, colModel, colName, renderModel;

            // 1.设定上下文
            self.context = $(gridBox)[0];
            self.setOption(option);

            // 2.初始化相关数据
            colModel = option.colModel;
            self._initColModel(colModel);
            colName = _.pluck(colModel, "label");
            renderModel = {
                keyName: option.keyName,
                colModel: colModel,
                colName: colName,
                rowNumber: option.rowNumber
            };
            rowDataList = $.extend(true, [], option.data);
            dataMap = _.indexBy(rowDataList, option.keyName);
            config = $.extend(true, {}, config, option, {renderModel: renderModel, dataMap: dataMap});
            self.setConfig(config);

            // 3.将数据进行分页，并存储分布信息
            self.extendPageInfo(self._pageData(rowDataList));

            // 4.渲染grid基本内容
            self.renderGridContent(renderModel);

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

            $(context).html(templateUtil.getHTML("gridTemplate", {renderModel: renderModel}));
        },

        /**
         * 绑定事件
         */
        bindEvent: function () {
            var self = this, context = self.context,
                $grid = $(context), $tbody = $(self.getGridBody()),
                lastScrollTop = 0;

            $tbody.off("scroll.gridPage")
                .on("scroll.gridPage", function (event) {
                    var tBody = this, $tBody = $(tBody), scrollTop, reservedHeight = 150,
                        nearlyReachTop = false, nearlyReachBottom = false,
                        scrollHeight, scrollInnerHeight;

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

        },

        /**
         * 获取缓存的页码数
         * @param cachedPage
         * @returns {string[]}
         */
        getCachedPageNumber: function (cachedPage) {
            var self = this;

            cachedPage || (cachedPage = self.getPageInfo()["cachedPage"]);
            return Object.keys(cachedPage).sort(function (numA, numB) {
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

        /**
         * 获得表体元素
         */
        getGridBody: function () {
            var $tbody = $("tbody", this.context);
            return $tbody.length > 0 ? $tbody[0] : null;
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
                    ? self.getRowIdByRowData(self.getRowDataByIndex(cachedPage[self.getCachedMinPageNo(cachedPage)].startIndex))
                    : self.getRowIdByRowData(self.getRowDataByIndex(cachedPage[self.getCachedMaxPageNo(cachedPage)].endIndex));
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
            var gridInstance = new Grid(this, $.extend(true, {}, $.fn.ouiGrid.defaults, pin));

            $(this).data("gridInstance", gridInstance);
        });
   };

    Grid.defaults = $.fn.ouiGrid.defaults = {
        rowNumber: true,
        rowNumWidth: 30
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