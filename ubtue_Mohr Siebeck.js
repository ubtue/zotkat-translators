{
	"translatorID": "30f0052d-e8fc-45ac-a1db-7a729f0da376",
	"label": "ubtue_Mohr Siebeck",
	"creator": "Madeesh Kannan",
	"target": "https?://www.mohrsiebeck.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-21 15:49:52"
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
	if (url.match(/\/arti((cle)|(kel))\//)) {
		return "journalArticle";
	} else if (url.match(/\/((journal)|(heft)|(issue))\//)) {
		return "multiple";
 	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.text-h6.font-serif.text-primary > a[href*="/artikel/"]');
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


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

function isOpenAccess(doc, item) {
	let openAccessElements = ZU.xpath(doc, "//div[@data-v-486ca2da and contains(text(), 'Open Access')]");
	if (openAccessElements && openAccessElements.length > 0) {
			item.notes.push("LF:");
	}
}

function isReview(item, element) {
	if (item.tags.includes("RezensionstagPica")) {
		return;
	}
	let reviewTitlesMatch = element.innerText.match(/rubrik:\s*(book reviews|new books|einzelbesprechungen|literatur|buchnotizen)\s*/i);
	if (reviewTitlesMatch) {
		item.tags.push("RezensionstagPica");
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		
		let elements = doc.querySelectorAll('div[data-astro-cid-u2ukveoy]');

		elements.forEach(element => {
			let volumeMatch = element.innerText.match(/Jahrgang\s(\d+)\s\(\d+\)/i);
			if (volumeMatch) {
				item.volume = volumeMatch[1];
			}
			
			let pagesMatch = element.innerText.match(/S.\s(\d+-\d+)/i);
			if (pagesMatch) {
				item.pages = pagesMatch[1];
			}
			
			isReview(item, element);
		});

		let journalTitle = doc.querySelector('div[data-astro-cid-u2ukveoy] > a[href*="/zeitschrift/"]');
		if (journalTitle) {
			let journalMatch = journalTitle.innerText.match(/([^\d]+)(\s+\(.+\))/i);
			if (journalMatch[1].trim() !== item.publicationTitle) {
				item.title = item.title + ": " + item.publicationTitle;
				item.publicationTitle = journalMatch[1];
			}
		}

		if (item.abstractNote) {
			item.abstractNote = ZU.cleanTags(item.abstractNote);
			item.abstractNote = item.abstractNote.replace(/\n/g, '');
		}

		isOpenAccess(doc, item);


		item.complete();
	});

	let em = await translator.getTranslatorObject();

	await em.doWeb(doc, url);
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
				"libraryCatalog": "ubtue_Mohr Siebeck",
				"pages": "195-206",
				"publicationTitle": "Philosophische Rundschau (PhR)",
				"shortTitle": "Machtkonstellationen",
				"url": "https://doi.org/10.1628/003181516X14791276269803",
				"volume": "63",
				"attachments": [
					{
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
		"url": "https://www.mohrsiebeck.com/artikel/salvaging-the-scriptures-for-us-101628ec-2020-0033?no_cache=1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Salvaging the Scriptures for Us: The Authoritative Scriptures and Social Identity in the Epistle of Barnabas",
				"creators": [
					{
						"firstName": "Katja",
						"lastName": "Kujanpää"
					}
				],
				"date": "2020",
				"DOI": "10.1628/ec-2020-0033",
				"ISSN": "1868-7032",
				"abstractNote": "Dieser Artikel betrachtet die Beziehungen zwischen Identitätsbildung und Autorität der jüdischen Schrift im Barnabasbrief. Mit Hilfe sozialpsychologischer Theorien unter dem Sammelbegriff des social identity approach wird beleuchtet, wie der Verfasser des Briefes die Identität seiner Leserschaft in eine solche Richtung gestaltet, dass alles Jüdische unvereinbar mit ihrer »wahren« Identität erscheint. Er versucht, das jüdische Schriftverständnis (und damit die jüdische Lebensweise) als zutiefst fehlerhaft darzustellen, während er Christen als die Erben aller Verheißungen der Schrift bezeichnet. Der Artikel untersucht die verschiedenen Strategien, die der Barnabasbrief bei der Schriftauslegung verwendet, um gleichzeitig zwei Ziele zu erreichen: die Schrift zu »dejudaisieren« und ihre Autorität und Relevanz für die Leserschaft zu bewahren.",
				"issue": "4",
				"language": "de",
				"libraryCatalog": "ubtue_Mohr Siebeck",
				"pages": "475-495",
				"publicationTitle": "Early Christianity (EC)",
				"shortTitle": "Salvaging the Scriptures for Us",
				"url": "https://doi.org/10.1628/ec-2020-0033",
				"volume": "11",
				"attachments": [
					{
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Apostolic Fathers"
					},
					{
						"tag": "Epistle of Barnabas"
					},
					{
						"tag": "Social Identity"
					},
					{
						"tag": "scriptural argumentation"
					},
					{
						"tag": "textual authority"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.mohrsiebeck.com/artikel/der-rechtliche-rahmen-einer-kirche-im-transformationsprozess-101628zevkr-2020-0031?no_cache=1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Der rechtliche Rahmen einer Kirche im Transformationsprozess: Suchbewegungen und Ideen",
				"creators": [
					{
						"firstName": "Rainer",
						"lastName": "Mainusch"
					}
				],
				"date": "2020",
				"DOI": "10.1628/zevkr-2020-0031",
				"ISSN": "0044-2690",
				"issue": "4",
				"language": "de",
				"libraryCatalog": "ubtue_Mohr Siebeck",
				"pages": "349-406",
				"publicationTitle": "Zeitschrift für evangelisches Kirchenrecht (ZevKR)",
				"shortTitle": "Der rechtliche Rahmen einer Kirche im Transformationsprozess",
				"url": "https://doi.org/10.1628/zevkr-2020-0031",
				"volume": "65",
				"attachments": [
					{
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
		"url": "https://www.mohrsiebeck.com/heft/hebrew-bible-and-ancient-israel-4-2022-2192-2276?no_cache=1",
		"items": "multiple"
	}
]
/** END TEST CASES **/
