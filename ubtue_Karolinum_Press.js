{
	"translatorID": "9331adb1-ed81-4e1b-abd4-b4673c556fde",
	"label": "ubtue_Karolinum_Press",
	"creator": "Mara Spieß",
	"target": "https://karolinum.cz(.*)/journal/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-18 15:45:31"
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
	if (url.includes('/article-')) {
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
	var rows = doc.querySelectorAll('a[href*="/article-"]');
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

function getParallelTitle(doc, item) {
	let titleElement = doc.querySelector('h1');
	if (titleElement?.textContent.trim() === item.title.trim()) {
		let siblingElement = titleElement.nextElementSibling;
		if (siblingElement?.textContent.trim().startsWith('[') && siblingElement?.textContent.trim().endsWith(']')) {
			let parallelTitle = siblingElement.textContent.trim().replace(/^\[/, '').replace(/\]$/, '');
			item.notes.push("Paralleltitel: " + parallelTitle);
		}
	}
}

function getKeywords(doc, item) {
	let keywords = ZU.xpath(doc, '//p/strong[contains(text(), "keywords:")]');
	if (keywords.length) {
		let keywordElement = keywords[0];
		let keywordText = keywordElement.parentNode.textContent.replace(/keywords:/i, '').trim();
		let keywordArray = keywordText.split(';').map(keyword => keyword.trim());
		item.tags = keywordArray;
	} 
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		if (item.publicationTitle.match(/communio viatorum/i)) {
			item.ISSN = "0010-3713";
		}

		let doiElement = doc.querySelector('a[href*="https://doi.org/"]');
		if (doiElement) {
			item.DOI = doiElement.textContent.replace('https://doi.org/', '');
		}

		if (item.title.match(/^book review/i)) {
			item.tags.push('RezensionstagPica');
		}

		getParallelTitle(doc, item);
		getKeywords(doc, item);
		
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://karolinum.cz/en/journal/communio-viatorum/year-66/issue-2/article-13306",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Geschichte und Leben eines Textes: Über die Erklärung Zur Problematik der Aussiedlung der Sudetendeutschen aus 1995",
				"creators": [
					{
						"firstName": "Ladislav",
						"lastName": "Beneš",
						"creatorType": "author"
					}
				],
				"date": "2024/11/12",
				"DOI": "10.14712/30296374.2024.14",
				"ISSN": "0010-3713",
				"abstractNote": "The article recalls the publication and historical context of the Declaration on the Question of the Expulsion of the Sudeten Germans, which was adopted as an official statement by the Evangelical Church of Czech Brethren (ECCB) in 1995. The document dealt with the past and present of relations between Czechs and Germans, in particular with the expulsion of the Sudeten Germans from the Czechoslovak border regions after the Second World War. The ECCB’s declaration was intended to express the fact that the two nations caused each other considerable harm during this period. However, a common future is only possible through mutual reconciliation, forgiveness and a joint endeavour to overcome historical injustice. The creation of the declaration was a reaction to the context at the time, when the aim was to find a new way of co-operation between Czechs and Germans after the revolution of 1989. After forty years of communist rule in Czechoslovakia, mutual antipathy was once again widespread among the public. The Sudeten German Landsmannschaft was a key group in this respect. The authors of the Declaration on the Question of the Expulsion of the Sudeten Germans faced criticism, mainly because of historical inaccuracies or an alleged unnecessary humiliation of the Czechs towards the Germans. Nevertheless, the document was largely favourably received by the public and politicians and was gratefully received by the Evangelical Church in Germany (EKD). Subsequently, the declaration was taken as inspiration for further work on the topic and, in cooperation with the EKD, a Protestant anthology on the subject was produced.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "karolinum.cz",
				"pages": "165-191",
				"publicationTitle": "COMMUNIO VIATORUM",
				"shortTitle": "Geschichte und Leben eines Textes",
				"url": "https://karolinum.cz/en/journal/communio-viatorum/year-66/issue-2/article-13306",
				"volume": "66",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Czech-German relations"
					},
					{
						"tag": "Evangelical Church in Germany"
					},
					{
						"tag": "Evangelical Church of Czech Brethren"
					},
					{
						"tag": "Sudeten Germans"
					},
					{
						"tag": "the expulsion of the Sudeten Germans"
					}
				],
				"notes": [
					"Paralleltitel: History and Life of a Text. About the Declaration on the Question of the Expulsion of the Sudeten Germans from 1995"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
