{
	"translatorID": "fdaaaf73-eed1-4aa8-bb44-c8b89d5d413e",
	"label": "ubtue_mitteilungen zur christlichen archäologie",
	"creator": "Timotheus Kim",
	"target": "https?://www.austriaca.at",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-01 14:18:36"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	
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
	if (url.includes('arp')) {
		return 'journalArticle'
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href^="/?arp"]:nth-child(2)');
	for (let row of rows) {
		let href = row.href;Z.debug(href)
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

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
	if (item.pages) {
	// if item.pages only spans one page (4-4), replace the range
	// with a single page number (4).
	item.pages = item.pages.trim().replace(/^([^-]+)-\1$/, '$1');
	}
		item.complete();
	});
	await translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.austriaca.at/9046-2inhalt",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.austriaca.at/?arp=0x003cfb28",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Un nuovo complesso episcopale nel Corno d’Africa di età tardo antica? Gli scavi del Pontificio Istituto di Archeologia Cristiana ad Adulis (Eritrea): 2018–2020",
				"creators": [
					{
						"firstName": "Gabriele",
						"lastName": "Castiglia",
						"creatorType": "author"
					},
					{
						"firstName": "Philippe",
						"lastName": "Pergola",
						"creatorType": "author"
					},
					{
						"firstName": "Serena",
						"lastName": "Massa",
						"creatorType": "author"
					},
					{
						"firstName": "Stefano",
						"lastName": "Bertoldi",
						"creatorType": "author"
					},
					{
						"firstName": "Marco",
						"lastName": "Ciliberti",
						"creatorType": "author"
					},
					{
						"firstName": "Omar",
						"lastName": "Larentis",
						"creatorType": "author"
					},
					{
						"firstName": "Božana",
						"lastName": "Maletić",
						"creatorType": "author"
					},
					{
						"firstName": "Chiara",
						"lastName": "Mandelli",
						"creatorType": "author"
					},
					{
						"firstName": "Matteo",
						"lastName": "Pola",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.1553/micha27s9",
				"ISSN": "1814-2036, 1025-6555",
				"abstractNote": "Since 2018 the Pontificio Istituto di Archeologia Cristiana (Rome) is in charge of the excavation of one of the churches of the Aksumite town of Adulis, in the Red Sea coastline, in present day Eritrea. The aim of this paper is to present the new archaeological data coming from the recent excavations in the so-called “Church of the British Museum”, discovered in 1868 by Captain Goodfellow. New excavations run from 2018 onwards have led to highlight the biggest church known so far in Adulis, probably the ecclesia episcopalis. It stands as a 30 meters long building, which follows the typical Aksumite architectural layout. Also, the great quantity of decorated marbles coming from the church are of great interest, revealing important contacts with Yemen and Byzantium, mostly in the 6th century. The new archaeological data will be contextualized in the wider scenario of the rise and establishment of early Christianity in the Aksumite kingdom.",
				"language": "de",
				"libraryCatalog": "www.austriaca.at",
				"pages": "9-58",
				"publicationTitle": "Mitteilungen zur Christlichen Archäologie",
				"rights": "Österreichische Akademie der Wissenschaften",
				"shortTitle": "Un nuovo complesso episcopale nel Corno d’Africa di età tardo antica?",
				"url": "https://austriaca.at?arp=0x003cfb28",
				"volume": "27",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "journals"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
