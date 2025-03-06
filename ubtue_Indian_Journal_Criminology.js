{
	"translatorID": "ba37e957-a0bd-4bb9-9c81-f33eb661480f",
	"label": "ubtue_Indian_Journal_Criminology",
	"creator": "Mara Spieß",
	"target": "https://sites.google.com/view/ijc-archive",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-02-19 13:12:08"
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
	if (url.includes('/ijc-archive-article')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.XqQF9c[href*="/file/"]');
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

function getAuthor (author, item) {
	author = ZU.cleanAuthor(author, 'author', false);
	item.creators.push(author);
}
async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			let item = new Zotero.Item("journalArticle");
			item.ISSN = "0974-7249";
			item.url = url;
			var relativeUrl = new URL(url);
			entry = doc.querySelector('a[href*="' + relativeUrl.pathname + '"]');
			item.title = entry.textContent;

			let citationElement = ZU.xpathText(doc, '//span[contains(@class, "C9DxTc ")][contains(text(), "Vol.")]');
			if (citationElement) {
				let citationMatch = citationElement.match(/(\d{4})\s+vol.\s(\d+)(\s+\((\d+)\))?/i);
				if (citationMatch) {
					item.date = citationMatch[1].length ? citationMatch[1] : "";
					item.volume = citationMatch[2].length ? citationMatch[2] : "";
					item.issue = citationMatch[3].length ? citationMatch[3].replace(/\(|\)/g, '') : "";
				}
			}

			let authorElement = entry.nextElementSibling;
			while (!authorElement) {
				authorElement = entry.parentNode.nextElementSibling;
			}
			if (authorElement) {
				let authors = authorElement.textContent.replace(/mrs\b|mr\b/ig, '').split(/and\b|,/);
				authors.forEach(author => getAuthor(author, item));
			}
			
			item.complete();
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
