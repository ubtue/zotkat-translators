{
	"translatorID": "b2fcf7d9-e023-412e-a2bc-f06d6275da24",
	"label": "Brill",
	"creator": "Madeesh Kannan",
	"target": "^https?://brill.com/view/journals/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-09-25 16:23:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

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
	if (url.match(/article-.+\.xml$/)) {
		return "journalArticle";
	} else if (url.match(/issue-\d+(-\d+)?\.xml$/)) {
		return "multiple";
 	}
}

function getSearchResults(doc) {
	let items = {};
    let found = false;
    let links = ZU.xpath(doc, '//a[contains(@class, "c-Typography--title")]');
	let text = ZU.xpath(doc, '//a[contains(@class, "c-Typography--title")]/span')
	for (let i = 0; i < links.length; ++i) {
		let href = links[i].href;
		let title = ZU.trimInternal(text[i].textContent);
        if (!href || !title) continue;
        if (!href.match(/article-.+\.xml$/))
            continue;

		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	if (!item.abstractNote) {
        item.abstractNote = ZU.xpath(doc, '//section[@class="abstract"]//p');
        if (item.abstractNote && item.abstractNote.length > 0)
            item.abstractNote = item.abstractNote[0].textContent.trim();
    }
	if (item.abstractNote === undefined) item.abstractNote = '';
	// i set 100 as limit of string length, because usually a string of a pseudoabstract has less then 150 character e.g. "abstractNote": "\"Die Vernünftigkeit des jüdischen Dogmas\" published on 05 Sep 2020 by Brill."
	if (item.abstractNote.length < 100) delete item.abstractNote;	
	item.tags = ZU.xpath(doc, '//dd[contains(@class, "keywords")]//a');
	if (item.tags)
		item.tags = item.tags.map(i => i.textContent.trim());
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
		i.complete();
	});
	translator.translate();
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
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else
        invokeEmbeddedMetadataTranslator(doc, url);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.mohrsiebeck.com/artikel/machtkonstellationen-jenseits-von-realismus-und-idealismus-101628003181516x14791276269803",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Machtkonstellationen: Jenseits von Realismus und Idealismus",
				"creators": [
					{
						"firstName": "Georg",
						"lastName": "Zenkert"
					}
				],
				"date": "2016",
				"DOI": "10.1628/003181516X14791276269803",
				"ISSN": "0031-8159",
				"abstractNote": "Claudia Horst: Marc Aurel. Philosophie und politische Macht zur Zeit der Zweiten Sophistik. Franz Steiner Verlag. Stuttgart 2013. 232 S. Herfried Münkler/Rüdiger Voigt/Ralf Walkenhaus (Hg.): Demaskierung der Macht. Niccolò Machiavellis Staats- und Politikverständnis. Nomos. 2. Auflage. Baden-Baden 2013. 224 S. Dietrich Schotte: Die Entmachtung Gottes durch den Leviathan. Thomas Hobbes über die Religion. Frommann-Holzboog. Stuttgart-Bad Cannstatt 2013. 360 S.",
				"issue": "3",
				"language": "de",
				"libraryCatalog": "Mohr Siebeck",
				"pages": "195-206",
				"publicationTitle": "Philosophische Rundschau (PhR)",
				"shortTitle": "Machtkonstellationen",
				"volume": "63",
				"attachments": [
					{}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/zrgg/72/4/article-p371_2.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Die Vernünftigkeit des jüdischen Dogmas: Samuel Holdheims Kritik an Mendelssohns Religionsphilosophie",
				"creators": [
					{
						"firstName": "George Y.",
						"lastName": "Kohler",
						"creatorType": "author"
					}
				],
				"date": "2020/09/05",
				"DOI": "10.1163/15700739-07204002",
				"ISSN": "0044-3441, 1570-0739",
				"issue": "4",
				"language": "de",
				"libraryCatalog": "brill.com",
				"pages": "371-389",
				"publicationTitle": "Zeitschrift für Religions- und Geistesgeschichte",
				"shortTitle": "Die Vernünftigkeit des jüdischen Dogmas",
				"url": "https://brill.com/view/journals/zrgg/72/4/article-p371_2.xml",
				"volume": "72",
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
		"url": "https://brill.com/view/journals/zrgg/72/4/article-p371_2.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Die Vernünftigkeit des jüdischen Dogmas: Samuel Holdheims Kritik an Mendelssohns Religionsphilosophie",
				"creators": [
					{
						"firstName": "George Y.",
						"lastName": "Kohler",
						"creatorType": "author"
					}
				],
				"date": "2020/09/05",
				"DOI": "10.1163/15700739-07204002",
				"ISSN": "0044-3441, 1570-0739",
				"issue": "4",
				"language": "de",
				"libraryCatalog": "brill.com",
				"pages": "371-389",
				"publicationTitle": "Zeitschrift für Religions- und Geistesgeschichte",
				"shortTitle": "Die Vernünftigkeit des jüdischen Dogmas",
				"url": "https://brill.com/view/journals/zrgg/72/4/article-p371_2.xml",
				"volume": "72",
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
