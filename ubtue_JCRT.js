{
	"translatorID": "2cc4e5d9-1f6d-4cf4-9a80-cf099102b5db",
	"label": "ubtue_JCRT",
	"creator": "Mara Spieß",
	"target": "https://jcrt.org/archives/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-02 10:38:04"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2026 Universitätsbibliothek Tübingen

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
	if (url.match(/\/\d+\.\d+\/\w+/)) {
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
	var rows = doc.querySelectorAll('div.article-item a[href*="/archives/"]');
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

		let breadcrumbs = doc.querySelectorAll('nav.jcrt-breadcrumb li.breadcrumb-item');
		breadcrumbs.forEach((breadcrumb) => {
			if (breadcrumb?.textContent.includes('Article')) {
				let articleID = breadcrumb?.textContent.match(/article\sno\.\s(\d+)/i);
				if (articleID) {
					item.notes.push('artikelID:' + articleID[1]);
				}
			}
		})
		
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://jcrt.org/archives/25.1/derrico/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Federal Anti-indian Law: Why a Challenge to “Christian Discovery” Creates a Metaphysical Crisis for the US",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "d'Errico",
						"creatorType": "author"
					}
				],
				"date": "2026-04-16",
				"ISSN": "1530-5228",
				"abstractNote": "Peter d'Errico argues that U.S. anti-Indian law rests on Christian Discovery, and that challenging it exposes a metaphysical crisis in U.S. law today.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "jcrt.org",
				"pages": "1-15",
				"publicationTitle": "The Journal for Cultural and Religious Theory",
				"rights": "Copyright © held by the author(s). Published in the Journal for Cultural and Religious Theory. https://jcrt.org/copyright/",
				"shortTitle": "Federal Anti-indian Law",
				"url": "https://files.jcrt.org/archives/25.1/derrico.pdf",
				"volume": "25",
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
						"tag": "anti indian law"
					},
					{
						"tag": "christian discovery"
					},
					{
						"tag": "colonial domination"
					},
					{
						"tag": "colonization"
					},
					{
						"tag": "indigenous peoples"
					},
					{
						"tag": "indigenous rights"
					},
					{
						"tag": "indigenous sovereignty"
					},
					{
						"tag": "legal formalism"
					},
					{
						"tag": "racial equality"
					},
					{
						"tag": "territorial authority"
					},
					{
						"tag": "us property law"
					}
				],
				"notes": [
					"artikelID:01"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
