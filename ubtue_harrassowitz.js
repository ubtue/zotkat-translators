{
	"translatorID": "b8bb700b-51f0-4731-9105-74cf6da73c4d",
	"label": "ubtue_harrassowitz",
	"creator": "Paula Hähndel",
	"target": "https://zar.harrassowitz-library.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-16 06:49:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2023 by Paula Hähndel
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
	if (url.includes("article")) {
		return "journalArticle";
	} else if (getSearchResults(doc)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div//section//h3//a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
  if (detectWeb(doc, url) == "multiple") {
	Zotero.selectItems(getSearchResults(doc, url, false), function (items) {
	  if (items) ZU.processDocuments(Object.keys(items), scrape);
	});
  } else
  {
	scrape(doc, url);
  }
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.itemType = "journalArticle";
		if (i.ISSN.match(/\d{7}./)) i.ISSN = i.ISSN.substring(0,4) + "-" + i.ISSN.substring(4);
		if (i.pages) i.pages = i.pages.trim().replace(/^([^-]+)-\1$/, '$1');
		if (ZU.xpathText(doc, '//div[@id="abstract_de"]//p')) {
			i.abstract = ZU.xpathText(doc, '//div[@id="abstract_de"]//p');
		}
		if (ZU.xpathText(doc, '//section[@class="section"]//a') && ZU.xpathText(doc, '//section[@class="section"]//a').includes("Review")) {
			i.tags.push("RezensionstagPica");
		}
		delete i.issue;
		i.attachments = [];
		//i.url = url;
		i.complete();
	});
	translator.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://zar.harrassowitz-library.com/article/ZAR/2022/1/15",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Schriftgelehrte Autoren im nachexilischen Hexateuch und Pentateuch. Zu ihrer sozialhistorischen Einordnung",
				"creators": [
					{
						"firstName": "Eckart",
						"lastName": "Otto",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "2747-4461",
				"language": "de",
				"libraryCatalog": "zar.harrassowitz-library.com",
				"pages": "239-250",
				"publicationTitle": "Zeitschrift für altorientalische und biblische Rechtsgeschichte",
				"url": "https://zar.harrassowitz-library.com/article/ZAR/2022/1/15",
				"volume": "28",
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
