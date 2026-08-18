{
	"translatorID": "0d5770f9-38ea-4fa9-9383-651e95212270",
	"label": "ubtue_Hapag",
	"creator": "Hjordis Lindeboom",
	"target": "svst[.]edu[.]ph/hapag",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-18 07:11:16"
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
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function extractAuthors(link) {
	let li = link.closest('li');
	if (!li) return [];
	let text = ZU.trimInternal(li.textContent);
	let title = ZU.trimInternal(link.textContent);
	let remainder = text.replace(title, '').trim();
	let match = remainder.match(/^by\s+(.+)$/i);
	if (!match) return [];
	let authorsText = match[1].trim();
	authorsText = authorsText.replace(/\s+and\s+/gi, ', ').replace("Ma.", "");
	let authors = authorsText
		.split(/,\s+(?!(?:Jr\.?|Sr\.?|CM\.?)$)/i)
		.map(a => a.trim())
		.filter(Boolean);

	return authors;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var links = doc.querySelectorAll('li a[href*=".pdf"]');
	for (let link of links) {
		let title = ZU.trimInternal(link.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		items[link.href] = {
			title,
			href: link.href,
			authors: extractAuthors(link)
		};
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	const results = getSearchResults(doc, false);
	const selectItems = {};
	for (let href in results) {
		selectItems[href] = results[href].title;
	}
	const selected = await Zotero.selectItems(selectItems);
	if (!selected) return;
	for (let href of Object.keys(selected)) {
		await scrape(results[href]);
	}
}

async function scrape(data) {
	const item = new Zotero.Item("journalArticle");
	item.title = data.title;
	item.url = data.href;
	for (let author of data.authors) {
		let suffixMatch = author.match(/^(.*),?\s*(Jr\.?|Sr\.?|CM\.?)$/i);
		if (suffixMatch) {
			let creator = ZU.cleanAuthor(suffixMatch[1], "author");
			creator.lastName += " " + suffixMatch[2];
			item.creators.push(creator);
		}
		else {
			item.creators.push(ZU.cleanAuthor(author, "author"));
		}
	}
	item.ISSN = "1656-2739";
	item.language = "eng";

	// this requires the pdf-metadata-extractor to be running, see: https://github.com/ubtue/pdf-metadata-extractor
	let extracted = {};
	let site = 'hapag';
	try {
		const params = new URLSearchParams();
		params.append('url', data.href);
		params.append('site', site);
		extracted = await fetch(PYMUPDF_SERVER_ADDRESS, {
			'method': "POST",
			'headers' : { 'Content-Type': 'application/x-www-form-urlencoded' },
			'body': params.toString()
		}).then(response => response.json());

	} catch (e) {
		Zotero.debug("PDF extraction failed: " + e);
	}
	if (extracted.volume) item.volume = extracted.volume;
	if (extracted.issue) item.issue = extracted.issue;
	if (extracted.year) item.date = extracted.year;
	if (extracted.pages) item.pages = extracted.pages;
	if (extracted.abstract) item.abstractNote = extracted.abstract.trim();
	let tagsSet = new Set()
	if (extracted.keywords) extracted.keywords.split(",").forEach(tag => tagsSet.add(tag.trim()));
	item.tags.push(...Array.from(tagsSet));

	await item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
