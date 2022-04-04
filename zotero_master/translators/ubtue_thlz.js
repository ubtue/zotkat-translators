{
	"translatorID": "ce85de7b-0f49-4e7f-83c6-bad720f484e3",
	"label": "ubtue_thlz",
	"creator": "Helena Nebel",
	"target": "www\\.thlz\\.com\\/(artikel\\/|seiten\\/|inhaltsverzeichnisse\\/\\?heft=)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-01 11:30:40"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
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
	if (url.match(/\?heft=/) && getSearchResults(doc)) return "multiple";
	else if (url.match(/\/(artikel|seiten)\//)) return "journalArticle";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[contains(@href, "/artikel/") or contains(@href, "/seiten/")]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function scrape(doc, url) {
	let i = new Zotero.Item("journalArticle");
	let is_bookreview = false;
	if (ZU.xpathText(doc, '//div[@id="inhalt"]//tr').match(/Rezensent(?:in)?:\s/) != null) is_bookreview = true;
	for (let row of ZU.xpath(doc, '//div[@id="inhalt"]//tr')) {
		if (ZU.xpathText(row, './td[1]').match(/^Titel/)) i.title = ZU.xpathText(row, './td[2]');
		if (ZU.xpathText(row, './td[1]').match(/^Rezensent/)) i.creators.push(ZU.cleanAuthor(ZU.xpathText(row, './td[2]'), 'author', true));
		if (!is_bookreview) {
			if (ZU.xpathText(row, './td[1]').match(/^Autor\/Hrsg\./)) i.creators.push(ZU.cleanAuthor(ZU.xpathText(row, './td[2]'), 'author', true));
		}
		if (ZU.xpathText(row, './td[1]').match(/^Spalte/)) i.pages = ZU.xpathText(row, './td[2]');
		if (ZU.xpathText(row, './td[1]').match(/^Ausgabe/)) i.date = ZU.xpathText(row, './td[2]').match(/\d{4}/)[0];
		if (ZU.xpathText(row, './td[1]').match(/^Ausgabe/)) i.volume = ZU.xpathText(row, './td[2]').match(/\d{4}/)[0];
		if (ZU.xpathText(row, './td[1]').match(/^Ausgabe/)) {
			if (ZU.xpathText(row, './td[2]').match(/^(.+)\//) != null) i.issue = ZU.xpathText(row, './td[2]').match(/^(.+)\//)[1];
			if (ZU.xpathText(row, './td[2]').match(/Nr\.\s+\d+/) != null) i.issue = ZU.xpathText(row, './td[2]').match(/Nr\.\s+(\d+)/)[1];
		}
	}
	if (is_bookreview) {
		i.tags.push("RezensionstagPica");
	}
	
	i.url = url;
	i.language = "ger";
	i.ISSN = "0040-5671";
	i.publicationTitle = "Theologische Literaturzeitung (ThLZ)";
	i.attachments = [];
	i.complete();
}

function doWeb(doc, url) {
	Z.debug(detectWeb(doc, url));
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}




/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.thlz.com/inhaltsverzeichnisse/?heft=1876_24",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.thlz.com/seiten/1876/322/443/?inhalt=heft%3D1876_24%23r2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Adami gesta Hammaburgensis ecclesiae pontificum ex recensione Lappenbergii. In usum scholarum ex monumentis Germaniae historicis recusa. Editio altera 1876",
				"creators": [
					{
						"firstName": "Carl",
						"lastName": "Bertheau",
						"creatorType": "author"
					}
				],
				"date": "1876",
				"ISSN": "0040-5671",
				"issue": "24",
				"language": "ger",
				"libraryCatalog": "ubtue_thlz",
				"pages": "623-624",
				"publicationTitle": "Theologische Literaturzeitung (ThLZ)",
				"url": "http://www.thlz.com/seiten/1876/322/443/?inhalt=heft%3D1876_24%23r2",
				"volume": "1876",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
