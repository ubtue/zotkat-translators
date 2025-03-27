{
	"translatorID": "475d0105-4631-444c-a4bd-366458100c80",
	"label": "ubtue_Beltz",
	"creator": "Mara Spieß",
	"target": "https://www.beltz.de/(.*)/zeitschriften/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-13 08:08:01"
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
	if (url.includes('/artikel/')) {
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
	var rows = doc.querySelectorAll('div.articleTitle > a[href*="/artikel/"]');
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

		let yearToVolumeMap = {
			2008: "40",
			2009: "41",
			2010: "42",
			2011: "43",
			2012: "44",
			2013: "45",
			2014: "46",
			2015: "47",
			2016: "48",
			2017: "49",
			2018: "50",
			2019: "51",
			2020: "52",
			2021: "53",
			2022: "54",
			2023: "55",
			2024: "56"
		};

		let citationElement = ZU.xpathText(doc, '//h5[contains(text(), "Zeitschrift")]/following-sibling::p[1]/a');
		if (citationElement) {
			let citationMatch = citationElement.match(/Ausgabe\s*(\d),\s*Jahr\s*(\d{4})\s*,\s*Seite\s*(\d+\s*-?\s*\d*)/i);
			if (citationMatch) {
				item.issue = citationMatch[1];
				item.pages = citationMatch[3].replace(/\s*(–|-)\s*/, '-');
				if (citationMatch[2]) {
					let year = parseInt(citationMatch[2], 10);
					item.volume = yearToVolumeMap[year];
				}
			}
		}

		let subtitle = doc.querySelector('h5.descsubtitle');
		item.title = subtitle && subtitle.textContent.length > 0 ? item.title + "$d" + subtitle.textContent : item.title;

		if (item.creators) {
			let creatorRegex = /beltz/i;
			item.creators = item.creators.filter(creator => !creatorRegex.test(creator.lastName));
		}

		if (doc.querySelector('div.panel-openaccess')) {
			item.notes.push("LF:");
		}
		
		if (item.title.match(/buchbesprechungen/i)) {
			item.tags.push("RezensionstagPica");
		}

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
