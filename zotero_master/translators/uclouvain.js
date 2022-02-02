{
	"translatorID": "516ad412-d9f3-48b6-ac66-404e117c5cfb",
	"label": "uclouvain",
	"creator": "Timotheus Kim",
	"target": "^https?://(www\\.)?dial\\.uclouvain\\.be",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-02-01 16:12:07"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen All rights reserved.

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
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
 	var items = {};
 	var found = false;
 	var rows = doc.querySelectorAll('.title a');
 	for (let row of rows) {
 		let href = row.href;
 		let title = ZU.trimInternal(row.textContent);
 		if (!href || !title) continue;
 		if (checkOnly) return true;
 		found = true;
 		items[href] = title;
 	}
 	return found ? items : false;
 }
 
function doWeb(doc, url) {
 	if (detectWeb(doc, url) == "multiple") {
 		Zotero.selectItems(getSearchResults(doc, false), function (items) {
 			if (items) ZU.processDocuments(Object.keys(items), scrape);
 		});
 	}
 	else {
 		scrape(doc, url);
 	}
 }

function scrape(doc, url) {
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));//Z.debug(json)
 	var translator = Zotero.loadTranslator('web');
 	// Embedded Metadata
 	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
 	// translator.setDocument(doc);
 	translator.setHandler('itemDone', function (obj, item) {
	if (json.pagination) item.pages = json.pagination;
	if (json.description) item.abstractNote = json.description;
	if (json.keywords) {
		for (let tag of json.keywords) {
		if (json && !tag.match(/^\d/)) item.tags.push({ tag });
		}
	}
	
	if (json.url) item.notes.push({note: "doi:" + json.url});
	
	//ppn abfrage 
	item.complete();
 	});
	
 	translator.getTranslatorObject(function (trans) {
 		trans.itemType = "journalArticle";
 		trans.doWeb(doc, url);
 	});
 }
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/issue/view/201",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2731",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mit der Islamischen Theologie im Gespräch. Zu einigen Neuerscheinungen aus dem Bereich der christlich-muslimischen Beziehungen",
				"creators": [
					{
						"firstName": "Anja",
						"lastName": "Middelbeck-Varwick",
						"creatorType": "author"
					}
				],
				"date": "2020/04/20",
				"DOI": "10.17879/thrv-2020-2731",
				"ISSN": "2699-5433",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "www.uni-muenster.de",
				"publicationTitle": "Theologische Revue",
				"rights": "Copyright (c) 2020",
				"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2731",
				"volume": "116",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2689",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hammann, Konrad: Rudolf Bultmann und seine Zeit. Biographische und theologische Konstellationen",
				"creators": [
					{
						"firstName": "Matthias",
						"lastName": "Dreher",
						"creatorType": "author"
					}
				],
				"date": "2020/04/20",
				"DOI": "10.17879/thrv-2020-2689",
				"ISSN": "2699-5433",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "www.uni-muenster.de",
				"publicationTitle": "Theologische Revue",
				"rights": "Copyright (c) 2020",
				"shortTitle": "Hammann, Konrad",
				"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2689",
				"volume": "116",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2690",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Levering, Matthew: The Achievement of Hans Urs von Balthasar. An Introduction to His Trilogy",
				"creators": [
					{
						"firstName": "Wolfgang",
						"lastName": "Müller",
						"creatorType": "author"
					}
				],
				"date": "2020/04/20",
				"DOI": "10.17879/thrv-2020-2690",
				"ISSN": "2699-5433",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "www.uni-muenster.de",
				"publicationTitle": "Theologische Revue",
				"rights": "Copyright (c) 2020",
				"shortTitle": "Levering, Matthew",
				"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2690",
				"volume": "116",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
