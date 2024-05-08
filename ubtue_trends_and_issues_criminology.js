{
	"translatorID": "8e8832da-7d48-4eb5-a7a7-1f2856892905",
	"label": "ubtue_trends_and_issues_criminology",
	"creator": "Mara Spieß",
	"target": "https://www.aic.gov.au/publications/tandi",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-05-08 08:24:06"
}

/*
	***** BEGIN LICENSE BLOCK *****


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
	if (url.includes('/tandi/tandi')) {
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
	var rows = doc.querySelectorAll('.field-content');
	for (let row of rows) {
		let anchor = row.querySelector('a');
		let href = anchor ? anchor.getAttribute('href') : null;
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
		item.itemType = "journalArticle";
		item.notes.push('artikelID:' + url.replace(/\D/g,''));

		item.creators = [];
		let authorCandidates = ZU.xpath(doc, '//div[contains(@class,"field--name-field-author")]/*');
		for (authorCandidate of authorCandidates) {
			item.creators.push(ZU.cleanAuthor(authorCandidate.textContent, "author"));
		}
		
		let citation = doc.getElementById('citation').textContent;
		let doiRegex = /(https?:\/\/doi[^\s]+)/g;
		let doi = citation.match(doiRegex);
		item.url = doi[0];

		item.ISSN = ZU.xpathText(doc, '//div[contains(text(),"ISSN")]/following-sibling::div/div[@class="field--item"]');
		item.ISBN = "";
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.aic.gov.au/publications/tandi/tandi688",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "User experiences of reporting dating app facilitated sexual violence to dating platforms Reporting dating app facilitated sexual violence",
				"creators": [
					{
						"firstName": "Lawler",
						"lastName": "Siobhan",
						"creatorType": "author"
					},
					{
						"firstName": "Boxall",
						"lastName": "Hayley",
						"creatorType": "author"
					}
				],
				"date": "Tue, 2024-03-12 12:00",
				"ISSN": "1836-2206",
				"abstractNote": "A significant proportion of users subjected to dating app facilitated sexual violence (DAFSV) make a report to the platform. However, the experiences of victim-survivors reporting to dating platforms has been underexamined in research. Based on the analysis of a survey completed by 1,555 dating platform users in Australia who had reported DAFSV to the platform, this study found overall positive experiences reporting to platforms. However, victim-survivors’ experiences differed depending on their gender and sexual identity; LGB+ women reported the lowest levels of satisfaction with platforms’ responses, and heterosexual men the highest. Further, respondents who were satisfied with how platforms responded to their reports of DAFSV were more likely to say that they would report again in the future. Respondents who said that the dating platform had provided them with information about other services were also more likely to report the incident to the police.",
				"language": "en",
				"libraryCatalog": "www.aic.gov.au",
				"url": "https://doi.org/10.52922/ti77314",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Cybercrime"
					},
					{
						"tag": "Peer-reviewed"
					},
					{
						"tag": "Reporting"
					},
					{
						"tag": "Sexual violence"
					},
					{
						"tag": "Surveys"
					},
					{
						"tag": "Victims"
					}
				],
				"notes": [
					"artikelID:688"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
