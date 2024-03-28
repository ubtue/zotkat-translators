{
	"translatorID": "c3f1045b-2fad-405a-80cb-ddc3de2881ee",
	"label": "ubtue_Allied_Academies",
	"creator": "Mara Spieß",
	"target": "https://www.alliedacademies.org",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-28 16:05:28"
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
	if (url.includes('/articles/')) {
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
	var rows = doc.querySelectorAll('.card-title');
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
		if (item.abstractNote.length <= 20)
		    item.abstractNote = "";
		item.url = "";
		if (item.ISSN = "Open Access") {
			item.tags.push('LF:');
			item.ISSN = "";
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
		"url": "https://www.alliedacademies.org/articles/neuroplasticity-and-drugseeking-behavior-mechanisms-and-therapeutic-targets-25450.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Neuroplasticity and drug-seeking behavior: Mechanisms and therapeutic targets.",
				"creators": [
					{
						"firstName": "Christopher",
						"lastName": "Kalivas",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.35841/aara-6.3.146",
				"abstractNote": "Drug addiction is a complex and chronic disorder characterized by compulsive drug-seeking behavior despite adverse consequences. The persistence of drug-seeking behavior is believed to arise from maladaptive changes in the brain's neural circuitry, particularly in regions involved in reward, motivation, and decision-making. Neuroplasticity, the brain's ability to reorganize and modify its structure and function in response to experience, plays a pivotal role in the development and maintenance of drug addiction.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.alliedacademies.org",
				"publicationTitle": "Addiction & Criminology",
				"shortTitle": "Neuroplasticity and drug-seeking behavior",
				"volume": "6",
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
						"tag": "Drug-seeking behaviour"
					},
					{
						"tag": "LF:"
					},
					{
						"tag": "Mechanisms"
					},
					{
						"tag": "Neuroplasticity"
					},
					{
						"tag": "Therapeutic targets."
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
