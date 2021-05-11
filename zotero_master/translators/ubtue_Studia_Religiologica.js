{
	"translatorID": "f85e91df-65fa-412a-8f46-67ea367a5b65",
	"label": "ubtue_Studia_Religiologica",
	"creator": "Timotheus Kim",
	"target": "https://www.ejournals.eu/Studia-Religiologica/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-05-11 14:56:22"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Universitätsbibliothek Tübingen All rights reserved.

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

function detectWeb(doc, url) {
	if (url.includes('/art/')) return "journalArticle";
		else if (getSearchResults(doc, true)) return "multiple";
	return false;
}

function getSearchResults(doc, checkOnly) {
  let items = {};
  let found = false;
  let rows = doc.querySelectorAll('.title');
  for (let row of rows) {
	let href = row.href;
	let title = ZU.trimInternal(row.textContent)
	if (!href || !title) continue;
	if (checkOnly) return true;
	found = true;
	items[href] = title;
  }
  return found ? items : false;
}

function getAbstractAndKeywords(item) {
	var keyWords = [];
	ZU.doGet(item.url,
		function (text) {
		var parser = new DOMParser();
			var html = parser.parseFromString(text, "text/html");
			var keyWordTag = ZU.xpath(html, '//meta[@name="keywords"]')[0].content;
			item.tags = keyWordTag.split(/, |; /);
			let pTags = ZU.xpath(html, '//div[@class="abstract-text"]//div[@class="text input-text"][1]/p');
			item.abstractNote = ''
			for (let entry in pTags) {
				var newAbstract = pTags[entry].innerHTML.trim();
				if (newAbstract.length > item.abstractNote.length) {
				item.abstractNote = ZU.cleanTags(newAbstract);
			}
			}
			
			item.complete();
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
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	Z.debug(url);
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (t, item) {
		let checkLanguage = ZU.xpathText(doc, '(//div[@class="abstract-text"]//div[@class="text input-text"]//p//strong)[1]');
		if (checkLanguage === null) item.language = 'en';
		item.volume = item.issue.match(/tom\s+(\d+).*numer\s+(\d+)/i)[1];
		item.issue = item.issue.match(/tom\s+(\d+).*numer\s+(\d+)/i)[2];
		getAbstractAndKeywords(item);
		});
	translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ejournals.eu/Studia-Religiologica/2020/Numer-53-4-2020/art/18056/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "God and Difference",
				"creators": [
					{
						"firstName": "Krzysztof",
						"lastName": "Mech",
						"creatorType": "author"
					}
				],
				"date": "2020/12/1",
				"DOI": "10.4467/20844077SR.20.018.13036",
				"ISSN": "2084-4077",
				"abstractNote": "God and Difference",
				"archiveLocation": "World",
				"issue": "Tom 53, Numer 4",
				"language": "en",
				"libraryCatalog": "www.ejournals.eu",
				"pages": "255-274",
				"publicationTitle": "Studia Religiologica",
				"url": "https://www.ejournals.eu/Studia-Religiologica/2020/Numer-53-4-2020/art/18056/",
				"volume": "2020",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Studia Religiologica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ejournals.eu/Studia-Religiologica/2020/Numer-53-4-2020/art/18055/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Postawa męstwa bycia – odpowiedź dana nie tylko Hamletowi",
				"creators": [
					{
						"firstName": "Marcin",
						"lastName": "Hintz",
						"creatorType": "author"
					},
					{
						"firstName": "Maria",
						"lastName": "Urbańska-Bożek",
						"creatorType": "author"
					}
				],
				"date": "2020/12/1",
				"DOI": "10.4467/20844077SR.20.019.13037",
				"ISSN": "2084-4077",
				"abstractNote": "Postawa męstwa bycia – odpowiedź dana nie tylko Hamletowi",
				"archiveLocation": "World",
				"issue": "Tom 53, Numer 4",
				"language": "pl",
				"libraryCatalog": "www.ejournals.eu",
				"pages": "275-287",
				"publicationTitle": "Studia Religiologica",
				"url": "https://www.ejournals.eu/Studia-Religiologica/2020/Numer-53-4-2020/art/18055/",
				"volume": "2020",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Studia Religiologica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
