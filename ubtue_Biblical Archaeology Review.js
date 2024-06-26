{
	"translatorID": "35e27fab-0e23-467f-9981-f23942899a46",
	"label": "ubtue_Biblical Archaeology Review",
	"creator": "Timotheus Kim",
	"target": "biblicalarchaeology.org",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-06-26 13:05:50"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Universitätsbibliothek Tübingen

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
	var rows = doc.querySelectorAll('.title');
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
		if (item.title.match(/-\s?The\s?BAS\s?Library/)) item.title = item.title.replace(/-\s?The\s?BAS\s?Library/i, '');
		let authorString = ZU.xpathText(doc, '//*[contains(@href, "https://library.biblicalarchaeology.org/auth")]');
		if (authorString) {
			if (authorString.indexOf(",")>-1) {
			item.creators = [];
			let authors = ZU.trimInternal(authorString).split(",");
				for (let author of authors) {
					let fullName = ZU.trimInternal(author);
					item.creators.push(ZU.cleanAuthor(fullName, "author"));
				}
			}	
			else {
				let fullName = ZU.trimInternal(authorString);
				item.creators.push(ZU.cleanAuthor(fullName, "author"));
			}
		}
		item.publicationTitle = "Biblical Archaeology Review";
		item.ISSN = "0098-9444";
		
		let lookupVolumeIssue = ZU.xpathText(doc, '//a[contains(@href, "issue")]/@href');
				ZU.processDocuments(lookupVolumeIssue, function (scrapeVolumeIssue) {
					let volumeIssueEntry = ZU.xpathText(scrapeVolumeIssue, '//*[(@class="meta")]');
					let yearUrl = ZU.xpathText(scrapeVolumeIssue, '//link[@rel="canonical"]/@href');
					if (volumeIssueEntry) {
						item.volume = volumeIssueEntry.match(/(?:volume)\s+(\d+)/i)[1];
						item.issue = volumeIssueEntry.match(/(?:number)\s+(\d+)/i)[1];
					}
					if (yearUrl) {
						item.date = yearUrl.match(/\b\d{4}\b/);
					}
				});

		item.complete();
	});


	let em = await translator.getTranslatorObject();
	em.itemType = 'journalArticle';
	em.addCustomFields({
		'og:description': 'abstractNote'
	});
	
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://library.biblicalarchaeology.org/issue/fall-2023/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://library.biblicalarchaeology.org/issue/summer-2024/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://library.biblicalarchaeology.org/article/finding-jesus-byzantine-paintings-at-shivta/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Finding Jesus: Byzantine Paintings at Shivta",
				"creators": [
					{
						"firstName": "Emma",
						"lastName": "Maayan-Fanar",
						"creatorType": "author"
					},
					{
						"firstName": "Yotam",
						"lastName": "Tepper",
						"creatorType": "author"
					}
				],
				"ISSN": "0098-9444",
				"abstractNote": "Traces of wall paintings in the Byzantine-period village of Shivta in the Negev have been recently identified as images of Jesus. They portray Jesus’s baptism, painted in the North Church’s baptistery, and the Transfiguration, in the South Church. These rare compositions elucidate the development of early Christian iconography and cultural life in this remote region.",
				"language": "en-US",
				"libraryCatalog": "library.biblicalarchaeology.org",
				"publicationTitle": "Biblical Archaeology Review",
				"shortTitle": "Finding Jesus",
				"url": "https://library.biblicalarchaeology.org/article/finding-jesus-byzantine-paintings-at-shivta/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
