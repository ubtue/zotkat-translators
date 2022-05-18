{
	"translatorID": "4ccf849b-f9e9-4cec-9bae-7c10aa4dea53",
	"label": "ubtue_University of Toronto Press",
	"creator": "Madeesh Kannan",
	"target": "^https?://(www\\.)?utpjournals\\.press/(doi|toc)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-31 14:53:46"
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

var openAccesArticles = [];

function detectWeb(doc, url) {
	if (url.match(/\/toc\//))
		return "multiple";
	else if (url.match(/\/doi\//)) {
		// placeholder, actual type determined by the embedded metadata translator
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="art_title linkable"]/a');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	for (let tag of ZU.xpath(doc, '//table[@class="articleEntry"]')) {
		if (ZU.xpathText(tag, './/img[@title="Open Access"]/@title') != null) {
			openAccesArticles.push(ZU.xpathText(tag, './/div[@class="art_title linkable"]/a/@href'));
		}
	}
	return found ? items : false;
}


function postProcess(doc, item) {
	var volIssue = ZU.xpathText(doc, '//div[@class="journalNavTitle"]');
	var page = ZU.xpathText(doc, '//span[@class="articlePageRange"]');

	if (!item.volume && (match = volIssue.match(/Volume\s(\d+)/)))
		item.volume = match[1];
	if (!item.issue && (match = volIssue.match(/Issue\s(\d+)/)))
		item.issue = match[1];
	if (!item.pages && (match = page.match(/^pp\.\s(\d+-\d+)/)))
		item.pages = match[1];

	let abstract = ZU.xpathText(doc, '//div[contains(@class, "abstractInFull")]//p');
	if (abstract != null) {
	if (!item.abstractNote)
		item.abstractNote = abstract;
	else if (item.abstractNote.length < abstract.length)
		item.abstractNote = abstract;
	}

	let keywords = ZU.xpath(doc, '//kwd-group//a');
	if (keywords)
		item.tags = keywords.map(function(x) { return x.textContent.trim(); })
	
	if (!item.DOI) item.DOI = ZU.xpathText(doc, '//meta[@name="dc.Identifier" and @scheme="doi"]/@content');
	if (ZU.xpathText(doc, '//meta[@name="dc.Type"]/@content') == "book-review")  item.tags.push("RezensionstagPica");
	let publicationTitle = ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content');
	item.ISSN  = mapTitleIssn(publicationTitle); //Z.debug(item.ISSN)
	if (openAccesArticles.includes(item.url.replace("https://www.utpjournals.press", ""))) {
		item.notes.push('LF:');
	}
	item.complete();
}

function mapTitleIssn(OutputFromPubicationTitle) {
	// add mapping if issn is missing on website
	let publicationTitleToIssn = {
	'The Journal of Religion and Popular Culture' : '1703-289X',
	'Toronto Journal of Theology' : '1918-6371',
	}
	issn = publicationTitleToIssn[OutputFromPubicationTitle];
	return issn;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
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
		"url": "https://utpjournals.press/doi/full/10.3138/tjt-2020-0003",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Quantum Mechanics and Salvation: A New Meeting Point for Science and Theology",
				"creators": [
					{
						"firstName": "Emily",
						"lastName": "Qureshi-Hurst",
						"creatorType": "author"
					}
				],
				"date": "2020-07-02",
				"DOI": "10.3138/tjt-2020-0003",
				"ISSN": "1918-6371",
				"abstractNote": "Video Abstract Quantum Mechanics and Salvation: A New Meeting Point for Science and Theology Quantum mechanics has recently indicated that temporal order is not always fixed, a finding that has far-reaching philosophical and theological implications. The phenomena, termed “indefinite causal order,” shows that events can be in a superposition with regard to their order. In the experimental setting with which this article is concerned, two events, A and B, were shown to be in the ordering relations “A before B” and “B before A” at the same time. This article introduces an ongoing project that seeks to make sense of this result, with a particular focus on the methodology by which this research will be undertaken. Specific research questions, particularly regarding what indefinite causal order might mean for the metaphysics of time and the doctrine of salvation, are introduced. The collaborative approach detailed brings together the disciplinary skills of a working scientist and a working theologian. What is offered is a collaborative methodology for interaction between science and religion that is more than the sum of its parts. Alister McGrath’s idea of multiple rationalities is employed as an epistemological framework within which this research takes place. Within an epistemologically pluralistic model, collaborative efforts are not only encouraged but necessary. Complex reality requires an equally complex, usually interdisciplinary, explanation. I argue that such dialogue is both theologically justified and culturally valuable and indicates the direction in which this research will be taken.",
				"archiveLocation": "world",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "utpjournals.press",
				"pages": "3-13",
				"publicationTitle": "Toronto Journal of Theology",
				"rights": "Toronto Institute of Theology 2019",
				"shortTitle": "Quantum Mechanics and Salvation",
				"url": "https://utpjournals.press/doi/full/10.3138/tjt-2020-0003",
				"volume": "36",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "indefinite causal order"
					},
					{
						"tag": "philosophy of time"
					},
					{
						"tag": "quantum mechanics"
					},
					{
						"tag": "salvation"
					},
					{
						"tag": "science and religion"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.utpjournals.press/doi/full/10.3138/jrpc.2017-0034",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Shift in Mithya: An Implication of Euhemerism in Amish Tripathi’s Shiva Trilogy",
				"creators": [
					{
						"firstName": "Ashna",
						"lastName": "Jacob",
						"creatorType": "author"
					},
					{
						"firstName": "Nirmala",
						"lastName": "Menon",
						"creatorType": "author"
					}
				],
				"date": "2019-12-26",
				"DOI": "10.3138/jrpc.2017-0034",
				"ISSN": "1703-289X",
				"abstractNote": "Mithya is living myth. Myth is an absence of mithya. The difference between the modern individual who expressly chooses to believe in or look for myth and aboriginal cultures still living in myth is the difference between myth and mithya. Hindu mythology is mithya and therefore remaking myth in Indian fiction is often conforming and seldom deviant. But lately Indian popular fiction has produced mythopoeic versions of its mithya. Amish Tripathi’s Shiva Trilogy is an example of this trend. Tripathi in his series demythologizes and remythologizes Lord Shiva into a revolutionary tribal chief of the Indus Valley Civilization who was elevated to divinity over time. Such a euhemeristic deliverance transcribes a polytheistic deity as apotheosis. This mythopoeic version, although unorthodox, is produced and consumed in popular fiction. Such popular production and consumption of an alternate mythopoeia in spite of an extant mithya predicates a shift in mithya.",
				"archiveLocation": "world",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.utpjournals.press",
				"pages": "196-207",
				"publicationTitle": "The Journal of Religion and Popular Culture",
				"rights": "© University of Toronto Press",
				"shortTitle": "A Shift in Mithya",
				"url": "https://www.utpjournals.press/doi/full/10.3138/jrpc.2017-0034",
				"volume": "31",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "deity"
					},
					{
						"tag": "euhemerism"
					},
					{
						"tag": "mithya"
					},
					{
						"tag": "mythopoeia"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.utpjournals.press/toc/jrpc/31/3",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.utpjournals.press/doi/full/10.3138/jrpc.2017-0068",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Charlie Brown Religion: Exploring the Spiritual Life and Work of Charles M. Schulz",
				"creators": [
					{
						"firstName": "John W.",
						"lastName": "Auxier",
						"creatorType": "author"
					}
				],
				"date": "2019-12-26",
				"DOI": "10.3138/jrpc.2017-0068",
				"ISSN": "1703-289X",
				"archiveLocation": "world",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.utpjournals.press",
				"pages": "250-251",
				"publicationTitle": "The Journal of Religion and Popular Culture",
				"rights": "© University of Toronto Press",
				"shortTitle": "A Charlie Brown Religion",
				"url": "https://www.utpjournals.press/doi/full/10.3138/jrpc.2017-0068",
				"volume": "31",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://utpjournals.press/doi/full/10.3138/tjt-2020-0085",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Between Impact Research and Rootedness in the Community",
				"creators": [
					{
						"firstName": "Gilles",
						"lastName": "Routhier",
						"creatorType": "author"
					}
				],
				"date": "2020-07-21",
				"DOI": "10.3138/tjt-2020-0085",
				"ISSN": "1918-6371",
				"abstractNote": "The race for high ranking and the search for impact risks are exhausting universities and distracting them from their original vocation. This is all the more true if we are led to eliminate all training that cannot guarantee its usefulness (understood as a contribution to growth and economic development). In this game, theology is immediately eliminated. Conceived as “useless,” it cannot manage to maintain its place in the universities, defined as a place of training for the workforce—unless we come to otherwise define the usefulness of a university discipline. Pope Francis’s proposal, in the introduction to the Apostolic Constitution Veritatis gaudium, not only argues in favour of the usefulness of theology but invites ecclesiastical studies to a radical change of paradigm if they want to play a key role in the development of a new humanism. It is this original proposal that is presented here.",
				"archiveLocation": "world",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "utpjournals.press",
				"pages": "125-137",
				"publicationTitle": "Toronto Journal of Theology",
				"rights": "Toronto Institute of Theology 2020",
				"url": "https://utpjournals.press/doi/full/10.3138/tjt-2020-0085",
				"volume": "36",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Pope Francis"
					},
					{
						"tag": "Veritatis gaudium"
					},
					{
						"tag": "impact research"
					},
					{
						"tag": "method in theology"
					},
					{
						"tag": "theology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.utpjournals.press/toc/tjt/37/2",
		"items": "multiple"
	}
]
/** END TEST CASES **/
