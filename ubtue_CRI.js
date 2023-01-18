{
	"translatorID": "4c47c44a-08fd-49c8-b2b0-478cd3d5cabe",
	"label": "ubtue_CRI",
	"creator": "Helena Nebel",
	"target": "civicresearchinstitute.com/online/article(_abstract)?.php",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-12 16:47:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
	
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

var ISSN = "";

function detectWeb(doc, url) {
	if (/\/article.php/.test(url) && getSearchResults(doc, url))
		return "multiple";
	else if (/\/article_abstract.php/.test(url))
		return "journalArticle";
}

function getSearchResults(doc) {
	if (ZU.xpathText(doc, '//p').match(/ISSN\s+[\dXx-]{8,9}/)) ISSN = ZU.xpathText(doc, '//p').match(/ISSN\s+([\dXx-]{8,9})/)[1];
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, '//a[@class="article_title"]');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}



function scrape(doc, url) {
	item = new Zotero.Item("journalArticle");
	if (ZU.xpathText(doc, '//h1[@class="abstract-heading"]')) {
		item.title = ZU.xpathText(doc, '//h1[@class="abstract-heading"]');
	}
	for ( let p of ZU.xpath(doc, '//p[@class="txt_authinfo"]')) {
		if (ZU.xpathText(p, './strong[contains(., "Author")]')) {
			let creatorString = ZU.xpathText(p, './em').replace(/&nbsp;/g, ' ').trim();
			for (let cre of creatorString.split(/\.[;]/)) {
				item.creators.push(ZU.cleanAuthor(cre.replace(/\.$/g, ''), 'author'))
			}
		}
		if (ZU.xpathText(p, './strong[contains(., "Source")]')) {
			let issuedInformation = p.textContent.replace(/\n+|\t+|\s+/g, ' ')
			if (issuedInformation.match(/Volume \d+, Number \d+, [^\s]+ \d{4} , pp.\d+(?:-\d+)?\(/)) {
				item.volume = issuedInformation.match(/Volume (\d+), Number \d+, [^\s]+ \d{4} , pp.\d+(?:-\d+)?\(/)[1];
				item.issue = issuedInformation.match(/Volume \d+, Number 0*(\d+), [^\s]+ \d{4} , pp.\d+(?:-\d+)?\(/)[1];
				item.date = issuedInformation.match(/Volume \d+, Number \d+, [^\s]+ (\d{4}) , pp.\d+(?:-\d+)?\(/)[1];
				item.pages = issuedInformation.match(/Volume \d+, Number \d+, [^\s]+ \d{4} , pp.(\d+(?:-\d+)?)\(/)[1];
			}
		}
	}
	let abstractText = ZU.xpathText(doc, '//div[@id="abstract"]');
	if (abstractText) {
		item.abstractNote = abstractText.replace(/Abstract:/g, '').trim();
	}
	
	if (ZU.xpathText(doc, '//div[@id="info"]')) {
		for (let info of ZU.xpathText(doc, '//div[@id="info"]').split(/\n/)) {
			if (info.match(/keywords:/i)) {
				for (let tag of info.replace(/keywords:/i, '').split(/\s*;\s*/)) {
					if (!item.tags.includes(tag.trim())) {
						item.tags.push(tag.trim());
					}
				}
			}
		}
	}
	item.attachments = [];
	item.ISSN = ISSN;
	switch(item.ISSN) {
		case "1043-500X":
		item.publicationTitle = "Journal of Offender Monitoring";
	}
	item.url = url;
	item.complete();
}

function doWeb(doc, url) {
	Z.debug(detectWeb(doc, url));
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else
		scrape(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/3/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Spirit of Methodism: Missionary Zeal and the Gift of an Evangelist",
				"creators": [
					{
						"firstName": "Philip",
						"creatorType": "author",
						"lastName": "Meadows"
					}
				],
				"date": "2019-01-01",
				"DOI": "10.7252/Journal.01.2019S.02",
				"ISSN": "2375-6330",
				"abstractNote": "The church does not need more vital congregations, but rather a few vital Christians, whose vitality is not measured in terms of institutional effectiveness, but by missionary zeal. This zeal is a hungering and thirsting for just one thing: the glory of God and the salvation of souls. It cannot be manufactured, but can only be caught from those who have been gifted by the Spirit to continue the charism of their founder, and fanned into flame. Without this type of Christian, there is no movement, and there is no Methodism. John Welsey's most important legacy was not his doctrine or his discipline but a movement of zealous preachers and people who put flesh on the way of scriptural holiness. This paper explores the nature of that legacy and the spiritual zeal it fostered. This paper concludes that this same \"spirit\" is available to all who would commit to the doctrine and discipline of the Methodist movement. A version of this paper was delivered before the faculty of Asbury Theological Seminary to conclude the formal installation of the author in the Sundo Kim Chair of Evangelism on December 4, 2018.",
				"issue": "1",
				"libraryCatalog": "Asbury Journal",
				"pages": "8-38",
				"publicationTitle": "The Asbury Journal",
				"shortTitle": "The Spirit of Methodism",
				"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/3",
				"volume": "74",
				"attachments": [
					{}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/9/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Growing Up in America's Segregated South: Reminiscences and Regrets",
				"creators": [
					{
						"firstName": "Mark",
						"creatorType": "author",
						"lastName": "Elliott"
					}
				],
				"date": "2019-01-01",
				"DOI": "10.7252/Journal.01.2019S.08",
				"ISSN": "2375-6330",
				"abstractNote": "In this personal essay, originally given as an address delivered at the Sakharov Center, a human rights NGO in Moscow, Russia, on June 2, 2017, the author contemplates a lifetime of experience in the Southern United States and the prejudices and racism that he saw during that time. He relates these experiences to similar issues in Russia today, adding a Christian plea for equality and fair treatment for all people by the Christian community, and also calling on the Church to stand in opposition to racism and anti-Semitism wherever it appears.",
				"issue": "1",
				"libraryCatalog": "Asbury Journal",
				"pages": "157-170",
				"publicationTitle": "The Asbury Journal",
				"shortTitle": "Growing Up in America's Segregated South",
				"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/9",
				"volume": "74",
				"attachments": [
					{}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/12/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Book Reviews",
				"creators": [
					{
						"firstName": "Timothy",
						"creatorType": "author",
						"lastName": "Christian"
					},
					{
						"firstName": "David",
						"lastName": "Nonnenmacher",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Tavey",
						"creatorType": "author"
					},
					{
						"firstName": "Matthias",
						"lastName": "Gergan",
						"creatorType": "author"
					},
					{
						"firstName": "Matthew",
						"lastName": "Haugen",
						"creatorType": "author"
					},
					{
						"firstName": "Zachariah",
						"lastName": "Motts",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Frazier",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Danielson",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Wright",
						"creatorType": "author"
					},
					{
						"firstName": "Christopher",
						"lastName": "Ashley",
						"creatorType": "author"
					},
					{
						"firstName": "Scott",
						"lastName": "Donahue-Martens",
						"creatorType": "author"
					}
				],
				"date": "2019-01-01",
				"DOI": "10.7252/Journal.01.2019S.11",
				"ISSN": "2375-6330",
				"issue": "1",
				"libraryCatalog": "Asbury Journal",
				"pages": "221-229",
				"publicationTitle": "The Asbury Journal",
				"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/12",
				"volume": "74",
				"attachments": [
					{}
				],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/8/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "African Christians or Christian Africans: Byang H. Kato and his Contextual Theology",
				"creators": [
					{
						"firstName": "Sochanngam",
						"creatorType": "author",
						"lastName": "Shirik"
					}
				],
				"date": "2019-01-01",
				"DOI": "10.7252/Journal.01.2019S.07",
				"ISSN": "2375-6330",
				"abstractNote": "Byang Henry Kato, a promising African Christian leader, passed away in 1975 at only 39 years of age. In spite of his brief career, he has left his imprint on the pages of African Christian history. He is not without his supporters and critics alike. It appears that while his critics have misunderstood him in some aspects, his supporters have not paid enough attention to his theological conviction and articulation. While this article aims at clarifying some of Kato's conviction, it also informs readers how, regardless of context and time, others can appreciate, learn, and even adopt some aspects of his contextual model. The writer, an Asian living more than forty years apart from Kato, argues that Kato was indeed an evangelical leader whose theological conviction and model cannot be confined merely to a past era.",
				"issue": "1",
				"libraryCatalog": "Asbury Journal",
				"pages": "131-156",
				"publicationTitle": "The Asbury Journal",
				"shortTitle": "African Christians or Christian Africans",
				"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/8",
				"volume": "74",
				"attachments": [
					{}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss2/3/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Theme of Mission in Matthew’s Gospel From the Perspective of the Great Commission",
				"creators": [
					{
						"firstName": "David",
						"creatorType": "author",
						"lastName": "Bauer"
					}
				],
				"date": "2019-01-01",
				"DOI": "10.7252/Journal.02.2019F.02",
				"ISSN": "2375-6330",
				"issue": "2",
				"libraryCatalog": "Asbury Journal",
				"pages": "240-276",
				"publicationTitle": "The Asbury Journal",
				"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss2/3",
				"volume": "74",
				"attachments": [
					{}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss2/12/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "From the Archives: Leander Lycurgus Pickett- Hymns, Holiness, and Wilmore",
				"creators": [
					{
						"firstName": "Robert",
						"creatorType": "author",
						"lastName": "Danielson"
					}
				],
				"date": "2019-01-01",
				"DOI": "10.7252/Journal.02.2019F.11",
				"ISSN": "2375-6330",
				"issue": "2",
				"libraryCatalog": "Asbury Journal",
				"pages": "445-456",
				"publicationTitle": "The Asbury Journal",
				"shortTitle": "From the Archives",
				"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss2/12",
				"volume": "74",
				"attachments": [
					{}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss2/7/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Capital of Methodism: The New York Station: 1800-1832",
				"creators": [
					{
						"firstName": "Philip",
						"creatorType": "author",
						"lastName": "Hardt"
					}
				],
				"date": "2019-01-01",
				"DOI": "10.7252/Journal.02.2019F.06",
				"ISSN": "2375-6330",
				"issue": "2",
				"libraryCatalog": "ubtue_Asbury Journal",
				"pages": "347-368",
				"publicationTitle": "The Asbury Journal",
				"shortTitle": "The Capital of Methodism",
				"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss2/7",
				"volume": "74",
				"attachments": [
					{}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/3/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Spirit of Methodism: Missionary Zeal and the Gift of an Evangelist",
				"creators": [
					{
						"firstName": "Philip",
						"creatorType": "author",
						"lastName": "Meadows"
					}
				],
				"date": "2019-01-01",
				"DOI": "10.7252/Journal.01.2019S.02",
				"ISSN": "2375-6330",
				"abstractNote": "The church does not need more vital congregations, but rather a few vital Christians, whose vitality is not measured in terms of institutional effectiveness, but by missionary zeal. This zeal is a hungering and thirsting for just one thing: the glory of God and the salvation of souls. It cannot be manufactured, but can only be caught from those who have been gifted by the Spirit to continue the charism of their founder, and fanned into flame. Without this type of Christian, there is no movement, and there is no Methodism. John Welsey's most important legacy was not his doctrine or his discipline but a movement of zealous preachers and people who put flesh on the way of scriptural holiness. This paper explores the nature of that legacy and the spiritual zeal it fostered. This paper concludes that this same \"spirit\" is available to all who would commit to the doctrine and discipline of the Methodist movement. A version of this paper was delivered before the faculty of Asbury Theological Seminary to conclude the formal installation of the author in the Sundo Kim Chair of Evangelism on December 4, 2018.",
				"issue": "1",
				"libraryCatalog": "ubtue_Asbury Journal",
				"pages": "8-38",
				"publicationTitle": "The Asbury Journal",
				"shortTitle": "The Spirit of Methodism",
				"url": "https://place.asburyseminary.edu/asburyjournal/vol74/iss1/3",
				"volume": "74",
				"attachments": [
					{}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
