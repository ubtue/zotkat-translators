{
	"translatorID": "bf64f8a7-89b4-4a79-ae80-70630e428f35",
	"label": "ubtue_Sciendo",
	"creator": "Madeesh Kannan, Timotheus Kim",
	"target": "sciendo\\.com/(view/journals|issue/|article/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-10-29 14:58:50"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

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
	if (url.match(/issue/)) {
		return "multiple";
	} else if (url.match(/article/)) {
		return "journalArticle";
	}
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let jsonData = JSON.parse(ZU.xpathText(doc, '//script[@id="__NEXT_DATA__"]'));
	rows = jsonData?.props?.pageProps?.product?.articleList;
	if (!rows) {
		rows = jsonData?.props?.pageProps?.product?.articles;
	}
	
	for (let row of rows) {
		let href = "https://www.doi.org/" + row.doi;
		let title = ZU.unescapeHTML(row.title);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		let jsonData = JSON.parse(ZU.xpathText(doc, '//script[@id="__NEXT_DATA__"]'));
		let articleData = jsonData?.props?.pageProps?.product?.articleData;

		i.title = ZU.unescapeHTML(articleData?.title?.en);

		i.publicationTitle = jsonData?.props?.pageProps?.product?.journalData?.title ?? '';

		if (jsonData?.props?.pageProps?.product?.licenseType === "OpenAccess") {
			i.notes.push('LF:');
		}
		if (!i.notes) {
			if (articleData?.permissions?.license["license-type"] == "open-access") {
				i.notes.push('LF:');
			}
		}

		i.abstractNote = ZU.unescapeHTML(articleData?.abstractContent?.en ?? '');
		if (!i.abstractNote) {
			i.abstractNote = ZU.xpathText(doc, '//section[@class="abstract"]//p');
			if (i.abstractNote != null) i.abstractNote = i.abstractNote.replace(/Abstract\n/, '');
		}

		let issnArray = jsonData?.props?.pageProps?.product?.journalData?.eIssn;
		if (Array.isArray(issnArray) && issnArray.length > 0) {
			i.ISSN = issnArray[0];
		} 
		if (!i.ISSN) {
			i.ISSN = ZU.xpathText(doc, '//dl[@class="onlineissn"]//dd |//*[contains(concat( " ", @class, " " ), concat( " ", "onlineissn", " " )) and contains(concat( " ", @class, " " ), concat( " ", "text-metadata-value", " " ))]');
			if (i.ISSN) {
				i.ISSN = i.ISSN.trim();
			}
		}

		for (let keyword of articleData.keywords) {
			i.tags.push(keyword);
		}
		if (!i.tags) {
			for (let keyword of ZU.xpath(doc, '//ul[contains(@class, "Article_keywords-list")]/li')) {
				i.tags.push(keyword.textContent);
			}
		}

		if (i.title.match(/^book\s+reviews?|buchrezension(?:en)?|isbn:?\s+[\d\-x]+/i)) {
			i.tags.push("RezensionstagPica");
		}
		
		i.attachments = [];
		i.complete();
	});
	translator.translate();
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
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else
		invokeEmbeddedMetadataTranslator(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://sciendo.com/issue/EJSTA/39/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.sciendo.com/article/10.2478/ejsta-2021-0001",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Pantheistic versus Participatory Christologies: A Critical Analysis of Richard Rohr’s Universal Christ in Light of Thomas Aquinas’s Commentary on John",
				"creators": [
					{
						"firstName": "Michael A.",
						"lastName": "Dauphinais",
						"creatorType": "author"
					}
				],
				"date": "2021/11/01",
				"DOI": "10.2478/ejsta-2021-0001",
				"ISSN": "2657-3555",
				"abstractNote": "This essay will present Richard Rohr’s central claims about Jesus Christ and the presence of God in creation and then consider them in light of Aquinas’s teachings with particular attention to his Commentary on John. This essay attempts to show that Rohr’s claims are incomplete and ultimately misguided and that Aquinas’s participatory account of creation and the Incarnation allows him to cultivate an awareness of God’s presence in all of creation while also maintaining the salvific uniqueness of the Incarnation.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "www.sciendo.com",
				"pages": "1-23",
				"publicationTitle": "European Journal for the Study of Thomas Aquinas",
				"shortTitle": "Pantheistic versus Participatory Christologies",
				"url": "https://www.sciendo.com/article/10.2478/ejsta-2021-0001",
				"volume": "39",
				"attachments": [],
				"tags": [
					{
						"tag": "Christology"
					},
					{
						"tag": "Richard Rohr"
					},
					{
						"tag": "Thomas Aquinas"
					},
					{
						"tag": "incarnation"
					},
					{
						"tag": "pantheism"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sciendo.com/article/10.2478/ejsta-2021-0005",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Book reviews",
				"creators": [
					{
						"firstName": "Pim",
						"lastName": "Valkenberg",
						"creatorType": "author"
					},
					{
						"firstName": "Dennis",
						"lastName": "Bray",
						"creatorType": "author"
					},
					{
						"firstName": "Patrick Auer",
						"lastName": "Jones",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Torrijos",
						"creatorType": "author"
					},
					{
						"firstName": "Piotr",
						"lastName": "Roszak",
						"creatorType": "author"
					},
					{
						"firstName": "Saša",
						"lastName": "Horvat",
						"creatorType": "author"
					},
					{
						"firstName": "Michał",
						"lastName": "Zembrzuski",
						"creatorType": "author"
					},
					{
						"firstName": "Jörgen",
						"lastName": "Vijgen",
						"creatorType": "author"
					},
					{
						"firstName": "Gaven",
						"lastName": "Kerr",
						"creatorType": "author"
					}
				],
				"date": "2021/11/01",
				"DOI": "10.2478/ejsta-2021-0005",
				"ISSN": "2657-3555",
				"abstractNote": "Sciendo provides publishing services and solutions to academic and professional organizations and individual authors. We publish journals, books, conference proceedings and a variety of other publications.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "www.sciendo.com",
				"pages": "79-99",
				"publicationTitle": "European Journal for the Study of Thomas Aquinas",
				"url": "https://www.sciendo.com/article/10.2478/ejsta-2021-0005",
				"volume": "39",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://sciendo.com/issue/PERC/19/3",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.sciendo.com/article/10.2478/perc-2021-0016",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Doubting the Quran, the Hadith, and Muhammad’s Splitting of the Moon: A Probabilistic Refutation of One of Islam’s Most Striking Miraculous Claims",
				"creators": [
					{
						"firstName": "Raphael",
						"lastName": "Lataster",
						"creatorType": "author"
					}
				],
				"date": "2021/07/01",
				"DOI": "10.2478/perc-2021-0016",
				"ISSN": "2284-7308",
				"abstractNote": "Having spent many years engaging with Christian claims about miracles, especially the purported resurrection of Jesus, I now shift attention to Islamic miracle claims, the most striking of which seems to me to be Muhammad’s alleged splitting of the moon. I explain, in a Bayesian fashion, why this almost certainly did not happen.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.sciendo.com",
				"pages": "39-47",
				"publicationTitle": "Perichoresis",
				"shortTitle": "Doubting the Quran, the Hadith, and Muhammad’s Splitting of the Moon",
				"url": "https://www.sciendo.com/article/10.2478/perc-2021-0016",
				"volume": "19",
				"attachments": [],
				"tags": [
					{
						"tag": "Apologetics"
					},
					{
						"tag": "Islam"
					},
					{
						"tag": "Miracles"
					},
					{
						"tag": "Muhammad’s splitting of the moon"
					},
					{
						"tag": "Quran"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sciendo.com/article/10.2478/perc-2021-0022",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "On Roach’s Presuppositional Response to Licona’s New Historiographical Approach",
				"creators": [
					{
						"firstName": "Jacobus",
						"lastName": "Erasmus",
						"creatorType": "author"
					},
					{
						"firstName": "Michael R.",
						"lastName": "Licona",
						"creatorType": "author"
					}
				],
				"date": "2021/12/01",
				"DOI": "10.2478/perc-2021-0022",
				"ISSN": "2284-7308",
				"abstractNote": "In a recent article, William C. Roach (2019) offers a presuppositional critique, which is inspired by Carl F. H. Henry, of Michael R. Licona’s (2010) so-called New Historiographical Approach (NHA) to defending the resurrection. More precisely, Roach attempts to defend six key theses, namely, that (1) the NHA is an evidentialist approach, (2) the NHA is a deductive argument, (3) the NHA is an insufficient approach, (4) believers and unbelievers share no common ground, (5) the NHA does not embrace a correspondence theory of truth, and (6) the presupposition of divine revelation is necessary for apologetics. We respond to each of Roach’s arguments, respectively.",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "www.sciendo.com",
				"pages": "21-33",
				"publicationTitle": "Perichoresis",
				"url": "https://www.sciendo.com/article/10.2478/perc-2021-0022",
				"volume": "19",
				"attachments": [],
				"tags": [
					{
						"tag": "Michael R. Licona"
					},
					{
						"tag": "New Historiographical Approach"
					},
					{
						"tag": "William C. Roach"
					},
					{
						"tag": "evidentialism"
					},
					{
						"tag": "presuppositionalism"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
