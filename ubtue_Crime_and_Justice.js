{
	"translatorID": "dec09eec-baee-44d3-a306-5dfb8d3ae733",
	"label": "ubtue_Crime_and_Justice",
	"creator": "Mara Spieß",
	"target": "https://www.crimeandjustice.org.uk/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-02-19 09:50:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Mara Spieß

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
	if (url.includes('/prison-service-journal')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('ul > li > a[href*="/sites/"]');
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

function getAuthors(entry) {
	titleEntry = entry.closest('li');
	titleEntry.removeChild(entry);
	strippedPrefix = titleEntry.textContent.replace(/(?:\s*,\s*)?(?:(interviewe?d?|reviewed)\s+)?by\b\s*/ig, '').replace(/(?:\s*Dr\s+)|(?:\s*Professor\s+)/g, '');
	authors = strippedPrefix.split(/and\s+|[,]/);
return authors;
}

function getVolume(doc, item) {
	let volumeNumber = doc.querySelector('span.field--name-title');
	if (volumeNumber) {
		let volumeNumberMatch = volumeNumber.innerText.match(/prison\s+service\s+journal\s+(\d+)/i);
		if (volumeNumberMatch) {
			item.volume = volumeNumberMatch[1];
		}	
	}
}

function getDate(doc, item) {
	let date = doc.querySelector('div.field--name-field-date');
	if (date) {
		let dateMatch = date.innerText.match(/\d+\s+\w+\s+(\d+)/i);
		if (dateMatch) {
			item.date = dateMatch[1];
		}
	}
}
 async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			let item = new Zotero.Item("journalArticle");
			item.ISSN = "0300-3558";
			var relativeUrl = new URL(url);
			entry = doc.querySelector('a[href*="' + relativeUrl.pathname + '"]');
			item.title = entry.textContent;
			item.url = url;

			for (author of getAuthors(entry)) {
				item.creators.push(ZU.cleanAuthor(author, "author", false));
			}

			getVolume(doc, item);
			getDate(doc, item);
			item.complete();
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
