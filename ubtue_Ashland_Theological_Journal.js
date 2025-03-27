{
	"translatorID": "bbeefac5-f247-4e3e-b62c-2a61100542ef",
	"label": "ubtue_Ashland_Theological_Journal",
	"creator": "Mara Spieß",
	"target": "https://biblicalstudies.org.uk/articles_ashland-theological-journal",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-11 09:48:56"
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
	if (url.includes('/articles')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="pdf/ashland_theological_journal"]');
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

function getAuthor(author, item) {
	author = ZU.cleanAuthor(author, 'author', false);
	item.creators.push(author);
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			let item = new Zotero.Item("journalArticle");
			item.publicationTitle = "Ashland Theological Journal";
			item.ISSN = "1044-6494";
			item.url = url;
			let relativeUrl = new URL(url);
			let entry = doc.querySelector('a[href*="' + relativeUrl.pathname.replace("/pdf/", "pdf/") + '"]');
			if (entry) {
				let entryText = entry.textContent;
				let citation = entryText.match(/(.*),*\s*"([\s\S]*),?"\s+ashland theological journal\s?(\d+)\s+\(\w*\s*(\d{4})\):\s+(\d+-\d+)/i);
				if (citation) {
					if (citation[1].length) {
						let authors = citation[1].replace('et al', '').split('&');
						authors.forEach(author => getAuthor(author, item));
					}
					item.title = citation[2].replace(/,$/,"");
					item.volume = citation[3];
					item.date = citation[4];
					item.pages = citation[5];	
				}
			}

			item.complete();
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
