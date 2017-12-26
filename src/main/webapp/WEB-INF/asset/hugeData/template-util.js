var templateUtil = {
	/**
	 * <pre>
     *      例：
     *      templateId = "advertsImgTemplate"
     *      <script id="advertsImgTemplate" type="text/template">
     *          <li style="background-image:url([%= httPath %]);">
     *              [% if (url === "") { %]
     *                  <a target="_blank"></a>
     *              [%} else { %]
     *                  <a href="[%= url %]" target="_blank"></a>
     *              [% } %]
     *          </li>
     *      </script>
     *      templateData = { httPath: "a", url: "b" };
     * </pre>
     *
	 * 通过模板id与模板数据获得模板内容
	 * @param templateId 模板id
	 * @param templateData 模板要用到的数据
	 * @returns {*}
	 */
	getHTML: function (templateId, templateData) {
		var ele = document.getElementById(templateId),
			content = (ele.textContent || ele.text).replace(/\r/g, "").replace(/\n/g, ""),
			templateSetting = {
				evaluate: /\[%([\s\S]+?)%\]/g,
				interpolate: /\[%=([\s\S]+?)%\]/g,
				escape: /\[%-([\s\S]+?)%\]/g
			},
			rel;

		try {
			rel = _.template(String(content).replace(/^\s+|\s+$/g, ""), templateData, templateSetting);
		} catch (e) {
			console && console.log(e);
            console && console.log(e.source);
		}

		return rel;
	}
};