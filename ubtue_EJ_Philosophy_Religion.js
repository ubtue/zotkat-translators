{
	"translatorID": "ac3d1c3a-25fc-43a1-b380-b5922cbc528a",
	"label": "ubtue_EJ_Philosophy_Religion",
	"creator": "Mara Spieß",
	"target": "https://www.philosophy-of-religion.eu/(article|volume)-view",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-04 15:38:57"
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
	if (url.includes('/article-view')) {
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
	var rows = doc.querySelectorAll('h2 > a.js-card-link[href*="article-view"]');
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

async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item("journalArticle");
	item.url = url;
	item.ISSN = "1689-8311";

	let titleElement = doc.querySelector('div.entry__article > h3');
	item.title = ZU.capitalizeTitle(titleElement?.textContent, true);

	let node = titleElement.nextElementSibling;
	while (
		node &&
		node.tagName === "P" &&
		node.querySelector("b")?.textContent.trim() !== "DOI:"
	) {
		let author = node.querySelector("b")?.textContent.trim();
		if (author) {
			item.creators.push(ZU.cleanAuthor(author, "author", false));
		}
		node = node.nextElementSibling;
	}

	item.DOI = doc.querySelector('a[href*="doi.org/10."]');
	
	item.abstractNote = doc.querySelector('div.intro').textContent.replace(/abstract|\t/gi, '');

	keywords = ZU.xpathText(doc, "//p[b[normalize-space()='Keywords:']]");
	if (keywords) {
		keywords = keywords.replace(/Keywords:\s*|\n/g, "").trim().split(/\s*[;,]\s*/);
		keywords.forEach(keyword => {
			item.tags.push(keyword);
		})
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
