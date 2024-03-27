{
	"translatorID": "b38357c5-9b3b-4254-8643-829727fd06ea",
	"label": "ubtue_Harrassowitz_Deutsches_Archiv_fuer_Erforschung_des_Mittelalters",
	"creator": "Mara Spieß",
	"target": "https://mgh-da.harrassowitz-library.com/(issue|article)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-27 15:48:56"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 YOUR_NAME <- TODO

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
	var rows = doc.querySelectorAll('.title');
	for (let row of rows) {
		let anchor = row.querySelector('a');
		let href = anchor ? anchor.getAttribute('href') : null;
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
		item.title = item.title.replace(/<\/?(?:[^>]+)>/g, '');
		if (item.title.match(/^\d+[.]\s*/))
			 item.tags.push('RezensionstagPica');
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://mgh-da.harrassowitz-library.com/article/MGH-DA/2023/1/3",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zur Entstehung der „Kapitulariensammlung“ im Liber legum des Lupus und zur Vielfalt der „Kapitularien“ Karls des Großen",
				"creators": [
					{
						"firstName": "Takuro",
						"lastName": "Tsuda",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.13173/MGH-DA.79.1.001",
				"ISSN": "21943842",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "mgh-da.harrassowitz-library.com",
				"pages": "1-71",
				"publicationTitle": "Deutsches Archiv für Erforschung des Mittelalters",
				"url": "https://mgh-da.harrassowitz-library.com/article/MGH-DA/2023/1/3",
				"volume": "79",
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
