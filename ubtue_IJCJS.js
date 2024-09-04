{
	"translatorID": "29a40cea-0a00-4850-8e9e-0bf17f2a6c40",
	"label": "ubtue_IJCJS",
	"creator": "Mara Spieß",
	"target": "https://www.ijcjs.com/(volume|article)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-09-04 14:15:42"
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
	if (url.includes('/article-detail')) {
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
	var rows = doc.querySelectorAll('h2 > a[href*="article-detail"]');
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
	item.title = doc.querySelector('h2[style=" font-weight: bold; font-size: 30px; margin-bottom: 25px;"]').textContent;
	getAbstract(doc, item);
	getAuthors(doc, item);
	getKeywords(doc, item);

	item.complete();
}

function getAbstract(doc, item) {
	let abstractElement = doc.querySelector('em');
	if (abstractElement) {
		item.abstractNote = abstractElement.textContent;
	}
}

function getAuthors(doc, item) {
	let authorsElements = doc.querySelectorAll('p.author-list');
	let filteredAuthors = [];
	if (authorsElements) {
		authorsElements.forEach(author => {
			let authorName = author.textContent.replace(/Dr\s/,'');
			if (!authorName.includes("Published on")) {
                filteredAuthors.push(authorName);
            }
		});
    }
    filteredAuthors.forEach(authorName => {
        item.creators.push(ZU.cleanAuthor(authorName, "author", false));
    });
}

function getKeywords(doc, item) {
    let keywordsElement = ZU.xpathText(doc, '//h4[contains(text(), "Keyword:")]/following-sibling::p[1]');
    if (keywordsElement) {
        let keywords = keywordsElement.replace(/[.]$/,'').split(',').map(keyword => keyword.trim());
        keywords.forEach(keyword => {
            item.tags.push(keyword);
        });
    }
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
