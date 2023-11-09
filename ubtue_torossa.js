{
	"translatorID": "236d2234-37e0-41ca-bc1f-5c515ccad0be",
	"label": "ubtue_torossa",
	"creator": "Timotheus Kim",
	"target": "https://www.torrossa.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-11-09 15:01:22"
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
		let volumeIssueEntry = ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content');
		if(volumeIssueEntry) {
			let volumeIssueSplit = volumeIssueEntry.split(':');
			if (volumeIssueSplit[1].includes(',')) {
				item.volume = volumeIssueSplit[1].split(',')[0];
				item.issue = volumeIssueSplit[1].split(',')[1];
			}
		}
		item.language = "it";
		item.abstractNote = "";
		item.complete();
	});
	await translator.translate();
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
	}
]
/** END TEST CASES **/
