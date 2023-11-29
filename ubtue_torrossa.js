{
	"translatorID": "236d2234-37e0-41ca-bc1f-5c515ccad0be",
	"label": "ubtue_torrossa",
	"creator": "Timotheus Kim",
	"target": "https://(access.)?(www.)?torrossa.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-11-29 10:03:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.includes('/article/')) {
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
	var rows = doc.querySelectorAll('.uk-margin-remove');
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
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		let issn = ZU.xpathText(doc, '//meta[@name="issn"]/@content');
		if (issn) item.ISSN = issn;
		let volumeIssueEntry = ZU.xpathText(doc, '//*[@class="uk-article-is-part-of"]//a');
		if (volumeIssueEntry) {
			let volumeIssueSplit = volumeIssueEntry.split(':');
			if (volumeIssueSplit[1].includes(',')) {
				let volume = volumeIssueSplit[1].split(',')[0];
				if (volume.match(/\d/g)) {
					item.volume = volume;
				} else {
					item.volume = convert2arabic(volumeIssueSplit[1].split(',')[0]);
				}
				item.issue = volumeIssueSplit[1].split(',')[1];
			}
		}
		let permalinkEntry = ZU.xpathText(doc, '//*[@class="uk-article-permalink"]//a');
		if (permalinkEntry != null) item.url = permalinkEntry.replace(/permalink:/gi, '').replace(/https?/gi, 'https');
		item.language = "it";
		item.abstractNote = "";
		if (item.title == "Recensioni") {
			item.tags.push('RezensionstagPica');
		}

		let checkCitationAuthors = ZU.xpathText(doc, '//meta[@name="citation_author"]/@content');
		if (checkCitationAuthors === "") {
		let authorString = ZU.xpathText(doc, '//div[@class="uk-article-author"]');
			if (authorString.indexOf("|")>-1) {
				item.creators = [];
				var authors = authorString.split("|");
				for (var i=0; i<authors.length; i++) {
					item.creators.push(ZU.cleanAuthor(authors[i], "author", true));
				}
			}
			else {
				item.creators.push(ZU.cleanAuthor(authorString, "author", true));
			}
		}
		item.complete();
	});
	await translator.translate();
}

function convert2arabic(num) {
	let ch;
	let sum = 0;
	for (let i = 0; i < num.length; i++) {
		ch = num[i];
		switch (ch) {
			case 'I':
				if (num[i + 1] === 'V' || num[i + 1] === 'X') {
					continue;
				}
				sum = sum + 1;
				break;
			case 'V':
				if (num[i - 1] === 'I') {
					sum = sum + 4;
					break;
				}
				sum = sum + 5;
				break;
			case 'X':
				if (num[i - 1] === 'I') {
					sum = sum + 9;
					break;
				}
				if (num[i + 1] === 'C') {
					continue;
				}
				sum = sum + 10;
				break;
			case 'L':
				sum = sum + 50;
				break;
			case 'C':
				if (num[i + 1] === 'D' || num[i + 1] === 'M') {
					continue;
				}
				if (num[i - 1] === 'X') {
					sum = sum + 90;
					break;
				}
				sum = sum + 100;
				break;
			case 'D':
				if (num[i - 1] === 'C') {
					sum = sum + 400;
					break;
				}
				sum = sum + 500;
				break;
			case 'M':
				if (num[i - 1] === 'C') {
					sum = sum + 900;
					break;
				}
				sum = sum + 1000;
				break;
		}
	}
	return sum;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://access.torrossa.com/de/resources/an/5500139",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://access.torrossa.com/de/resources/an/5500172",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.torrossa.com/de/resources/an/5563004",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.torrossa.com/en/resources/an/5451157",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.torrossa.com/en/resources/an/5474695",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.torrossa.com/de/resources/an/4757977",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://access.torrossa.com/de/resources/an/5521608",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://access.torrossa.com/de/resources/an/5299565",
		"items": "multiple"
	}
]
/** END TEST CASES **/
