{
	"translatorID": "0e0535c1-4f8f-461d-a0f3-ab007fa1e13a",
	"label": "ubtue_Revista_de_Historia_de_las_Prisiones",
	"creator": "Hjordis Lindeboom",
	"target": "https://www[.]revistadeprisiones[.]com/project/numero",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-07-17 15:01:32"
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
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;

	let articleNodes = doc.querySelectorAll("p a[href]");
	for (let link of articleNodes) {
		let href = link.href;

		let title = "";

		if (link.querySelector("em")) {
			let titleElement = link.querySelector("em");
			title = ZU.trimInternal(titleElement.textContent);
		}
		else {
			let titleNode = link.closest("p").querySelectorAll("em");
			for (let titleElement of titleNode) {
				let text = ZU.trimInternal(titleElement.textContent);
				if (text.length > title.length) {
					title = text;
				}
			}
		}

		if (!title) {
			let linkText = ZU.trimInternal(link.textContent.replace(/\.|<br>/g, '').trim());
			title = linkText.replace(/PDF/i, '').trim();
		}

		if (!href || !title) continue;
		if (checkOnly) return true;

		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		let results = getSearchResults(doc, false);
		let selected = await Zotero.selectItems(results);
		if (!selected) return;

		for (let href of Object.keys(selected)) {
			await scrape(doc, decodeURI(href));
		}
	}
}

async function scrape(doc, url) {
	let processedUrls = new Set();
	let articleNode = doc.querySelectorAll("p");
	for (let article of articleNode) {
		let link = article.querySelector(`a[href="${url}"]`);
		if (link) {
			let linkHref = link.href;
			if (processedUrls.has(linkHref)) {
				continue;
			}
			processedUrls.add(linkHref);
		}
		if (!link) continue;

		let title = "";

		if (link.querySelector("em")) {
			let titleElement = link.querySelector("em");
			title = ZU.trimInternal(titleElement.textContent);
		}
		else {
			let titleNode = link.closest("p").querySelectorAll("em");
			for (let titleElement of titleNode) {
				let text = ZU.trimInternal(titleElement.textContent);
				if (text.length > title.length) {
					title = text;
				}
			}
		}

		if (!title) {
			let linkText = ZU.trimInternal(link.textContent.replace(/\.|<br>/g, '').trim());
			title = linkText.replace(/PDF/i, '').trim();
		}

		let authorNode = article.querySelector("br");
		let author = "";
		if (authorNode && authorNode.nextSibling) {
			author = ZU.trimInternal(authorNode.nextSibling.textContent || authorNode.nextSibling.nodeValue).replace("por", "");
		} else {
			let parentHTML = article.innerHTML;
			let linkHTML = link.outerHTML;
			let afterLink = parentHTML.split(linkHTML)[1];

			if (afterLink) {
				let match = afterLink.match(/(?:por\s+)?([^<,]+?)(?=,\s*pp\.|\s*\(|<)/i);
				if (match) {
					author = ZU.trimInternal(match[1]).replace("por", "");
				}
			}
		}

		// this requires the pdf-metadata-extractor to be running, see: https://github.com/ubtue/pdf-metadata-extractor
		let extracted = {};
		let site = 'revista_de_historia_de_las_prisiones';

		try {
			const params = new URLSearchParams();
			params.append('url', url);
			params.append('site', site);
			extracted = await fetch(PYMUPDF_SERVER_ADDRESS, {
				'method': "POST",
				'headers' : { 'Content-Type': 'application/x-www-form-urlencoded' },
				'body': params.toString()
			}).then(response => response.json());

		} catch (e) {
			Zotero.debug("PDF extraction failed: " + e);
		}

		let item = new Zotero.Item("journalArticle");
		item.title = extracted.title || title;
		item.url = url;

		if (author) {
			let authors = author.split(/\s+y\s+/i);
			authors = authors.flatMap(a => a.split(/\s*,\s*/)); 
			for (let name of authors) {
				item.creators.push(Zotero.Utilities.cleanAuthor(name, "author"));
			}
		}

		if (extracted.abstract_en)
			item.abstractNote = extracted.abstract_en;

		if (!item.abstractNote && extracted.abstract_es)
				item.abstractNote = extracted.abstract_es;
		else if (extracted.abstract_es)
				item.notes.push({'note' : 'abs: ' + extracted.abstract_es});


		let tagsSet = new Set();
		if (extracted.keywords_en) {
			extracted.keywords_en.split(",").forEach(tag => tagsSet.add(tag.trim()));
		}
		if (extracted.keywords_es) {
			extracted.keywords_es.split(",").forEach(tag => tagsSet.add(tag.trim()));
		}
		item.tags = Array.from(tagsSet);

		if (extracted.tags)
			item.tags.push(extracted.tags)

		if (extracted.pages)
			item.pages = extracted.pages;

		if (extracted.issn)
			item.ISSN = extracted.issn;

		if (extracted.volume)
			item.volume = extracted.volume;

		if (extracted.publishing_date) {
			let match = extracted.publishing_date.match(/\b\d{4}\b/);
			if (match) {
				item.date = match[0];
			}
		}

		if (extracted.publication)
			item.publicationTitle = extracted.publication;
		else
			item.publicationTitle = "Revista de Historia de las Prisiones"

		item.language = "spa"

		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
