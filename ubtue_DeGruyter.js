{
	"translatorID": "9ef1752e-bd32-49bb-9d9b-f06c039712ab",
	"label": "ubtue_DeGruyter",
	"creator": "Timotheus Kim",
	"target": "^https?://www\\.degruyter\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-02-16 10:24:08"
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
	if (url.match(/document/)) return "journalArticle";
		else if (url.match(/journal/) && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "issueContentsArticleLink", " " ))]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.text);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
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
		if (i.title.match(/ISBN/) || i.publicationTitle === 'Verkündigung und Forschung') i.tags.push('RezensionstagPica') && delete i.abstractNote;
		let transAbstract = ZU.xpathText(doc, '//*[(@id = "transAbstract")]//p');
		if (i.abstractNote && transAbstract) i.abstractNote += '\\n4207 ' + transAbstract;
		let pseudoabstract = i.title;
		if (i.abstractNote === undefined) i.abstractNote = '';
		if (i.abstractNote.match(pseudoabstract) || i.abstractNote.match(/^Der Artikel/)) delete i.abstractNote;
		if (!i.ISSN) i.ISSN = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "onlineissn", " " )) and contains(concat( " ", @class, " " ), concat( " ", "text-metadata-value", " " ))]');
		i.complete();
	});
	translator.translate();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.14315/arg-2019-1100103/html",
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
				"issue": "1",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "23-48",
				"publicationTitle": "Archiv für Reformationsgeschichte - Archive for Reformation History",
				"shortTitle": "Zwischen Tradition und Innovation",
				"url": "https://www.degruyter.com/document/doi/10.14315/arg-2019-1100103/html",
				"volume": "110",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.degruyter.com/document/doi/10.14315/arg-2019-1100109/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Heinrich Bullinger, sein Diarium und der Beginn der Kleinen Eiszeit-Phase von 1570 bis 1630",
				"creators": [
					{
						"firstName": "Otto",
						"lastName": "Ulbricht",
						"creatorType": "author"
					}
				],
				"date": "2019/12/01",
				"DOI": "10.14315/arg-2019-1100109",
				"ISSN": "2198-0489",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "200-236",
				"publicationTitle": "Archiv für Reformationsgeschichte - Archive for Reformation History",
				"url": "https://www.degruyter.com/document/doi/10.14315/arg-2019-1100109/html",
				"volume": "110",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.degruyter.com/document/doi/10.14315/vf-2016-0206/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Überlappender Konsens? Neue Trends in der evangelischen Ethik",
				"creators": [
					{
						"firstName": "Klaas",
						"lastName": "Huizing",
						"creatorType": "author"
					}
				],
				"date": "2016/08/01",
				"DOI": "10.14315/vf-2016-0206",
				"ISSN": "2198-0454",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "127-134",
				"publicationTitle": "Verkündigung und Forschung",
				"shortTitle": "Überlappender Konsens?",
				"url": "https://www.degruyter.com/document/doi/10.14315/vf-2016-0206/html",
				"volume": "61",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.14315/vf-2020-650205/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "New Testament and Digital Humanities",
				"creators": [
					{
						"firstName": "Claire",
						"lastName": "Clivaz",
						"creatorType": "author"
					}
				],
				"date": "2020/08/01",
				"DOI": "10.14315/vf-2020-650205",
				"ISSN": "2198-0454",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "98-104",
				"publicationTitle": "Verkündigung und Forschung",
				"url": "https://www.degruyter.com/document/doi/10.14315/vf-2020-650205/html",
				"volume": "65",
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
