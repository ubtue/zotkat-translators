{
	"translatorID": "416ec810-34d0-4e3b-a4a5-a01607ab85d7",
	"label": "ubtue_siak",
	"creator": "Helena Nebel",
	"target": "https://www.bmi.gv.at/104/Wissenschaft_und_Forschung/SIAK-Journal",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-19 11:49:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/\/Ausgabe_\d+\./) && getSearchResults(doc)) return "multiple";
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	let title = null;
	var rows = ZU.xpath(doc, '//p[contains(//a[@title="Zitation"]/@href, "ris")]');
	for (let row of rows) {
		let href = "https://www.bmi.gv.at/" + ZU.xpathText(row, './/a[@title="Zitation"]/@href');
		title = href;
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEMTranslator(risURL) {
	ZU.doGet(risURL, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			
			item.complete();
		});
		translator.translate();
	});
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			for (let article of articles) {
				invokeEMTranslator(article);
			}
		});
	}
}
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
