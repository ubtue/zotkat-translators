{
	"translatorID": "0bbf3ff9-e2f2-45a1-b672-3b29babae15f",
	"label": "ubtue_agntsjournal",
	"creator": "Timotheus Kim",
	"target": "^https?://(www\\.)?agntsjournal\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-09 15:19:34"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 UNIVERSITÄTSBILBIOTHEK TÜBINGEN 

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
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.entry-title a');
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
	let jsonData = JSON.parse(
		doc.querySelector('script.yoast-schema-graph').textContent
	);
	let json = jsonData['@graph'].find(node => node['@type'] == 'Article') || {};

	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		// Correct the title using the clean JSON-LD headline.
		if (json.headline) item.title = json.headline;

		// Authors remain supplied by Embedded Metadata.
		if (!item.language && json.inLanguage) {
			item.language = json.inLanguage;
		}

		// Translator or Editor supplied only by box section
		let creatorBox = doc.querySelector('.content-box-gray');
		if (creatorBox) {
			let clone = creatorBox.cloneNode(true);
			for (let br of clone.querySelectorAll('br')) {
				br.replaceWith(doc.createTextNode('\n'));
			}

			for (let line of clone.textContent.split(/\r?\n/)) {
				let match = line.trim().match(
					/^(transla[^:]*|editor[^:]*):\s*(.+)$/i
				);
				if (!match) continue;

				let creatorType = /^transla/i.test(match[1])
					? 'translator'
					: 'editor';

				// Split multiple names separated by "and" or semicolons.
				for (let name of match[2].split(/\s+and\s+|;/i)) {
					name = ZU.trimInternal(name);
					if (!name) continue;

					let creator = ZU.cleanAuthor(name, creatorType);
					let exists = item.creators.some(existing =>
						existing.creatorType == creator.creatorType
						&& existing.firstName == creator.firstName
						&& existing.lastName == creator.lastName
					);

					if (!exists) item.creators.push(creator);
				}
			}
		}

		if (!item.date && json.datePublished) {
			item.date = json.datePublished;
		}

		if (!item.volume && json.articleSection) {
			let section = [].concat(json.articleSection).join(' ');
			let volume = section.match(/Volume\s+(\d+)/i);
			if (volume) item.volume = volume[1];
		}

		if (!item.publicationTitle) {
			let meta = doc.querySelector('meta[property="og:site_name"]');
			if (meta) item.publicationTitle = meta.content;
		}

		if (!item.pages && json.pagination) {
			item.pages = json.pagination;
		}

		// pages supplied only by box section
		if (!item.pages) {
			let box = doc.querySelector('.content-box-gray');
			if (box) {
				let pages = box.textContent.match(
					/Pages:\s*(\d+\s*[-–]\s*\d+|\d+)/
				);
				if (pages) {
					item.pages = pages[1].replace(/\s/g, '').replace(/–/g, '-');
				}
			}
		}

		item.ISSN = "3068-6660";

		// keywords supplied only by box section
		let box = doc.querySelector('.content-box-gray');
		if (box) {
			let clone = box.cloneNode(true);
			for (let br of clone.querySelectorAll('br')) {
				br.replaceWith(doc.createTextNode('\n'));
			}

			let keywords = clone.textContent.match(/Keywords:\s*([^\n]+)/);
			if (keywords) {
				let existingTags = new Set(
					item.tags.map(tag => typeof tag == 'string' ? tag : tag.tag)
				);

				for (let tag of keywords[1].split(';')) {
					tag = ZU.trimInternal(tag);
					if (tag && !existingTags.has(tag)) {
						item.tags.push({ tag });
						existingTags.add(tag);
					}
				}
			}
		}
		// Add visible-page fallbacks here for fields absent from JSON-LD.
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'journalArticle';
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://agntsjournal.com/volume-1-2025/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
