{
	"translatorID": "98100e63-ba9f-4a2e-abba-ced3d7ac2fe1",
	"label": "ubtue_Narr",
	"creator": "Helena Nebel",
	"target": "elibrary\\.narr\\.digital\\/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-27 14:28:15"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

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
	// except for "multiple", the return values of this function are placeholders that
	// will be replaced by the Embedded Metadata translator's results
	if (/\/article\//.test(url))
		return "journalArticle";
	else if (/\/journal\//.test(url))
		return "multiple";
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, '//div[@id="content"]//a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		if (/\/article\//.test(href)) {
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
		}
	}
	return found ? items : false;
}

function postProcess(item, doc) {
	// sanitize page number ranges
	if (item.pages) {
		let pages = item.pages.trim();
		if (pages) {
			let matched = pages.match(/^([0-9]+-[0-9]+)/);
			if (matched)
				item.pages = matched[1];
			}
		}
	if (typeof item.abstractNote == 'undefined') {
		item.abstractNote = ZU.xpathText(doc, '//p[@class="first"]');
			}
	if (item.issue[0] == '0') {
		item.issue = item.issue.substring(1, item.issue.length);
	}
	if (item.abstractNote == "No Abstract available for this article.") {
		item.abstractNote = "";
	}
	let panels = ZU.xpath(doc, '//div[@class="panel-body"]');
	for (let i = 0; i < panels.length; i++) {
		Z.debug(i);
		if (item.abstractNote) {
			if (panels[i].textContent.match(item.abstractNote)) {
				item.abstractNote = item.abstractNote + '\\n4207 ' + panels[i].textContent.substring(item.abstractNote.length, panels[i].length);
				
			}
		}
		let links = ZU.xpath(panels[i], './a');
		for (let i = 0; i < links.length; i++)
		{
			if (links[i].href.match('%5Bkeywords%5D')) {
				item.tags.push(links[i].textContent);
			}
		}
	}
	if (ZU.xpathText(doc, '//h2[@class="subtitle"]')) {
		item.title = item.title + ': ' + ZU.xpathText(doc, '//h2[@class="subtitle"]').trim();
	}
	item.complete();
	}

function invokeEmbeddedMetadataTranslator(doc) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(i, doc);
	});
	translator.translate();
}

function scrape(doc, url) {
	let content = doc.contentDocument;
	invokeEmbeddedMetadataTranslator(doc);
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else
		scrape(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://elibrary.narr.digital/journal/vvaa/5/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://elibrary.narr.digital/article/10.2357/VvAa-2020-0004",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Wie lehrende und lernende Historikerinnen und Historiker zusammenarbeiten: Die Tutorien im Rahmen des Integrierten Proseminars am Historischen Institut der Ruhr-Universität Bochum",
				"creators": [
					{
						"firstName": "Sebastian",
						"lastName": "Döpp",
						"creatorType": "author"
					},
					{
						"firstName": "Meret",
						"lastName": "Strothmann",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "O’Neill",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.2357/VvAa-2020-0004",
				"ISSN": "2366-0597",
				"abstractNote": "Erfahrungen auszutauschen bedeutet Einblicke in die eigene Lehrpraxis zu geben und die eigenen Lehrmethoden zur Diskussion zu stellen. So versteht sich der Text als Beitrag zum lebendigen Dialog zwischen Lehrenden und Lernenden am Historischen Institut der Ruhr-Universität Bochum. Um den Studienanfängern des Faches Orientierung zu geben, ist das erste Studienjahr durch die Integrierten Proseminare sehr strukturiert und speziell organisiert. In zwei Semestern lernen die Studierenden Methoden, Arbeitsweisen und erste Inhalte der drei Epochen Alte Geschichte, Mittelalter und Neuzeit kennen. Maßgeblich unterstützt werden sie dabei von den begleitenden Tutorien, in denen gezielt Inhalte und Propädeutik der einzelnen Präsenzsitzungen vertieft werden. Das erfordert ein hohes Maß an Koordination und Kooperation von Tutorinnen und Tutoren und Dozierenden. Es ist das Ziel des Beitrags aufzuzeigen, wie im aktiven Miteinander die angemessene Vermittlung sichergestellt und ein Lernklima gewährleistet werden kann, das produktiv ist und durch Kommunikation flexibel gestaltet werden kann.",
				"issue": "1",
				"journalAbbreviation": "vvaa",
				"language": "de",
				"libraryCatalog": "elibrary.narr.digital",
				"pages": "74-107",
				"publicationTitle": "Forum Exegese und Hochschuldidaktik: Verstehen von Anfang an (VvAa)",
				"shortTitle": "Wie lehrende und lernende Historikerinnen und Historiker zusammenarbeiten",
				"url": "https://elibrary.narr.digital/article/10.2357/VvAa-2020-0004",
				"volume": "5",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
