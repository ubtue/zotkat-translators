{
	"translatorID": "e86123a9-59a1-474a-ad01-f54fc210f6e0",
	"label": "ubtue_TheoWeb",
	"creator": "Helena Nebel",
	"target": "https://www.theo-web.de/ausgaben/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-05 14:43:23"
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
var issue = "";
var volume = "";
var pagesData = {};
var pagesList = [];

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) return "multiple";
}

function getSearchResults(doc, checkOnly) {
	
	var items = {};
	var found = false;
	let url = doc.URL;
	var rows = ZU.xpath(doc, '//tr');
	for (let row of rows) {
		let href = ZU.xpathText(row, './/td[@class="th-titel"]/a/@href');
		let title = ZU.xpathText(row, './/td[@class="th-titel"]/a');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
		articleData[href] = row;
		pagesData[href] = ZU.xpathText(row, './/th[@class="th-site"]').replace(/\n+|\s+/g, '');
		pagesList.push(ZU.xpathText(row, './/th[@class="th-site"]').replace(/\n+|\s+/g, ''));
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
	//Z.debug(doc);
	var item = new Zotero.Item('journalArticle');
	item.title = ZU.xpathText(text, './td[@class="th-titel"]').trim(/\n/);
	item.url = 'https://www.theo-web.de' + ZU.xpathText(text, './td[@class="th-titel"]/a/@href');
	for (let creators of ZU.xpath(text, './td[@class="th-autor"]')) {
		for (let creator of creators.textContent.split(/\s*,\s*/)) item.creators.push(ZU.cleanAuthor(creator.replace(/\s*Sr\.\s*/, ''), "author"));
	}
	if (item.title.match(/^review\s+article/i)) item.tags.push('RezensionstagPica');
	let firstPage = pagesData[ZU.xpathText(text, './td[@class="th-titel"]/a/@href')];
	if (pagesList.indexOf(firstPage)+1 < pagesList.length) {
		let lastPage = pagesList[pagesList.indexOf(firstPage)+1];
		item.pages = firstPage + '-' + lastPage;
	}
	else item.pages = firstPage + '-';
	if (item.url.match(/\/\d+-jahrgang-\d{4}-heft-\d+\//) != null) {
		let issuedInfo = item.url.match(/\/(\d+)-jahrgang-(\d{4})-heft-(\d+)\//);
		item.volume = issuedInfo[1];
		item.issue = issuedInfo[3];
		item.date = issuedInfo[2];
	}
	
	item.ISSN = "1863-0502";
	item.publicationTitle = "Theo-Web";
	ZU.doGet(item.url,
		function (text) {
			var parser = new DOMParser();
			var html = parser.parseFromString(text, "text/html");
			item.abstractNote = ZU.xpathText(html, '//meta[@name="description"]/@content');
			let keyWords = ZU.xpathText(html, '//meta[@name="keywords"]/@content');
			if (keyWords != null) item.tags = keyWords.split(/\s*,\s*/);
			let doiTag = ZU.xpathText(html, '//p[@class="artikel-info"]');
			if (doiTag != null) {
				if (doiTag.match(/https:\/\/doi.org\/([^\s]+)/) != null) {
					item.DOI = doiTag.match(/https:\/\/doi.org\/([^\s]+)/)[1];
				}
			}
		item.complete();
		});




	
		
	


	//if (item.abstractNote != null) item.abstractNote = item.abstractNote.replace(/(\n+)|(^Abstract)/g, ' ');
	
	
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.theo-web.de/ausgaben/2022/21-jahrgang-2022-heft-1",
		"items": "multiple"
	}
]
/** END TEST CASES **/
