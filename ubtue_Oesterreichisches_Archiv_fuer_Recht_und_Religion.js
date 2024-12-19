{
	"translatorID": "1b060445-b16c-4a3e-a3dc-9bae76482d5d",
	"label": "ubtue_Oesterreichisches_Archiv_fuer_Recht_und_Religion",
	"creator": "JR",
	"target": "https://rdb.manz.at/(nachschlagen/Zeitschriften/oearr|document/rdb)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-12-19 08:27:22"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2024 UB Tübingen

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
	if (url.includes('/document/rdb')) {
		return 'article';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('[href*="/document/rdb"]');
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
			// Website is script based, so if we don't get the DOM from the browser 
			// we have to generate the it on our own.
			await scrape(await requestDocument(url), url, true /*needSingleFile*/);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href, needSingleFile = false) {
	if (needSingleFile) {
		let fullSource = await fetch("http://localhost:8070", {'method' : 'POST', 'headers' : { 'Content-Type': 'application/x-www-form-urlencoded' } ,'body' : 'url=' + url }).then(response => response.text());
		let parser = new DOMParser();
		doc = parser.parseFromString(fullSource, 'text/html');
	}
	item = new Zotero.Item("journalArticle");
	let bySlash = new RegExp(/\s*\/\s*/);
	item.title = ZU.xpathText(doc, '//h1')?.replaceAll(/[\s\n]+/g, ' ');
	item.creators =
		ZU.xpathText(doc, 
		     '//div[contains(@class, "fw-bold")][contains(text(), "Autor:in")]/following-sibling::div')
			 ?.split(bySlash)
			 ?.map(author => ZU.cleanAuthor(author, "author"));
	
	item.pages = ZU.xpathText(doc, '//div[contains(@class, "fw-bold")][contains(text(), "Seite")]/following-sibling::div');
	
	let issueAndYear = ZU.xpathText(doc, '//div[contains(@class, "fw-bold")][contains(text(), "Heft")]/following-sibling::div');
	item.issue = issueAndYear?.split(bySlash)?.[0];
    item.year = issueAndYear?.split(bySlash)?.[1];
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
