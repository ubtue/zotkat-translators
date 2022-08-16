{
	"translatorID": "dd556c63-b59c-495b-849b-8e7535896ca1",
	"label": "ubtue_SBJT",
	"creator": "Helena Nebel",
	"target": "journal-of-theology/sbjt",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-16 14:16:24"
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

var issue = "";
var volume = "";
var date = "";

function detectWeb(doc, url) {
	return "multiple";
}

function getSearchResults(doc) {
	let issueInfo = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	if (issueInfo.match(/SBJT\s+(\d+)\/(\d+).+(\d{4})/)) {
		volume = issueInfo.match(/SBJT\s+(\d+)\/(\d+).+(\d{4})/)[1];
		issue = issueInfo.match(/SBJT\s+(\d+)\/(\d+).+(\d{4})/)[2];
		date = issueInfo.match(/SBJT\s+(\d+)\/(\d+).+(\d{4})/)[3];
	}
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[contains(@href, "/publications")]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.xpathText(row, './article');
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function getArticle(doc) {
	let item = new Zotero.Item('journalArticle');
	item.url = doc.URL;
	item.title = ZU.xpathText(doc, '//h1[contains(@class,"title")]');
	for (let authorTag of ZU.xpath(doc, '//span[contains(@class,"author")]/span')) {
		item.creators.push(ZU.cleanAuthor(authorTag.textContent, "author"));
	}
	item.volume = volume;
	item.issue = issue;
	item.date = date;
	item.ISSN = "1520-7307";
	item.publicationTitle = "The Southern Baptist Journal of Theology";
	item.complete();
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
			ZU.processDocuments(articles, getArticle);
		});
	} else
		getArticle(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
