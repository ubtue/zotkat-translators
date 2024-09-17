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
	"lastUpdated": "2024-09-16 12:45:39"
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
	item.ISSN = "0973-5089";
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
	{
		"type": "web",
		"url": "https://www.ijcjs.com/article-detail.php?id=691",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Implementation of Defiance of a Court Order for the Optimization of Execution Implementation in the Indonesian State Administration Jurisdiction",
				"creators": [
					{
						"firstName": "Fatria",
						"lastName": "Khairo",
						"creatorType": "author"
					},
					{
						"firstName": "Firman Freaddy",
						"lastName": "Busroh",
						"creatorType": "author"
					}
				],
				"abstractNote": "Indonesia is recognized as a nation governed by the rule of law, primarily anchored in the 1945 Constitution. This foundational document places significant emphasis on fostering a peaceful society while ensuring equal rights for all citizens concerning state officials and governmental entities. Consequently, to facilitate socio-economic development within the country, the Indonesian State Administration Jurisdiction (SAJ) assumes a pivotal role. The principal objective of this study is to investigate the implementation of court order defiance as a means to enhance the efficiency of execution procedures within the Indonesian SAJ. To accomplish this aim, an extensive judicial research endeavour was undertaken, drawing data from diverse sources. The methodological approach employed for addressing the study's objectives involved content analysis. This examination elucidates that the State Administrative Court (SAC) in Indonesia holds the responsibility for adjudicating conflicts between citizens and state officials or bodies. Nevertheless, the scope of the Indonesian SAJ is expansive, emphasizing the integration of innovation and advanced technology for the effective execution of its mandates. The Indonesian SAJ confronts several challenges, including issues related to transparency, suboptimal decision-making processes, and bureaucratic inefficiencies. Additionally, the adverse impact of \"Law No. 51/2009\" on execution procedures is evident. These challenges have the potential to influence the socio-economic development of the populace. To surmount these obstacles, the implementation of court order defiance and the infusion of principles of good governance within the judicial system are considered indispensable. Such measures can facilitate efficient decision-making processes and elevate transparency levels. The study culminates with a set of vital recommendations aimed at optimizing execution procedures within the Indonesian SAJ.",
				"libraryCatalog": "ubtue_IJCJS",
				"url": "https://www.ijcjs.com/article-detail.php?id=691",
				"attachments": [],
				"tags": [
					{
						"tag": "Defiance"
					},
					{
						"tag": "Execution Implementation"
					},
					{
						"tag": "Indonesia"
					},
					{
						"tag": "State Administration Jurisdiction"
					},
					{
						"tag": "State Administrative Court"
					},
					{
						"tag": "Transparency"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
