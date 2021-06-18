{
	"translatorID": "a5d5ca83-b975-4abe-86c9-d956d7b9c8fa",
	"label": "ubtue_Open Journal Systems Standard",
	"creator": "Timotheus Kim",
	"target": "/(article|issue)/(view)?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-08 16:02:08"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
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
	if (url.match(/\/article\/view/)) return "journalArticle"
	else if (url.match(/\/issue\/view/) && getSearchResults(doc, url)) return "multiple";
}

function getSearchResults(doc, url) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "media-heading", " " ))]//a | //*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]//a | //*[(@id = "content")]//a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent).replace(/pdf/i, '');
		let exclude = ['HTML', 'XML', 'EPUB', 'PDF'];
		if (url.match(/verbumetecclesia\.org/)) {
			if (title == "Browse Archives") continue;
			else if (exclude.includes(title)) continue;
			else if (title.match(/^Table of Contents/)) continue;
		}
		
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}



function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (doc.querySelector(".subtitle")) {
 			i.title = i.title + ' ' + doc.querySelector(".subtitle").textContent.trim();
 		}
 		//title in other language for pica-field 4002
 		var articleType = ZU.xpathText(doc, '//meta[@name="DC.Type.articleType"]/@content');
 		if (articleType === "Artículos") {
 			let dcAlternativeTitle = ZU.xpathText(doc, '//meta[@name="DC.Title.Alternative"]/@content').trim();
 			i.archiveLocation = dcAlternativeTitle;
 			if (i.archiveLocation == i.title) {
 				delete i.archiveLocation;
 			}
 		}
 		//orcid for pica-field 8910
 		
 		let checkOrcid = doc.querySelector(".orcid a");
 		if (checkOrcid) {
 			let orcidEntry = ZU.trimInternal(doc.querySelector(".authors").textContent);
 			let author = orcidEntry.split("https")[0];
 			let orcid = orcidEntry.replace(/.*(\d{4}-\d+-\d+-\d+x?)/i, '$1');
 			i.callNumber = "orcid:" + orcid + " | author=" + author + " | taken from website";
 		}
 		//fix pages
 		if (i.pages !== undefined) {
		var firstPage = ZU.xpathText(doc, '//meta[@name="citation_firstpage"]/@content');
		var lastPage = ZU.xpathText(doc, '//meta[@name="citation_lastpage"]/@content');
		var firstandlastPages = i.pages.split('-');
		if (firstandlastPages[0] === firstandlastPages[1]) i.pages = firstandlastPages[0];
 		}
		if (i.issue === "0") delete i.issue;
		if (i.abstractNote == undefined) {
			i.abstractNote = ZU.xpathText(doc, '//meta[@name="DC.Description"]/@content');
		}
		if (i.abstractNote == null) {i.abstractNote = undefined}
		if (i.abstractNote !== undefined) {
			if (i.abstractNote.match(/No abstract available/)) delete i.abstractNote;
			else if (i.abstractNote.match(/^.$/)) delete i.abstractNote;
		}
		if (i.tags[1] === undefined) delete i.tags[0];
		let tagsEntry = ZU.xpathText(doc, '//meta[@name="citation_keywords"]/@content');
		if (i.ISSN === "2413-9467" && tagsEntry) {
			tag = tagsEntry.split(/\s*,\s/);
			for (let t in tag) {
				i.tags.push(tag[t].capitalizeFirstLetter()) //alternativ .replace(/^\w/, function($0) { return $0.toUpperCase(); }))
			}
		}
		
		if (i.tags[0] === "book review") i.tags.push('RezensionstagPica') && delete i.tags[0];
		if (doc.querySelector(".current").textContent.trim() === "Book Reviews" || articleType === "Recensiones") {
			i.tags.push('RezensionstagPica') 
		}
		if (ZU.xpathText(doc, '//meta[@name="DC.Source.URI"]/@content').match(/isidorianum\/article\/view/)) {
		//multi language abstract e.g. https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147
		if (articleType === "Artículos") {
			let abstractEN = ZU.xpathText(doc, '//meta[@name="DC.Description"][1]/@content').trim();
			let abstractES = ZU.xpathText(doc, '//meta[@name="DC.Description"][2]/@content').trim();
			i.abstractNote = abstractEN + '\\n4207 ' + abstractES;
		}
		//english keywords e.g. https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147
		let dcSourceURI = ZU.xpathText(doc, '//meta[@name="DC.Source.URI"]/@content');
		let dcArticleURI = ZU.xpathText(doc, '//meta[@name="DC.Identifier.URI"]/@content');
		let switchLanguageURL = dcSourceURI + '/user/setLocale/en_US?source=/publicaciones/index.php/' + dcArticleURI.split('index.php')[1];
		ZU.processDocuments(switchLanguageURL, function (scrapeTags) {
		var tagentry = ZU.xpathText(scrapeTags, '//meta[@name="citation_keywords"]/@content');
			if (tagentry) {
				let tags = tagentry.split(/\s*,|;\s*/);
				for (let t in tags) {
				i.tags.push(tags[t]);
				}
			}
			i.complete();
		});
		}
		else
		i.complete();
	});
	translator.translate();
}

String.prototype.capitalizeFirstLetter = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc, url), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else
		invokeEMTranslator(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/article/view/1969",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“The message to the people of South Africa” in contemporary context: The question of Palestine and the challenge to the church The question of Palestine and the challenge to the church",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Braverman",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.17570/stj.2019.v5n3.a01",
				"ISSN": "2413-9467",
				"abstractNote": "In September 2018 John de Gruchy presented a paper at the Volmoed Colloquium entitled “Revisiting the Message to the people of South Africa,” in which he asks, “what is the significance of the document for our time?” In this expanded version of the author’s response to de Gruchy, two further questions are pursued: First: how can the churches today meet the challenge of today’s global system of economically and politically-driven inequality driven by a constellation of individuals, corporations, and governments? Second: in his review of church history, de Gruchy focused on the issue of church theology described in the 1985 Kairos South Africa document, in which churches use words that purport to support justice but actually serve to shore up the status quo of discrimination, inequality and racism. How does church theology manifest in the contemporary global context, and what is the remedy? The author proposes that ecumenism can serve as a mobilizing and organizing model for church action, and that active engagement in the issue of Palestine is an entry point for church renewal and for a necessary and fruitful exploration of critical issues in theology and ecclesiology.",
				"issue": "3",
				"journalAbbreviation": "STJ",
				"language": "en",
				"libraryCatalog": "ojs.reformedjournals.co.za",
				"pages": "13–40",
				"publicationTitle": "STJ | Stellenbosch Theological Journal",
				"rights": "Copyright (c) 2020 Pieter de Waal Neethling Trust, Stellenbosch",
				"shortTitle": "“The message to the people of South Africa” in contemporary context",
				"url": "https://ojs.reformedjournals.co.za/stj/article/view/1969",
				"volume": "5",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.zwingliana.ch/index.php/zwa/article/view/2516",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Geleitwort",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Oesterheld",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISSN": "0254-4407",
				"language": "en",
				"libraryCatalog": "www.zwingliana.ch",
				"pages": "VII-IX",
				"publicationTitle": "Zwingliana",
				"rights": "Authors who are published in this journal agree to the following conditions:  a) The authors retain the copyright and allow the journal to print the first publication in print as well as to make it electronically available at the end of three years.  b) The author may allot distribution of their first version of the article with additional contracts for non-exclusive publications by naming the first publication in this Journal in said publication (i.e. publishing the article in a book or other publications).",
				"url": "http://www.zwingliana.ch/index.php/zwa/article/view/2516",
				"volume": "45",
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
	},
	{
		"type": "web",
		"url": "https://jps.library.utoronto.ca/index.php/renref/article/view/34078",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Becoming “Indians”: The Jesuit Missionary Path from Italy to Asia",
				"creators": [
					{
						"firstName": "Camilla",
						"lastName": "Russell",
						"creatorType": "author"
					}
				],
				"date": "2020/04/30",
				"DOI": "10.33137/rr.v43i1.34078",
				"ISSN": "2293-7374",
				"abstractNote": "The Jesuit missions in Asia were among the most audacious undertakings by Europeans in the early modern period. This article focuses on a still relatively little understood aspect of the enterprise: its appointment process. It draws together disparate archival documents to recreate the steps to becoming a Jesuit missionary, specifically the Litterae indipetae (petitions for the “Indies”), provincial reports about missionary candidates, and replies to applicants from the Jesuit superior general. Focusing on candidates from the Italian provinces of the Society of Jesus, the article outlines not just how Jesuit missionaries were appointed but also the priorities, motivations, and attitudes that informed their assessment and selection. Missionaries were made, the study shows, through a specific “way of proceeding” that was negotiated between all parties and seen in both organizational and spiritual terms, beginning with the vocation itself, which, whether the applicant departed or not, earned him the name indiano.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "jps.library.utoronto.ca",
				"pages": "9-50",
				"publicationTitle": "Renaissance and Reformation",
				"rights": "Copyright (c)",
				"shortTitle": "Becoming “Indians”",
				"url": "https://jps.library.utoronto.ca/index.php/renref/article/view/34078",
				"volume": "43",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jps.library.utoronto.ca/index.php/renref/article/view/34078",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Becoming “Indians”: The Jesuit Missionary Path from Italy to Asia",
				"creators": [
					{
						"firstName": "Camilla",
						"lastName": "Russell",
						"creatorType": "author"
					}
				],
				"date": "2020/04/30",
				"DOI": "10.33137/rr.v43i1.34078",
				"ISSN": "2293-7374",
				"abstractNote": "The Jesuit missions in Asia were among the most audacious undertakings by Europeans in the early modern period. This article focuses on a still relatively little understood aspect of the enterprise: its appointment process. It draws together disparate archival documents to recreate the steps to becoming a Jesuit missionary, specifically the Litterae indipetae (petitions for the “Indies”), provincial reports about missionary candidates, and replies to applicants from the Jesuit superior general. Focusing on candidates from the Italian provinces of the Society of Jesus, the article outlines not just how Jesuit missionaries were appointed but also the priorities, motivations, and attitudes that informed their assessment and selection. Missionaries were made, the study shows, through a specific “way of proceeding” that was negotiated between all parties and seen in both organizational and spiritual terms, beginning with the vocation itself, which, whether the applicant departed or not, earned him the name indiano.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "jps.library.utoronto.ca",
				"pages": "9-50",
				"publicationTitle": "Renaissance and Reformation",
				"rights": "Copyright (c)",
				"shortTitle": "Becoming “Indians”",
				"url": "https://jps.library.utoronto.ca/index.php/renref/article/view/34078",
				"volume": "43",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://jsri.ro/ojs/index.php/jsri/article/view/1194",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Time as a Basic Factor of the Development of Family Relationships in Slovakia",
				"creators": [
					{
						"firstName": "Ladislav",
						"lastName": "Csontos",
						"creatorType": "author"
					},
					{
						"firstName": "Rastislav",
						"lastName": "Bednarik",
						"creatorType": "author"
					},
					{
						"firstName": "Jozef",
						"lastName": "Žuffa",
						"creatorType": "author"
					}
				],
				"date": "2020/06/26",
				"ISSN": "1583-0039",
				"abstractNote": "In the search for factors affecting the stability of marriage and family, support for the family in changing conditions of adult access to children is based on findings of its empirical research that identified selected value and religious aspects of the family. These were enriched by sociological studies of religiosity and scientific studies from the field of psychology and pedagogy. This made it possible to identify family time spent in building relationships as one of the key factors of its stability. The study also includes some aspects of religious beliefs and their implications on declared values, as well as suggestions for creation of specific pastoral plans.",
				"issue": "56",
				"language": "en",
				"libraryCatalog": "jsri.ro",
				"pages": "3-16",
				"publicationTitle": "Journal for the Study of Religions and Ideologies",
				"rights": "Both JSRI and the authors holds the copyright of all published materials. In addition, authors have the right to use all or part of their texts and abstracts for their own personal use and for their teaching purposes.   Authors have the right to use all or part of the text and abstract, in the preparation of derivative works, extension of the article into book-length or in other works, and the right to include the article in full or in part in a thesis or dissertation or books. Authors are kindly asked to provide acknowledgement of the original publication in JSRI, including the title of the article, the journal name, volume, issue number, page numbers, and year of publication.   For use in non-commercial situations there is no need for authors to apply for written permission from JSRI in advance.",
				"url": "http://jsri.ro/ojs/index.php/jsri/article/view/1194",
				"volume": "19",
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
						"tag": "Marriage"
					},
					{
						"tag": "communication"
					},
					{
						"tag": "counseling"
					},
					{
						"tag": "family"
					},
					{
						"tag": "relationship"
					},
					{
						"tag": "trust"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://jsri.ro/ojs/index.php/jsri/article/view/1212",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Eco-Religious Approach to Deforestation by Indonesian Istighosa Community",
				"creators": [
					{
						"firstName": "Wildana",
						"lastName": "Wargadinata",
						"creatorType": "author"
					},
					{
						"firstName": "Iffat",
						"lastName": "Maimunah",
						"creatorType": "author"
					},
					{
						"firstName": "Rohmani Nur",
						"lastName": "Indah",
						"creatorType": "author"
					}
				],
				"date": "2020/06/25",
				"ISSN": "1583-0039",
				"abstractNote": "This paper aims to explain the involvement of an istighosah community in environmental conservation in Indonesia. The data were obtained through the method of observing religious activities and conservation actions, interviewing the community leaders, and documenting the existence and activity of worshipers. The finding confirmed three aspects. First, the implementation of Sufism teachings is an alternative in nature conservation, not only aiming to meet the spiritual needs of pilgrims, but also fostering awareness of pilgrims to prevent damage to nature. Second, what is shown by pilgrims is very closely related to the human urge to always realize its basic capacity as a leader for nature. The forest is considered as a brother that the sustainability must be guarded, preserved, and guaranteed. Third, the teachings of Sufism become the basis for the group to act to be involved in caring for nature. This doctrine is inherited through formal media such as recitation and carried out in the form of direct action. Therefore, further studies are needed to explore the involvement of other religious organizations in the effort to conserve the environment in a sustainable manner",
				"issue": "56",
				"language": "en",
				"libraryCatalog": "jsri.ro",
				"pages": "166-178",
				"publicationTitle": "Journal for the Study of Religions and Ideologies",
				"rights": "Both JSRI and the authors holds the copyright of all published materials. In addition, authors have the right to use all or part of their texts and abstracts for their own personal use and for their teaching purposes.   Authors have the right to use all or part of the text and abstract, in the preparation of derivative works, extension of the article into book-length or in other works, and the right to include the article in full or in part in a thesis or dissertation or books. Authors are kindly asked to provide acknowledgement of the original publication in JSRI, including the title of the article, the journal name, volume, issue number, page numbers, and year of publication.   For use in non-commercial situations there is no need for authors to apply for written permission from JSRI in advance.",
				"url": "http://jsri.ro/ojs/index.php/jsri/article/view/1212",
				"volume": "19",
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
						"tag": "conservation"
					},
					{
						"tag": "deforestation"
					},
					{
						"tag": "eco-religious approach"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/article/view/1743",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The cinematic hidden Christ – His invisible divinity and his visible humanity",
				"creators": [
					{
						"firstName": "Martien E.",
						"lastName": "Brinkman",
						"creatorType": "author"
					}
				],
				"date": "2017/12/31",
				"DOI": "10.17570/stj.2017.v3n2.a13",
				"ISSN": "2413-9467",
				"abstractNote": "If we want to reflect upon the impact of the many ‘hidden Christ’-images in modern films at a theologically responsible way, we need to incorporate that reflection into our doctrine of revelation. That will imply that we have to re-open the classical Gospel-Culture discussion. Especially in the United States we can recognize a lot of original approaches to this issue in Reformed circles (Wolterstorff, Dyrness, Begbie, Seidell, etc.). The main question to be put in this article will be: How can we develop criteria to assess the depiction of the divine in these films?",
				"issue": "2",
				"journalAbbreviation": "STJ",
				"language": "en",
				"libraryCatalog": "ojs.reformedjournals.co.za",
				"pages": "299–317",
				"publicationTitle": "STJ | Stellenbosch Theological Journal",
				"rights": "Copyright (c) 2017 Pieter de Waal Neethling Trust, Stellenbosch",
				"url": "https://ojs.reformedjournals.co.za/stj/article/view/1743",
				"volume": "3",
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
						"tag": "Christology"
					},
					{
						"tag": "Hidden Christ"
					},
					{
						"tag": "Immanence"
					},
					{
						"tag": "Revelation"
					},
					{
						"tag": "Symbol"
					},
					{
						"tag": "Transcendence"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/article/view/1731",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Renewal, Renaissance, Reformation, or Revolution? Guiding concepts for social transformation in South Africa in the light of 16th century ecclesial reform and deform movements in Europe",
				"creators": [
					{
						"firstName": "Ernst M.",
						"lastName": "Conradie",
						"creatorType": "author"
					},
					{
						"firstName": "Teddy C.",
						"lastName": "Sakupapa",
						"creatorType": "author"
					}
				],
				"date": "2017/12/31",
				"DOI": "10.17570/stj.2017.v3n2.a01",
				"ISSN": "2413-9467",
				"abstractNote": "This contribution is based on what may be called a pedagogical experiment in a postgraduate course on the 16th century European Reformations that was offered at the University of the Western Cape in the first semester of 2017. On the basis of a close reading of selected literature on the reformation, this contribution highlights the legacy of 16th century ecclesial movements for Southern Africa. The point of departure is located in the context of a discussion on a range of guiding concepts for social transformation in the contemporary (South) African context. It is argued that the deepest diagnosis of current (South) African discourse may well point to a view that none of the options for a category that may be regarded as more ultimate than justice (as a ‘remedy’) is attractive enough to muster sufficient moral energy without endless further contestations. Without necessarily suggesting what that ultimate maybe, it is suggested that a lack of an appealing notion of what is truly ultimate can undermine any attempts to address inequality (as our diagnosis) in current discourse. This necessarily calls attention to the relationship between the penultimate and the ultimate, and indeed between justification and justice.",
				"issue": "2",
				"journalAbbreviation": "STJ",
				"language": "en",
				"libraryCatalog": "ojs.reformedjournals.co.za",
				"pages": "11–40",
				"publicationTitle": "STJ | Stellenbosch Theological Journal",
				"rights": "Copyright (c) 2017 Pieter de Waal Neethling Trust, Stellenbosch",
				"shortTitle": "Renewal, Renaissance, Reformation, or Revolution?",
				"url": "https://ojs.reformedjournals.co.za/stj/article/view/1731",
				"volume": "3",
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
						"tag": "Diagnostics"
					},
					{
						"tag": "Inequality"
					},
					{
						"tag": "Justice"
					},
					{
						"tag": "Justification"
					},
					{
						"tag": "Penultimate"
					},
					{
						"tag": "Reformation"
					},
					{
						"tag": "Sin"
					},
					{
						"tag": "Social transformation"
					},
					{
						"tag": "Ultimate"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sanisidoro.net/publicaciones/index.php/isidorianum/issue/view/11",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“Battle is over, raise we the cry of victory”. Study of Revelation 19:11-21",
				"creators": [
					{
						"firstName": "Francisco Javier",
						"lastName": "Ruiz-Ortiz",
						"creatorType": "author"
					}
				],
				"date": "2020/11/20",
				"DOI": "10.46543/ISID.2029.1054",
				"ISSN": "2660-7743",
				"abstractNote": "Using some of the tools of narrative criticism, this article studies the final battle and victory which is achieved by God’s envoy. By unpacking the network of relationship in the text the envoy is identified with the Christ of God, who has been present in the book from the beginning. The article shows how the Rider on the white horse summarises what the book of Revelation has said about Jesus., Usando elementos del análisis narrativo, este artículo examina la batalla final y la victoria que se consigue a través del enviado de Dios, un jinete en un caballo blanco. Desenredando la red de relaciones en el texto, el jinete en el caballo blanco se identifica con el Cristo de Dios, que ha estado presente en el libro desde el inicio. El artículo muestra como el Jinete en el caballo blanco resume en sí mismo todo lo que el Apocalipsis dice sobre Jesús.",
				"callNumber": "orcid:0000-0001-6251-0506 | author=Autores/as Francisco Javier Ruiz-Ortiz Mater Ecclesiae College, St Mary’s University (Twickenham, UK) .st0{fill:#A6CE39;} .st1{fill:#FFFFFF;}  | taken from website",
				"issue": "2",
				"journalAbbreviation": "1",
				"language": "es-ES",
				"libraryCatalog": "www.sanisidoro.net",
				"pages": "37-60",
				"publicationTitle": "Isidorianum",
				"shortTitle": "“Battle is over, raise we the cry of victory”. Study of Revelation 19",
				"url": "https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147",
				"volume": "29",
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
						"tag": "Ap 19"
					},
					{
						"tag": "Apocalipsis"
					},
					{
						"tag": "cristología"
					},
					{
						"tag": "juicio final"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/157",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ben HOLLAND, Self and City in the thought of Saint Augustine. Switzerland, Palgrave Macmillan, 2020, 162 pp., 52,10 €. ISBN 978-3-030-19332-4.",
				"creators": [
					{
						"firstName": "Pablo Antonio Morillo",
						"lastName": "Rey",
						"creatorType": "author"
					}
				],
				"date": "2020/11/20",
				"DOI": "10.46543/ISID.2029.1062",
				"ISSN": "2660-7743",
				"callNumber": "orcid:0000-0001-7277-9058 | author=Autores/as Pablo Antonio Morillo Rey Facultad de Teología San Isidoro de Sevilla .st0{fill:#A6CE39;} .st1{fill:#FFFFFF;}  | taken from website",
				"issue": "2",
				"journalAbbreviation": "1",
				"language": "es-ES",
				"libraryCatalog": "www.sanisidoro.net",
				"pages": "161-163",
				"publicationTitle": "Isidorianum",
				"url": "https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/157",
				"volume": "29",
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
		"url": "https://journal.equinoxpub.com/JSRNC/article/view/19598",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sustaining Abundance: The Role of the Divine River in the Economy of Ancient Persia The Role of the Divine River in the Economy of Ancient Persia",
				"creators": [
					{
						"firstName": "Tobin Montgomery",
						"lastName": "Hartnell",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1558/jsrnc.39772",
				"ISSN": "1749-4915",
				"abstractNote": "A comparison of archaeological survey and ethnography with the Zoroastrian textual corpus reveals the cultural and economic dimensions of an ancient water management system in northern Persia (southern Iran). The results highlight how humanity’s destructive impact on nature is ubiquitous, yet not all impacts are equivalent. The explanation is partly cultural, as Sasanian (r. 208–641 CE) notions of the Divine River promoted particular types of engagements with local rivers that respected their innate character. For believers, Zoroastrian water rituals promoted material abundance, just as ancient irrigation systems prioritized smaller barrages that allowed the river to mow. In contrast, modern dams severely restrict the water’s mow, which degrades the quality of the water. Even though ancient irrigation systems achieved a similar scale to modern ones, they were ultimately more sustainable because they respected the river as an important entity in its own right.",
				"issue": "4",
				"journalAbbreviation": "JSRNC",
				"language": "en",
				"libraryCatalog": "journal.equinoxpub.com",
				"pages": "450-479",
				"publicationTitle": "Journal for the Study of Religion, Nature and Culture",
				"shortTitle": "Sustaining Abundance",
				"url": "https://journal.equinoxpub.com/JSRNC/article/view/19598",
				"volume": "14",
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
						"tag": "Zoroastrianism"
					},
					{
						"tag": "ancient Persia"
					},
					{
						"tag": "divine river"
					},
					{
						"tag": "political economy"
					},
					{
						"tag": "sustainability"
					},
					{
						"tag": "water rituals"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://verbumetecclesia.org.za/index.php/ve/issue/view/97",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://verbumetecclesia.org.za/index.php/ve/issue/view/12",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journal.equinoxpub.com/JSRNC/issue/view/1967",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://periodicos.uem.br/ojs/index.php/RbhrAnpuh/issue/view/1635",
		"items": "multiple"
	}
]
/** END TEST CASES **/
