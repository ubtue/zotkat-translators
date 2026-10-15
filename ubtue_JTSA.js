{
	"translatorID": "9a26783f-6d6d-4cb0-bbcd-ea79501a0165",
	"label": "ubtue_JTSA",
	"creator": "Mara Spieß",
	"target": "https://janes.jtsa.edu/volumes/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-15 15:55:47"
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
	if (/\/volumes\/\d+\//.test(url) && getSearchResults(doc, true)) {
	return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('li.toc-item a.toc-title[href*="/volumes/"]');
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
			let item = new Zotero.Item("journalArticle");

			item.ISSN = "0010-2016";
			item.url = url;

			let date = doc.querySelector('p.issue-head-year');
			if (date) item.date = date.textContent;

			let volume = doc.querySelector('h1.issue-head-title');
			if (volume) {
				let volumeNumber = volume.textContent?.match(/volume\s*(\d+)/i);
				if (volumeNumber) item.volume = volumeNumber[1];
			}

			let path = new URL(url).pathname;
			let entry = doc.querySelector('a.toc-title[href*="' + path + '"]');

			if (entry) {
				item.title = ZU.trimInternal(entry.textContent);

				let authorsEntry = entry.closest('div.toc-item-text');
				if (authorsEntry) {
					let authorNames = authorsEntry.querySelector('p.toc-author');
					let authors = authorNames?.textContent?.split(',');
					if (authors) {
						authors.forEach(author => {
						item.creators.push(ZU.cleanAuthor(author, 'author', false));
						})
					}
				}
			} 

			item.complete();
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://janes.jtsa.edu/volumes/38/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
