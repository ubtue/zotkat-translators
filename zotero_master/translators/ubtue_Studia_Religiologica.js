{
	"translatorID": "f85e91df-65fa-412a-8f46-67ea367a5b65",
	"label": "ubtue_Studia_Religiologica",
	"creator": "Timotheus Kim",
	"target": "https://www.ejournals.eu/Studia-Religiologica/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-05-18 08:33:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Universitätsbibliothek Tübingen All rights reserved.

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
	if (url.includes('/art/')) return "journalArticle";
		else if (getSearchResults(doc, true)) return "multiple";
	return false;
}

function getSearchResults(doc, checkOnly) {
  let items = {};
  let found = false;
  let rows = doc.querySelectorAll('.title');
  for (let row of rows) {
	let href = row.href;
	let title = ZU.trimInternal(row.textContent)
	if (!href || !title) continue;
	if (checkOnly) return true;
	found = true;
	items[href] = title;
  }
  return found ? items : false;
}

function extractVolumeIssue(doc, item, volumeIssueEntry) {
	var issueVolume = volumeIssueEntry.match(/(?:tom|volume)\s+(\d+)(?:.*(?:numer|issue)\s+(\d+))?/i);
	item.issue = '';
	if (issueVolume === null) {
		if (volumeIssueEntry.match(/\d+/)) {
			item.volume = volumeIssueEntry.match(/\d+/)[0];
		}
	}
	else {
		item.volume = issueVolume[1];
		if (typeof issueVolume[2] != 'undefined') {
			item.issue = issueVolume[2];
		}
	}
}

function getAbstractAndKeywords(item, doc) {
	var keyWords = [];
	var keyWordTag = ZU.xpath(doc, '//meta[@name="keywords"]')[0].content;
	item.tags = keyWordTag.split(/, |; /);
	let pTags = ZU.xpath(doc, '//div[@class="abstract-text"]//div[@class="text input-text"][1]/p');
	item.abstractNote = ''
	for (let entry in pTags) {
				var newAbstract = pTags[entry].innerHTML.trim();
				if (newAbstract.length > item.abstractNote.length) {
				item.abstractNote = ZU.cleanTags(newAbstract);
			}
			}
	item.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	Z.debug(url);
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (t, item) {
		let checkLanguage = ZU.xpathText(doc, '(//div[@class="abstract-text"]//div[@class="text input-text"]//p//strong)[1]');
		if (checkLanguage === null) item.language = 'en';
		let volumeIssueEntry = ZU.xpathText(doc, '//meta[@name="citation_issue"]/@content');
		extractVolumeIssue(doc, item, volumeIssueEntry);
		getAbstractAndKeywords(item, doc);
		});
	translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ejournals.eu/Studia-Religiologica/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.ejournals.eu/Studia-Religiologica/2020/Numer-53-4-2020/art/18055/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Postawa męstwa bycia – odpowiedź dana nie tylko Hamletowi",
				"creators": [
					{
						"firstName": "Marcin",
						"lastName": "Hintz",
						"creatorType": "author"
					},
					{
						"firstName": "Maria",
						"lastName": "Urbańska-Bożek",
						"creatorType": "author"
					}
				],
				"date": "2020/12/1",
				"DOI": "10.4467/20844077SR.20.019.13037",
				"ISSN": "2084-4077",
				"abstractNote": "The article comprises an analysis of the concept of&nbsp; “courage” as an ontological and ethical principle, constituting the chief category in the philosophical theology of Paul Tillich, called “the philosopher of borderlands,” regarded as the most important thinker in the Protestant, liberal theology of the 20th century. In his philosophical theology or theological philosophy the notion of “courage to be” provides an essential point of reference in the context of spiritual development of the human individual, as well as revealing possibilities of giving sense to being, which appears itself to man as devoid of sense. In the first part, the concept of “courage to be” is itself subjected to analysis as the ontological and the ethical principle. According to Tillich, the existentially (ethically) oriented being constituted a step in the individual’s life, which is already connected with conscious life and self-affirmation. The second part discusses Tillich’s understanding of faith as the “to be or not to be” of human existence. The author of Dynamics of Faith says that the courage to be can be expressed either in individuation, that is, in the personal relationship and encounter with God, which represents the existentialist approach, or by means of participation in God’s power. Tillich proclaims that only the virtue of courage can overcome the anxiety arising from lack of sense and from doubt, which is characteristic of human life.",
				"archiveLocation": "World",
				"issue": "4",
				"language": "pl",
				"libraryCatalog": "www.ejournals.eu",
				"pages": "275-287",
				"publicationTitle": "Studia Religiologica",
				"url": "https://www.ejournals.eu/Studia-Religiologica/2020/Numer-53-4-2020/art/18055/",
				"volume": "53",
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
						"tag": "Paul Tillich"
					},
					{
						"tag": "Paul Tillich"
					},
					{
						"tag": "anxiety"
					},
					{
						"tag": "courage"
					},
					{
						"tag": "despair"
					},
					{
						"tag": "egzystencja"
					},
					{
						"tag": "ethical principle"
					},
					{
						"tag": "existence"
					},
					{
						"tag": "faith"
					},
					{
						"tag": "lęk"
					},
					{
						"tag": "męstwo"
					},
					{
						"tag": "ontological principle"
					},
					{
						"tag": "rozpacz"
					},
					{
						"tag": "wiara"
					},
					{
						"tag": "zasada etyczna"
					},
					{
						"tag": "zasada ontologiczna"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
