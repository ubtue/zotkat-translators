{
	"translatorID": "15ef2fd0-e7e4-41c2-9152-05c176169b1e",
	"label": "ubtue_Quaker_Studies",
	"creator": "Mara Spieß",
	"target": "https://quakerstudies.openlibhums.org/(issue|article)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-12-05 15:23:55"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Mara Spieß

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
	if (url.includes('/article/')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.col > a[href*="/article/"]');
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

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		pages = ZU.xpathText(doc, '//div[contains(@class, "section")]/h4[text()="Publication details"]/following-sibling::table[contains(@class, "sidebar-table")]//td');
		if (pages) {
			item.pages = pages.replace('–', '-').replace(/^([^-]+)-\1$/, '$1').trim();
		}
		if (item.abstractNote) {
		item.abstractNote = item.abstractNote.replace('This article was published open access under a CC BY licence: https://creativecommons.org/licences/by/4.0.', '');
		}
		if (item.title.match(/book review/i)) {
			item.tags.push('RezensionstagPica');
		}
		item.complete();
	});

	let em = await translator.getTranslatorObject();

	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://quakerstudies.openlibhums.org/article/id/15783/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "John Woolman and ‘The Meek Shall Inherit the Earth’",
				"creators": [
					{
						"firstName": "Mike",
						"lastName": "Heller",
						"creatorType": "author"
					},
					{
						"firstName": "Ron",
						"lastName": "Rembert",
						"creatorType": "author"
					}
				],
				"date": "2023-12-04",
				"DOI": "10.3828/quaker.2023.28.2.6",
				"ISSN": "2397-1770",
				"abstractNote": "Rufus Jones observed that John Woolman was ‘almost an incarnation of the beatitudes’. Mike Heller and Ron Rembert find this an intriguing doorway into understanding Woolman’s legacy. They have chosen to focus on one beatitude, ‘The meek shall inherit the earth’, because ‘meek’ and related terms appear often in Woolman’s writings. They find meekness an essential aspect of Woolman’s spiritual journey and his ministry, both of which were grounded in faith-filled, Christ-centred living. Meekness became for him a challenge and an aspiration as he sought to distinguish between authentic and feigned meekness, to be wary of the desire to please others, and to understand our spiritual versus materialistic inheritance. In addition to meekness regarding individuals, Woolman posed the possibility of it being a quality sensed within a Quaker meeting, which enabled the group to take on values and behaviours guiding their interaction and work in the world.\n.",
				"issue": "2",
				"language": "None",
				"libraryCatalog": "quakerstudies.openlibhums.org",
				"pages": "187-205",
				"publicationTitle": "Quaker Studies",
				"url": "https://quakerstudies.openlibhums.org/article/id/15783/",
				"volume": "28",
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
						"tag": "Woolman"
					},
					{
						"tag": "beatitude"
					},
					{
						"tag": "incarnation"
					},
					{
						"tag": "inheritance"
					},
					{
						"tag": "meek"
					},
					{
						"tag": "self-denial"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
