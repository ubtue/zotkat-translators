{
	"translatorID": "37bee64f-28b2-47fa-89bd-4fc861dda488",
	"label": "ubtue_Journal_Scriptural_Reasoning",
	"creator": "Mara Spieß",
	"target": "https://digitalcommons.hamline.edu/jsr",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-29 13:23:09"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2025 Universitätsbibliothek Tübingen

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
	if (url.match(/jsr\/vol\d+\/iss\d+\/\d+/)) {
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
	var rows = doc.querySelectorAll('div.article-list a[href*="/jsr/vol"]');
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
		if (item.pages) {
			item.notes.push('artikelID:' + item.pages)
			delete item.pages;
		};
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://digitalcommons.hamline.edu/jsr/vol20/iss1/2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Genesis Rabbah as Scripture: Testing the Bounds of Theory, Text, and Event",
				"creators": [
					{
						"firstName": "Ryan",
						"lastName": "Quandt",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.61335/1551-3432.1002",
				"ISSN": "1551-3432",
				"abstractNote": "By Ryan Quandt, Published on 02/15/20",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "digitalcommons.hamline.edu",
				"publicationTitle": "Journal of Scriptural Reasoning",
				"shortTitle": "Genesis Rabbah as Scripture",
				"url": "https://digitalcommons.hamline.edu/jsr/vol20/iss1/2",
				"volume": "20",
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
				"notes": [
					"artikelID:2"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
