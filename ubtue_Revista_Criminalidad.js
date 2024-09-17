{
	"translatorID": "483011a5-359b-4253-a5c4-9681df253c78",
	"label": "ubtue_Revista_Criminalidad",
	"creator": "Mara Spieß",
	"target": "https://www.policia.gov.co/revista/(revista-criminalidad-)?volumen",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-09-06 12:46:07"
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
    if (url.includes('numero') || url.includes('-no-')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.magazine-article');
	for (let row of rows) {
		let hrefElement = row.querySelector('div.field--name-field-archivo-articulo > a[href*="/files/"]');
		if (!hrefElement) continue;
		let href = hrefElement.href;
		let titleElement = row.querySelector('div.field--name-field-titulo-en-espanol');
		if (!titleElement) continue;
		let title = ZU.trimInternal(titleElement.textContent);
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
			item.publicationTitle = "Revista Criminalidad";
			item.ISSN = "1794-3108";
			item.url = url;

			let relativeUrl = new URL(url);
			let entry = doc.querySelector('a[href*="' + relativeUrl.pathname + '"]').closest('div.magazine-article');
			let titleElement = entry.querySelector('div.field--name-field-titulo-en-espanol');
            item.title = titleElement ? titleElement.textContent : "TITEL ERGÄNZEN";

			getParalleltitel(item, entry);
			getAuthors(item, entry);

			let citationEntry = doc.querySelector('div.titleContent > h1');
			if (citationEntry) {
				getVolume(item, citationEntry);
				getIssue(item, citationEntry);
			}

			item.complete();
		}
	}
}

function getParalleltitel (item, entry) {
	let englishTitle = entry.querySelector('div.field--name-field-titulo-en-ingles-articulo');
	if (englishTitle) {
		item.notes.push("Paralleltitel:" + englishTitle.textContent);
	}
	let portugeseTitle = entry.querySelector('div.field--name-field-titulo-en-portugues-articu');
	if (portugeseTitle) {
		item.notes.push("Paralleltitel:" + portugeseTitle.textContent);
	}
}

function getAuthors(item, entry) {
    let authorList = entry.querySelector('div.field--name-field-autores-articulo-revista');
	if (authorList) {
        let authors = authorList.textContent.split(/;/);
        for (let author of authors) {
            item.creators.push(ZU.cleanAuthor(author, "author", false));
        }
	}
}

function getVolume (item, citationEntry) {
	let volumeMatch = citationEntry.textContent.match(/volumen\s*(\d+)/i);
	if (volumeMatch) {
		item.volume = volumeMatch[1];
	}
}

function getIssue (item, citationEntry) {
	let issueMatch = citationEntry.textContent.match(/(?:n(?:ú|u)mero|no.)\s*(\d+)/i);
	if (issueMatch) {
		item.issue = issueMatch[1];
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.policia.gov.co/revista/revista-criminalidad-volumen-63-no-1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.policia.gov.co/revista/revista-criminalidad-volumen-63-numero-3",
		"items": "multiple"
	}
]
/** END TEST CASES **/
