{
	"translatorID": "9ef1752e-bd32-49bb-9d9b-f06c039712ab",
	"label": "ubtue_DeGruyter",
	"creator": "Timotheus Kim",
	"target": "^https?://www\\.degruyter\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-09-18 13:46:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
	
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
	if (url.match(/article/)) return "journalArticle";
		else if (url.match(/issue/) && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.c-Button--link, c-Button--primary');
	for (let row of rows) {
		var href = row.href.match(/article/); //Z.debug(href)
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href.input] = title;
	}
	return found ? items : false;
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
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else
		invokeEMTranslator(doc, url);
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (i.title.match(/ISBN/)) i.tags.push('RezensionstagPica') && delete i.abstractNote;
		let transAbstract = ZU.xpathText(doc, '//*[(@id = "transAbstract")]//p');
		if (i.abstractNote && transAbstract) i.abstractNote += '\\n4207' + transAbstract;
		if (!i.ISSN) i.ISSN = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "onlineissn", " " )) and contains(concat( " ", @class, " " ), concat( " ", "text-metadata-value", " " ))]');
		i.complete();
	});
	translator.translate();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.degruyter.com/view/journals/arg/110/1/article-p23.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zwischen Tradition und Innovation: Lukas von Prag als liturgischer Theologe der Böhmischen Brüder",
				"creators": [
					{
						"firstName": "Tabita",
						"lastName": "Landová",
						"creatorType": "author"
					}
				],
				"date": "2019/12/01",
				"DOI": "10.14315/arg-2019-1100103",
				"ISSN": "2198-0489",
				"abstractNote": "Der Artikel Zwischen Tradition und Innovation: Lukas von Prag als liturgischer Theologe der Böhmischen Brüder wurde am 01.12.2019 in der Zeitschrift Archiv für Reformationsgeschichte - Archive for Reformation History (Band 110, Heft 1) veröffentlicht.",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "23-48",
				"publicationTitle": "Archiv für Reformationsgeschichte - Archive for Reformation History",
				"shortTitle": "Zwischen Tradition und Innovation",
				"url": "https://www.degruyter.com/view/journals/arg/110/1/article-p23.xml",
				"volume": "110",
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
						"tag": "Frühe Neuzeit"
					},
					{
						"tag": "Geschichte"
					},
					{
						"tag": "Historische Epochen"
					},
					{
						"tag": "Kirchengeschichte der Reformationszeit"
					},
					{
						"tag": "Theologie und Religion"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
