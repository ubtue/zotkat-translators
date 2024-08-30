{
	"translatorID": "facc76d4-7e8a-44fa-b793-9d7457c3fc9a",
	"label": "ubtue_APCJ",
	"creator": "Mara Spieß",
	"target": "https://apcj.shsu.edu/journal/index.php",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-30 07:43:43"
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
	if (url.includes('item=')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true) && url.includes('vol=')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 > a[href*="item="]');
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

function getAuthors (item, citationParagraph) {
	authorMatch = citationParagraph.textContent.match(/suggested citation:\s*(\D+)\((?:\d{4})\)/i);
	citationAuthors = authorMatch[1].split(/(?:,?\s+&\s+)|(?:\.,)/g);
	citationAuthors.forEach(author => {
		item.creators.push(ZU.cleanAuthor(author, "author", true));
	})
}

function getDate (item, citationParagraph) {
	dateMatch = citationParagraph.textContent.match(/\((\d{4})\)/);
	if (dateMatch) {
		item.date = dateMatch[1];
	}
}

function getIssue (item, citationParagraph) {
	issueMatch = citationParagraph.textContent.match(/(?:\d+)\((\d+)\)/);
	if (issueMatch) {
		item.issue = issueMatch[1];
	}
}

function getVolume (item, citationParagraph) {
	volumeMatch = citationParagraph.textContent.match(/(\d+)\((?:\d+)\)/);
	if (volumeMatch) {
		item.volume = volumeMatch[1];
	}
}

function getPages (item, citationParagraph) {
	pagesMatch = citationParagraph.textContent.match(/(\d+-?\d*)[.]/);
	if (pagesMatch) {
		item.pages = pagesMatch[1];
	}
}

function getKeywords (p, item) {
	let keywordsRegex = /keywords/i;
	if (keywordsRegex.test(p.textContent)) {
		keywordsParagraph = p;
		separatorRegex = /^[^,]+,/i;
		keywords = keywordsParagraph.textContent.replace("Keywords: ", "").split(/[,;]/);
		keywords.forEach(keyword => {
			item.tags.push(keyword.trim());
		});
	}
}

function getAbstract (p, item) {
	let abstractRegex = /description/i;
	if (abstractRegex.test(p.textContent)) {
		abstractParagraph = p;
		item.abstractNote = abstractParagraph.textContent.replace("Description: ", "");
	}
}

async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item("journalArticle");
	item.url = url;
	item.title = doc.querySelector('#content_box > h3').textContent;

	let paragraphs = doc.querySelectorAll('p');
	let citationParagraph = null;
	let citationRegex = /suggested\s+citation/i;

	if (paragraphs) {
		paragraphs.forEach(p => {
			if (citationRegex.test(p.textContent)) {
				citationParagraph = p;
				getAuthors(item, citationParagraph);
				getDate(item, citationParagraph);
				getIssue(item, citationParagraph);
				getVolume(item, citationParagraph);
				getPages(item, citationParagraph);		
			}
			getKeywords(p, item);
			getAbstract(p, item);	
		});
	}
	
	item.complete();  
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
