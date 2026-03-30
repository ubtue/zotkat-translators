{
	"translatorID": "59bc3392-2b7a-42f5-8cc8-2a749f9a55a2",
	"label": "ubtue_Inlibra",
	"creator": "Mara Spieß",
	"target": "https://www.inlibra.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-03-30 10:32:24"
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
	if (url.includes('?page=')) {
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
	// Target buttons with data-submit attributes containing base64 encoded URLs
	var rows = doc.querySelectorAll('button[data-submit].search-result-main-link');
	for (let row of rows) {
		// Decode the base64 encoded URL path
		let encodedPath = row.getAttribute('data-submit');
		if (!encodedPath) continue;
		
		// Decode base64 to get the path like: /de/document/view/pdf/uuid/...?page=1&toc=...
		let decodedPath = atob(encodedPath);
		let href = 'https://www.inlibra.com' + decodedPath;
		
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

// ISSN mapping for journals (case-insensitive lookup)
let JOURNAL_ISSN_MAP = {
	"communicatio socialis (comsoc)": "2198-3852",
	"communicatio socialis": "2198-3852",
	"recht & psychiatrie": "2942-4887",
	"concilium": "2943-0054"
};

// Create lowercase mapping for case-insensitive lookup
let JOURNAL_ISSN_MAP_LOWER = {};
for (let title in JOURNAL_ISSN_MAP) {
	JOURNAL_ISSN_MAP_LOWER[title.toLowerCase()] = JOURNAL_ISSN_MAP[title];
}

async function scrape(doc, url = doc.location.href) {
	let risURL = url.replace('document/view/pdf', 'citation/ris').replace(/\?page=.*/, '');
	let risText = await requestText(risURL);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(risText);
	translator.setHandler('itemDone', (_obj, item) => {

		// Add ISSN lookup based on publication title
		if (item.publicationTitle) {
			let lowerTitle = item.publicationTitle.toLowerCase();
			let issn = JOURNAL_ISSN_MAP_LOWER[lowerTitle];
			if (issn) {
				item.ISSN = issn;
			}
		}

		// clean authors (trailing commas)
		if (item.creators) {
			item.creators.forEach((creator) => {
				if (creator && typeof creator === 'object') {
					if (creator.firstName) {
						creator.firstName = creator.firstName.replace(/,$/, '').trim();
					}
					if (creator.lastName) {
						creator.lastName = creator.lastName.replace(/,$/, '').trim();
					}
				}
			});
		}

		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.inlibra.com/de/document/view/pdf/uuid/3087c118-7d7d-3328-a5d1-743ccfecfac4?page=1&toc=5857297",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Demokratie in der Krise: Gesellschaften, Kirche und Theologie",
				"creators": [
					{
						"lastName": "Schickendantz",
						"firstName": "Carlos",
						"creatorType": "author"
					},
					{
						"lastName": "Ferracci",
						"firstName": "Luca",
						"creatorType": "author"
					},
					{
						"lastName": "Hagedorn",
						"firstName": "Jonas",
						"creatorType": "author"
					},
					{
						"lastName": "Lado",
						"firstName": "Ludovic",
						"creatorType": "author"
					},
					{
						"lastName": "Wood",
						"firstName": "Richard",
						"creatorType": "author"
					}
				],
				"date": "2026",
				"DOI": "10.5771/0588-9804-2026-1-5",
				"ISSN": "2943-0054",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "ubtue_Inlibra",
				"pages": "5-8",
				"publicationTitle": "Concilium",
				"shortTitle": "Demokratie in der Krise",
				"url": "https://doi.org/10.5771/0588-9804-2026-1-5",
				"volume": "62",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.inlibra.com/de/document/view/pdf/uuid/de52f85c-87e5-317f-a517-09c7ec9e9423?page=1&toc=4570347",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "»Euthanasie«-Verbrechen und Rechtsprechung Die Verstrickung der Justiz in die NS-Krankenmorde",
				"creators": [
					{
						"lastName": "Harms",
						"firstName": "Ingo",
						"creatorType": "author"
					}
				],
				"date": "2025",
				"DOI": "10.1486/RP-2025-3_142",
				"ISSN": "2942-4887",
				"issue": "3",
				"language": "de",
				"libraryCatalog": "ubtue_Inlibra",
				"pages": "142-149",
				"publicationTitle": "Recht & Psychiatrie",
				"url": "https://doi.org/10.1486/RP-2025-3_142",
				"volume": "43",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.inlibra.com/de/document/view/pdf/uuid/a027a609-a8fb-35d4-87ed-2e6bbfc33adc?page=1&toc=4691208",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Die Ethik der Lücke. Alter, Geschlecht und Sichtbarkeit in der Filmproduktion",
				"creators": [
					{
						"lastName": "Radziwill",
						"firstName": "Sophie",
						"creatorType": "author"
					},
					{
						"lastName": "Stüwe",
						"firstName": "Julia",
						"creatorType": "author"
					}
				],
				"date": "2025",
				"DOI": "10.5771/0010-3497-2025-4-499",
				"ISSN": "2198-3852",
				"issue": "4",
				"language": "de",
				"libraryCatalog": "ubtue_Inlibra",
				"pages": "499-510",
				"publicationTitle": "Communicatio Socialis (ComSoc)",
				"url": "https://doi.org/10.5771/0010-3497-2025-4-499",
				"volume": "58",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
