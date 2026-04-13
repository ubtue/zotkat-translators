{
	"translatorID": "f0447d97-7566-4ec6-8150-6aa6c6652096",
	"label": "ubtue_Brepols_new",
	"creator": "Mara Spieß",
	"target": "https://www.brepolsonline.net/content/journals/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-04-10 10:21:38"
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
	if (url.includes('/content/journals/10./')) {
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
	var rows = doc.querySelectorAll('li.articleInToc span.articleTitle');
	for (let row of rows) {
		let href = row.querySelector('a[href*="/journals/10."]');
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

		// Rezensionskennzeichnung
		let articleType = doc.querySelector('span.document_type');
		if (articleType && articleType.innerText.match(/book\s+review/i)) {
			item.tags.push('RezensionstagPica');
		}

		// Abstractbereinigung
		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/^abstract/i, '');
		}

		// Open Access Artikel
		let openAccessIcon = doc.querySelector('h1.h2 abbr.access_icon_oa');
		if (openAccessIcon) {
			item.notes.push('LF:');
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
