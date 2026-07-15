{
	"translatorID": "4ccf849b-f9e9-4cec-9bae-7c10aa4dea53",
	"label": "ubtue_University of Toronto Press",
	"creator": "Mara Spieß",
	"target": "^https?://(www\\.)?utp(journals|publishing).com/(doi|toc)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-15 15:48:41"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Universitätsbibliothek Tübingen

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTIBILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.includes('/doi/')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('h2.issue-item__title > a[href*="/doi/"]');
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
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;

		for (let articleURL of Object.keys(items)) {
			let articleDoc = await requestDocument(articleURL);
			await scrape(articleDoc, articleURL);
		}
	}
	else {
		await scrape(doc, url);
	}
}


async function scrape(doc, url = doc.location.href) {
	let DOI = url.match(/\/doi\/(?:abs\/)?(.+)$/);
	if (!DOI) {
		Z.debug("No DOI found");
		return;
	}
	DOI = DOI[1];

	// RIS data via crossref API https://www.crossref.org/documentation/retrieve-metadata/content-negotiation/
	let risURL = `https://api.crossref.org/v1/works/${encodeURIComponent(DOI)}/transform`;
	let risText = await requestText(risURL, {
		headers: {
			Accept: 'application/x-research-info-systems'
		}
	});

	let translator = Zotero.loadTranslator('import');
	// RIS translator
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
	translator.setString(risText);
	translator.setHandler('itemDone', (_obj, item) => {

		if (item.title?.match(/book reviews|recensions de livres/i)) {
			item.tags.push("RezensionstagPica");
		}

		item.url = item.url.replace(/https?:\/\/dx\./, 'https://');
		
		item.complete();
	});

	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://utppublishing.com/doi/10.3138/tjt.1.2.286",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Book Reviews",
				"creators": [
					{
						"lastName": "Kloppenborg",
						"firstName": "John",
						"creatorType": "author"
					},
					{
						"lastName": "Kloppenborg",
						"firstName": "John",
						"creatorType": "author"
					},
					{
						"lastName": "Richardson",
						"firstName": "Peter",
						"creatorType": "author"
					},
					{
						"lastName": "Steinhauser",
						"firstName": "Michael",
						"creatorType": "author"
					},
					{
						"lastName": "LaPorte",
						"firstName": "Jean-Marc",
						"creatorType": "author"
					},
					{
						"lastName": "Hick",
						"firstName": "John",
						"creatorType": "author"
					},
					{
						"lastName": "Farris",
						"firstName": "James",
						"creatorType": "author"
					},
					{
						"lastName": "Demson",
						"firstName": "David",
						"creatorType": "author"
					}
				],
				"date": "September 1, 1985",
				"DOI": "10.3138/tjt.1.2.286",
				"ISSN": "0826-9831",
				"issue": "2",
				"libraryCatalog": "ubtue_University of Toronto Press",
				"pages": "286-300",
				"publicationTitle": "Toronto Journal of Theology",
				"url": "https://doi.org/10.3138/tjt.1.2.286",
				"volume": "1",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://utppublishing.com/doi/10.3138/tjt.1.2.227",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Moral Woman and Immoral Society: Schleiermacher on Female and Male",
				"creators": [
					{
						"lastName": "Nicol",
						"firstName": "Iain",
						"creatorType": "author"
					}
				],
				"date": "September 1, 1985",
				"DOI": "10.3138/tjt.1.2.227",
				"ISSN": "0826-9831",
				"issue": "2",
				"libraryCatalog": "ubtue_University of Toronto Press",
				"pages": "227-241",
				"publicationTitle": "Toronto Journal of Theology",
				"shortTitle": "Moral Woman and Immoral Society",
				"url": "https://doi.org/10.3138/tjt.1.2.227",
				"volume": "1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
