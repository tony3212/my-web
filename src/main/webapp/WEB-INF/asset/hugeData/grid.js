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
            return this.store[key];
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
                renderModel: self.getRenderModel()
            });
            $tbody = $(self.getGridBody());
            $referenceElement = !referenceRowId
                ? $tbody
                : $(self.getRowElementByRowId(referenceRowId));

            if (!referenceRowId) {
                $referenceElement.append(trHtml);
                $("tr:gt(0)", $referenceElement).each(function () {
                    addedHeight += $(this).height();
                });
            } else if (position === "after") {
                $referenceElement.after(trHtml);
                $referenceElement.nextAll().each(function () {
                    addedHeight += $(this).height();
                });
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
        }
    };

    $.extend(Grid.prototype, {
        getOption: function () {
            return this._getStore("option");
        },

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
         * @param option
         */
        init: function (gridBox, option) {
            var self = this, config = self.store.config, rowDataList, dataMap, colModel, colName, renderModel;

            // 1.设定上下文
            self.context = $(gridBox)[0];
            self.setOption(option);

            // 2.初始化相关数据
            colModel = option["colModel"];
            colName = _.pluck(colModel, "label");
            renderModel = {
                keyName: option["keyName"],
                colModel: colModel,
                colName: colName,
                rowNumber: option["rowNumber"]
            };
            rowDataList = $.extend(true, [], option["data"]);
            dataMap = _.indexBy(rowDataList, option["keyName"]);
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

            self.extendConfig("loading", true);
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
            self.extendConfig("loading", false);
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
        /**
         * e.g. colModel中使用举例如下
         * formatter: "boolean", formatoptions: {trueValue: 1, falseValue: 0}}
         */
        boolean: function (cellVal, options/*, rowObject*/) {
            var boolDefault = {trueValue: "是", falseValue: "否"},
                formatoptions = options.colModel.formatoptions || {},
                trueValue = formatoptions.trueValue || boolDefault.trueValue,
                falseValue = formatoptions.falseValue || boolDefault.falseValue;

            if (cellVal == null || $.trim(String(cellVal)) === "") {
                return "&nbsp;";
            }
            return cellVal ? trueValue : falseValue;
        },

        /**
         * e.g. colModel中使用举例如下
         * formatter: "typeEnum", formatoptions: {typeEnum: {"1": "待处理", "2": "待审核", "3": "已审核"}}
         */
        typeEnum: function (cellVal, options/*, rowObject*/) {
            var formatoptions = options.colModel.formatoptions,
                typeEnum = formatoptions && formatoptions.typeEnum || {};

            return typeEnum[cellVal] || "";
        }

    });

    
    $.fn.ouiGrid = function (pin) {
        if (typeof pin === 'string') {
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

    $.fn.ouiGrid.defaults = {
        rowNumber: true,
        rowNumWidth: 30
    };
})(jQuery);