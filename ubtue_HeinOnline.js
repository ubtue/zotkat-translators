{
	"translatorID": "b85ba0c3-58da-4791-a836-e35f37d9bfb8",
	"label": "ubtue_HeinOnline",
	"creator": "Mara Spieß",
	"target": "https://access.heinonline.com/HOL/[Contents|Page]",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-02 13:52:05"
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


function detectWeb(doc) {
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.atocpage');
	for (let row of rows) {
		let hrefElement = row.querySelector('a.contents_page[href*="Page?"]');
		if (!hrefElement) continue;
		let href = hrefElement.href;

		let titleRow = row.cloneNode(true);
		titleRow.querySelector('div.page_line')?.remove();
		titleRow.querySelectorAll('a.author-link').forEach(authorLink => authorLink.remove());
		let title = ZU.trimInternal(titleRow.textContent).trim();

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
			let risID = url.match(/bumedcal(\d+&id=\d+)/i)?.[1];
			let risURL = `https://access.heinonline.com/HOL/CitationFile?kind=ris&handle=hein.journals/bumedcal${risID}&div=9&base=js`;

			let risText = await requestText(risURL);
			let translator = Zotero.loadTranslator('import');
			translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
			translator.setString(risText);
			translator.setHandler('itemDone', (_obj, item) => {
				item.ISSN = '2372-2509';

				if (item.title.match(/(book)?\s+reviews$/i)) {
					item.title = item.title.replace(/(book)?\s+reviews$/i, '');
					item.tags.push('RezensionstagPica');
				}

				if (item.pages) {
					item.pages = item.pages.toUpperCase();
				}

				if (item.date && item.date.match(/\d+-\d+/)) {
					item.date = item.date.replace('-', '/');
				}

				item.complete();
			});

			translator.translate();
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
