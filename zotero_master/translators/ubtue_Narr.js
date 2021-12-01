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
	"lastUpdated": "2021-11-16 13:34:45"
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
	if (ZU.xpathText(doc, '//h2[@class="subtitle"]' !== "")) {
		item.title = item.title + ': ' + ZU.xpathText(doc, '//h2[@class="subtitle"]').trim();
	}
	//review tag
	if (item.title.match(/(?:ISBN(?:-13)?:?\ )?(?=[0-9]{13}$|(?=(?:[0-9]+[-\ ]){4})[-\ 0-9]{17})97[89][-\ ]?[0-9]{1,5}[-\ ]?[0-9]+[-\ ]?[0-9]+[-\ ]?[0-9]/g)) item.tags.push("Book Review");
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
				"title": "How Teaching and Learning Historians Work Together",
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
				"abstractNote": "Exchanging experiences means giving insights into one&rsquo;s own teaching practice and putting one&rsquo;s own teaching methods up for discussion. Thus the text is understood as a contribution to the lively dialogue between teachers and students at the Department of History at the Ruhr-University Bochum. In order to give some orientation aid to the first-year students of the subject, the first year of study is very structured and specially organised by the Integrated Preseminars. In two semesters, students learn methods, working practices and initial content of the three epochs of Ancient History, the Middle Ages and Modern Times. They are significantly supported by the accompanying tutorials, in which the contents and propaedeutics of the individual classroom sessions are specifically deepened. This requires a high degree of coordination and cooperation between tutors and lecturers. The aim of the paper is to show how appropriate teaching can be ensured in active cooperation and how a learning climate can be created that is productive and can be made flexible through communication.",
				"issue": "1",
				"journalAbbreviation": "vvaa",
				"language": "de",
				"libraryCatalog": "elibrary.narr.digital",
				"pages": "74-107",
				"publicationTitle": "Forum Exegese und Hochschuldidaktik: Verstehen von Anfang an (VvAa)",
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
				"tags": [
					{
						"tag": "Excursion"
					},
					{
						"tag": "Introductory course"
					},
					{
						"tag": "Propaedutics"
					},
					{
						"tag": "Student’s participation"
					},
					{
						"tag": "first year’s students"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://elibrary.narr.digital/article/10.24053/VvAa-2020-0020",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Interview mit ... Wolfgang Zwickel",
				"creators": [
					{
						"firstName": "Thomas",
						"lastName": "Wagner",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.24053/VvAa-2020-0020",
				"ISSN": "2366-0597",
				"issue": "2",
				"journalAbbreviation": "vvaa",
				"language": "de",
				"libraryCatalog": "elibrary.narr.digital",
				"pages": "170-176",
				"publicationTitle": "Forum Exegese und Hochschuldidaktik: Verstehen von Anfang an (VvAa)",
				"url": "https://elibrary.narr.digital/article/10.24053/VvAa-2020-0020",
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
	},
	{
		"type": "web",
		"url": "https://elibrary.narr.digital/article/10.24053/VvAa-2020-0018",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Silvia Schroer: Die Ikonographie Palästinas/Israels und der Alte Orient. Eine Religionsgeschichte in Bildern (IPIAO), Band 1: Vom ausgehenden Mesolithikum bis zur Frühbronzezeit, Band 2: Die Mittelbronzezeit, Band 3: Die Spätbronzezeit, Band 4: Die Eisenzeit bis zum Beginn der achämenidischen Herrschaft, Basel 2018, 2156 Seiten, ISBN 978-3-7965-3880-3",
				"creators": [
					{
						"firstName": "Thomas",
						"lastName": "Wagner",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.24053/VvAa-2020-0018",
				"ISSN": "2366-0597",
				"issue": "2",
				"journalAbbreviation": "vvaa",
				"language": "de",
				"libraryCatalog": "elibrary.narr.digital",
				"pages": "155-162",
				"publicationTitle": "Forum Exegese und Hochschuldidaktik: Verstehen von Anfang an (VvAa)",
				"shortTitle": "Silvia Schroer",
				"url": "https://elibrary.narr.digital/article/10.24053/VvAa-2020-0018",
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
				"tags": [
					{
						"tag": "Ancient Palestine/Israel"
					},
					{
						"tag": "Book Review"
					},
					{
						"tag": "iconography"
					},
					{
						"tag": "seals"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
