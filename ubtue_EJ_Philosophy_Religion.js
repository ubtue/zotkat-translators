{
	"translatorID": "ac3d1c3a-25fc-43a1-b380-b5922cbc528a",
	"label": "ubtue_EJ_Philosophy_Religion",
	"creator": "Mara Spieß",
	"target": "https://www.philosophy-of-religion.eu/(article|volume)-view",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-05 13:13:49"
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
	if (url.includes('/article-view')) {
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
	var rows = doc.querySelectorAll('h2 > a.js-card-link[href*="article-view"]');
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
	item.url = url;
	item.ISSN = "1689-8311";

	let titleElement = doc.querySelector('div.entry__article > h3');
	if (titleElement) {
		item.title = ZU.capitalizeTitle(titleElement.textContent, true);

		let node = titleElement.nextElementSibling;
		while (
			node &&
			node.tagName === "P" &&
			node.querySelector("b")?.textContent.trim() !== "DOI:"
		) {
			let author = node.querySelector("b")?.textContent.trim();
			if (author) {
				item.creators.push(ZU.cleanAuthor(author, "author", false));
			}
			node = node.nextElementSibling;
		}
	}

	item.DOI = doc.querySelector('a[href*="doi.org/10."]')?.textContent;
	
	item.abstractNote = doc.querySelector('div.intro')?.textContent?.replace(/abstract|\t/gi, '');

	keywords = ZU.xpathText(doc, "//p[b[normalize-space()='Keywords:']]");
	if (keywords) {
		keywords = keywords.replace(/Keywords:\s*|\n/g, "").trim().split(/\s*[;,]\s*/);
		keywords.forEach(keyword => {
			item.tags.push(keyword);
		})
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.philosophy-of-religion.eu/article-view.php?id=4440",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Philosophical Reflections on the Interplay of Music and Religious Beliefs: European Sacred Music in Intercultural Education",
				"creators": [
					{
						"firstName": "Xitong",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Chenyang",
						"lastName": "Wang",
						"creatorType": "author"
					}
				],
				"DOI": "https://doi.org/10.24204/ejpr.2025.4440",
				"ISSN": "1689-8311",
				"abstractNote": "The study of the emotion-inducing function of music education is an important part of the basic theoretical research of music education, which influences the positioning of the basic nature and value attributes of music education, and at the same time, it also plays a practical role in the teaching practice of music education. In this paper, music education plays the role of “healthy psychology” with the help of the characteristic of “emotionality”. It takes music as a means of inducing individual emotions, and explores the ways of inducing and measuring emotions in specific music emotion-inducing operations. In the experimental process of inducing emotions by European religious music, the non-linear and non-smooth EEG signals were decomposed into a series of eigenmodal functions with different oscillation frequencies using the empirical modal decomposition adaptively. Then, multi-dimensional information such as waveform difference, phase difference, and normalized energy of the eigenmodal functions are extracted as emotional features. Based on the extracted features, SVM is utilized for emotion recognition. In terms of the mean values of emotion evoking intensity of religious music, “sense of calm” (M=5.51) evoked the highest intensity, followed by “sense of transcendence” (M=5.4). “Nostalgia” (M=5.13) evoked a slightly weaker intensity, and ‘Power’ (M=4.26) had the lowest intensity, while religious music evoked significantly more emotions than secular music (p<0.05). This study provides an important foundation and theoretical support for the application of European religious music to cross-cultural music education based on endogenous emotion analysis of EEG.",
				"libraryCatalog": "ubtue_EJ_Philosophy_Religion",
				"shortTitle": "Philosophical Reflections on the Interplay of Music and Religious Beliefs",
				"url": "https://www.philosophy-of-religion.eu/article-view.php?id=4440",
				"attachments": [],
				"tags": [
					{
						"tag": "EEG Signal"
					},
					{
						"tag": "Emotion Evocation"
					},
					{
						"tag": "Empirical Modal Decomposition"
					},
					{
						"tag": "Music Education"
					},
					{
						"tag": "SVM"
					},
					{
						"tag": "Sign Modal Function"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
