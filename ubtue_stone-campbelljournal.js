{
	"translatorID": "30951cef-8237-4384-9ae5-4c926710e848",
	"label": "ubtue_stone-campbelljournal",
	"creator": "Helena Nebel",
	"target": "https?://www.stone-campbelljournal.com/the_journal/research/volume",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-04 14:17:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Universitätsbibliothek Tübingen.  All rights reserved.
	
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

var articleData = {};
var date = "";
var pagesData = {};
var pagesList = [];

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) return "multiple";
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	if (ZU.xpathText(doc, '//p[contains(., "Current Issue")]') != null) {
		if (ZU.xpathText(doc, '//p[contains(., "Current Issue")]').match(/\d{4}/) != null) {
			date = ZU.xpathText(doc, '//p[contains(., "Current Issue")]').match(/\d{4}/)[0];
		}
	}
	var rows = ZU.xpath(doc, '//div[@class="article"]');
	for (let row of rows) {
		
		let href = "http://www.stone-campbelljournal.com/" + ZU.xpathText(row, './/div[@class="articletitle"]/a/@href');
		let title = ZU.xpathText(row, './/div[@class="articletitle"]');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
		articleData[href] = row;
		pagesData[href] = ZU.xpathText(row, './/div[@class="articlepage"]');
		pagesList.push(ZU.xpathText(row, './/div[@class="articlepage"]'));
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				scrape(doc, articleData[i]);
			}
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, text) {
	
	//Z.debug(text)
	var item = new Zotero.Item('journalArticle');
	item.title = ZU.xpathText(text, './/div[@class="articletitle"]');
	
	item.url = "http://www.stone-campbelljournal.com/" + ZU.xpathText(text, './/div[@class="articletitle"]/a/@href');
		ZU.doGet(item.url,
		function (newtext) {
		var parser = new DOMParser();
			var html = parser.parseFromString(newtext, "text/html");
			item.abstractNote = ZU.xpathText(html, './/div[@id="abstract"]');
	
	for (let creators of ZU.xpath(text, './/div[@class="articleauthor"]')) {
		for (let creator of creators.textContent.split(/\s*,\s*/)) item.creators.push(ZU.cleanAuthor(creator.replace(/\s*Sr\.\s*/, ''), "author"));
	}
	
	if (item.title.match(/^review\s+article/i)) item.tags.push('RezensionstagPica');
	let firstPage = pagesData[item.url];
	if (pagesList.indexOf(firstPage)+1 < pagesList.length) {
		let lastPage = pagesList[pagesList.indexOf(firstPage)+1];
		item.pages = firstPage + '-' + lastPage;
	}
	else item.pages = firstPage + '-';
	
	item.volume = item.url.match(/\/volume-(.+?)-issue-.+?\//)[1];
	item.issue = item.url.match(/\/volume-.+?-issue-(.+?)\//)[1];
	item.date = date;
	item.ISSN = "1097-6566";
	if (item.abstractNote != null) item.abstractNote = item.abstractNote.replace(/(\n+)|(^Abstract)/g, ' ');
	item.complete();
		});

	
	
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.stone-campbelljournal.com/the_journal/research/volume-24-issue-1/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
