{
	"translatorID": "fd78d8d0-f651-4755-b172-1a24302dd243",
	"label": "ubtue_OeAW",
	"creator": "Mara Spieß",
	"target": "https://austriaca.at/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-02-27 14:23:51"
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
	if (url.includes('/?arp=')) {
		return 'journalArticle';
	}
	else if (url.includes('inhalt') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.jArticle > h4.jTitle > a[href*="/?arp="]');
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

function getOrcids(doc, item) {
	let authors = doc.querySelectorAll('ul.authors > span.author');
	authors.forEach(author => {
		let authorName = author.textContent.trim();
		let orcidElement = author.querySelector('a[href*="orcid.org"]');
		if (orcidElement) {
			let orcid = orcidElement.getAttribute('href').match(/\d{4}-\d{4}-\d{4}-\d{3}[0-9X]/i);
			if (orcid) {
				item.notes.push("orcid: " + orcid[0] + ' | ' + authorName + ' | ' + 'taken from website');
			}
		}
	})
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		getOrcids(doc, item);
		item.tags = [];
		if (item.title.match(/Rezensionen/)) {
			item.notes.push('LF:');
			item.tags.push('RezensionstagPica');
		}
		item.complete(); 
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'journalArticle';

	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
