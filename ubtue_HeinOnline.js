{
	"translatorID": "b85ba0c3-58da-4791-a836-e35f37d9bfb8",
	"label": "ubtue_HeinOnline",
	"creator": "Mara Spieß",
	"target": "https://access.heinonline.com/HOL/Contents",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-02 09:59:41"
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
			let item = new Zotero.Item("journalArticle");
			item.publicationTitle = "Bulletin of medieval canon law";
			item.ISSN = '2372-2509';
			item.url = url;

			let targetUrl = new URL(url, doc.location.href).href;

			let entry = Array.from(doc.querySelectorAll('div.atocpage')).find(row => {
				let pageLink = row.querySelector('a.contents_page');
				return pageLink
					&& (pageLink.href === targetUrl
						|| pageLink.getAttribute('href') === url);
			});

			getTitle(item, entry);
			getAuthors(item, entry);
			getPages(item, entry);
			getCitation(item, doc);
			
			item.complete();
		}
	}
}

function getTitle (item, entry) {
	let titleEntry = entry.cloneNode(true);

	titleEntry.querySelector('div.page_line')?.remove();
	titleEntry.querySelectorAll('a.author-link').forEach(authorLink => authorLink.remove());
	item.title = ZU.trimInternal(titleEntry.textContent).replace(/\s+/g, ' ').replace(/;$/, '').trim();

	if (item.title.match(/reviews$/i)) {
		item.title = item.title.replace(/reviews$/i, '');
		item.tags.push('RezensionstagPica');
	}

}

function getAuthors (item, entry) {
	let authorEntry = entry.cloneNode(true);

	let authors = authorEntry.querySelectorAll('a.author-link');
	if (authors) {
		for (let author of authors) {
			item.creators.push(ZU.cleanAuthor(author.textContent, "author", true));
		}
	}
}

function getPages (item, entry) {
	let pagesEntry = entry.cloneNode(true);

	let pages = pagesEntry.querySelector('div.page_line i[class*="p_"]');
	if (pages) {
		item.pages = pages?.textContent?.trim().replace(/pages?\s+/i, '').replace(/^\[/, '').replace(/\]$/, '').toUpperCase();
	}
}

function getCitation (item, doc) {
	let citation = doc.querySelector('a.secondary-link[href*="Contents?"]');

	let citationText = ZU.trimInternal(citation.textContent);
	let citationMatch = citationText.match(/(\d+)\s+Bull\.?\s+Medieval\s+Canon\s+L\.?\s*\(n\.s\.\)\s*\((\d{4})(?:\s*-\s*(\d{4}))?\)/i);
	if (citationMatch) {
		item.volume = citationMatch[1];
		item.date = citationMatch[3] ? citationMatch[2] + '/' + citationMatch[3] : citationMatch[2];
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
