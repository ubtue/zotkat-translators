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
	"lastUpdated": "2021-09-14 15:03:38"
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
	if (url.match(/\/article\/view/)) return "journalArticle";
	else if (url.match(/\/issue\/view/) && getSearchResults(doc, url)) return "multiple";
}

function getSearchResults(doc, url) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "media-heading", " " ))]//a | //*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]//a | //*[(@id = "content")]//a');
	if (rows.length == 0 && url.match(/otwsa-otssa/)) {
		rows = ZU.xpath(doc, '//div[@class="article-summary-title"]//a');
	}
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
 		if (i.ISSN=='1804-6444') {
 			let subTitle = ZU.xpathText(doc, '//article[@class="article-details"]//h1[@class="page-header"]/small');
 			if (subTitle) {
 				i.title += ': ' + subTitle.trim();
 			}
 			var articleType = ZU.xpathText(doc, '//meta[@name="DC.Type.articleType"]/@content');
 				if (articleType == 'Book Reviews') {
 					i.tags.push('RezensionstagPica');
 				}
 		}
 		//title in other language for pica-field 4002
 		var articleType = ZU.xpathText(doc, '//meta[@name="DC.Type.articleType"]/@content');
 		if (articleType === "Artículos") {
 			let dcAlternativeTitle = ZU.xpathText(doc, '//meta[@name="DC.Title.Alternative"]/@content');
 			i.archiveLocation = dcAlternativeTitle;
 			if (i.archiveLocation == i.title) {
 				delete i.archiveLocation;
 			}
 		}

 		//orcid for pica-field 8910
 		var authorEntry = doc.querySelectorAll("meta[name*='DC.Creator.PersonalName']");
 		if (['2748-6419', '2660-7743'].includes(i.ISSN) && authorEntry) {
 			for (let v of authorEntry) {
 				var author = ZU.xpathText(v, '//meta[@name="DC.Creator.PersonalName"]/@content').split(',');
 			}
 			var orcidEntry = doc.querySelectorAll('.orcid, .orcidImage');
 			for (let o of orcidEntry) {
 				let orcid = attr(o, '*[href*="/orcid.org/"]', 'href');
 				if (authorEntry && orcidEntry) {
						i.notes.push({note: "orcid:" + orcid + ' | ' + author.shift(function(author) {return author[0]}) + ' | ' + 'taken from website'});
				}
 			}
 		}
  		/*let checkOrcid = doc.querySelector(".orcid a");Z.debug(checkOrcid)
 		if (checkOrcid) {
 			let authorEntry = ZU.xpath(doc, '//*[@class="item authors"]');//Z.debug(authorEntry)
 			for (let v in authorEntry) {
 				let author = authorEntry[v].innerText;//Z.debug(author)
 				let orcid = attr(v, '*[href*="/orcid.org/"]', 'href');
 				i.notes.push({note: "orcid:" + orcid + ' | ' + author + ' | ' + 'taken from website'});
 			}
 		}*/
 		else {
 			let orcidEntries = ZU.xpath(doc, '//div[@class="article-details-authors"]/div[@class="article-details-author hideAuthor"]');
 			for (let orcidEntry in orcidEntries) {
 				let newORCID = '';
 				if (ZU.xpathText(orcidEntries[orcidEntry], './div[@class="article-details-author-orcid"]/a/@href')) {
 					newORCID += ZU.xpathText(orcidEntries[orcidEntry], './div[@class="article-details-author-orcid"]/a/@href').trim();
 				if (ZU.xpathText(orcidEntries[orcidEntry], './div[@class="article-details-author-affiliation"]'))
 					newORCID = ZU.xpathText(orcidEntries[orcidEntry], './div[@class="article-details-author-affiliation"]').trim() + ' | ' + newORCID;
 				if (ZU.xpathText(orcidEntries[orcidEntry], './div[@class="article-details-author-name small-screen"]')) {
 					newORCID = ZU.xpathText(orcidEntries[orcidEntry], './div[@class="article-details-author-name small-screen"]').trim() + ' | ' + newORCID;
 				i.notes.push(newORCID);
 				}
 				}
 			}
 		}
 		
 		//i.notes.push(getOrcids(doc))
 		
 		if (i.pages !== undefined) {
			let pageNumberFromDC = ZU.xpathText(doc, '//meta[@name="DC.Identifier.pageNumber"]/@content');
			//if the first page number matches the results of second page number (see regex "\1") e.g. 3-3,
			//then replace the range with a first page number e.g 3 
			i.pages = pageNumberFromDC.trim().replace(/^([^-]+)-\1$/, '$1');
 		}
 		
 		if (ZU.xpathText(doc, '//meta[@name="DC.Date.issued"]/@content') && i.date.length !== 4 && i.ISSN == '1983-2850') {
			i.date = ZU.xpathText(doc, '//meta[@name="DC.Date.issued"]/@content').substr(0, 4);
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
		if (i.tags[1] === undefined && i.tags[0] !='RezensionstagPica') delete i.tags[0];
		let tagsEntry = ZU.xpathText(doc, '//meta[@name="citation_keywords"]/@content');
		if (i.ISSN === "2413-9467" && tagsEntry) {
			tag = tagsEntry.split(/\s*,\s/);
			for (let t in tag) {
				i.tags.push(tag[t].capitalizeFirstLetter()); //alternativ .replace(/^\w/, function($0) { return $0.toUpperCase(); }))
			}
		}
		if (i.tags[0] === "book review") i.tags.push('RezensionstagPica') && delete i.tags[0];
		if (doc.querySelector(".current")) {
		if (doc.querySelector(".current").textContent.trim() === "Book Reviews" || articleType === "Recensiones") {
			i.tags.push('RezensionstagPica');
		}
		}
		if (['2617-3697', '2660-4418', '2748-6419'].includes(i.ISSN)) {
			if (ZU.xpath(doc, '//meta[@name="DC.Type.articleType"]')) {
				if (ZU.xpath(doc, '//meta[@name="DC.Type.articleType"]')[0].content.match(/(Media reviews)|(Rezensionen)/i)) {
					i.tags.push("RezensionstagPica");
				}
			}
		}
		if (i.ISSN == '2660-4418') {
			if (i.abstractNote.indexOf("\nReferences\n") !== -1) {
			i.abstractNote = i.abstractNote.substring(0, i.abstractNote.indexOf("\nReferences\n"));
			}
		}
		if (['2617-3697', '2660-4418', '2748-6419', '2617-1953'].includes(i.ISSN)) {
			let subtitle = ZU.xpathText(doc, '//h1/small');
			if (subtitle) {
				subtitle = subtitle.replace(/(\n*\t*)/, '');
				if (!i.title.match(subtitle)) {
					i.title = i.title + ': ' + subtitle;
			}
			}
		}
		if (i.tags[0] == undefined) {
			let tags = ZU.xpath(doc, '//meta[@name="citation_keywords"]');
			for (let t in tags) {
				if (!i.tags.includes(tags[t].content) 
				&& !i.tags.includes(tags[t].content[0].toUpperCase() + tags[t].content.substring(1)))
				i.tags.push(tags[t].content);
			}
		}
		if (i.ISSN === '2312-3621' && i.abstractNote) {
			if (i.abstractNote.match(/https:\/\/doi\.org\/\d{2}\.\d+\/.*$/)) {
				i.DOI = i.abstractNote.substring(i.abstractNote.indexOf('https:\/\/doi\.org'), i.abstractNote.length).replace('https://doi.org/', '');
			}
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
		else i.complete();
	});
	translator.translate();
}

String.prototype.capitalizeFirstLetter = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

/*
//should link with the second author https://periodicos.uem.br/ojs/index.php/RbhrAnpuh/article/view/54840
function getOrcids(doc) {
 	let authorSections = ZU.xpath(doc, '//*[@class="item authors"]/li');
 	for (let authorSection of authorSections) {
 		//Z.debug(authorSection);
 		let authorLink = ZU.xpath(authorSection, '//*[@class="name"]');Z.debug(authorLink)
 		let orcidLink = ZU.xpath(authorSection, '//a[starts-with(@href, "https://orcid.org")]/@href');
 		if (authorLink && orcidLink) {
 		    let author = authorLink[0].innerText;
 		    let orcid = orcidLink[0].value.match(/\d+-\d+-\d+-\d+x?/i);
 		    return {note: "orcid:" + orcid + ' | ' + author + ' | ' + 'taken from website'};
 		}
 	}
 	return null;
 }
 */
 
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
		"url": "https://www.zwingliana.ch/index.php/zwa/article/view/2516",
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
				"journalAbbreviation": "Zwa",
				"language": "en",
				"libraryCatalog": "www.zwingliana.ch",
				"pages": "VII-IX",
				"publicationTitle": "Zwingliana",
				"rights": "Copyright (c)",
				"url": "https://www.zwingliana.ch/index.php/zwa/article/view/2516",
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
				"notes": [
					{
						"note": "orcid:https://orcid.org/0000-0001-6251-0506 | Francisco Javier Ruiz-Ortiz | taken from website"
					}
				],
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
	},
	{
		"type": "web",
		"url": "https://periodicos.uem.br/ojs/index.php/RbhrAnpuh/article/view/54840",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Razões para peregrinar: experiências devocionais no santuário do Sagrado Coração de Jesus da Gruta da Mangabeira (Ituaçu - BA, 1900-1950)",
				"creators": [
					{
						"firstName": "Edilece Souza",
						"lastName": "Couto",
						"creatorType": "author"
					},
					{
						"firstName": "Tânia Maria Meira",
						"lastName": "Mota",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.4025/rbhranpuh.v13i38.54840",
				"ISSN": "1983-2850",
				"abstractNote": "O artigo trata da vivência religiosa em Ituaçu – BA, cidade da Chapada Diamantina, na primeira metade do século XX. Por meio dos relatos orais, da documentação eclesiástica e das crônicas, apresentamos as narrativas, sobre a origem e o desenvolvimento das devoções, elaboradas pelos agentes religiosos: devotos, romeiros, peregrinos, promesseiros e clérigos, que fazem do ato de peregrinar a própria vida como viagem. Anualmente, entre os meses de agosto e setembro, os devotos e romeiros ocupam a Gruta da Mangabeira com seus cantos, benditos, rezas, ladainhas, novenas e procissões. A pesquisa demonstrou que, naquele espaço sacralizado, os fiéis rendem graça, renovam seus votos e promessas e re-atualizam seus mitos, sua fé e suas crenças.",
				"issue": "38",
				"journalAbbreviation": "1",
				"language": "pt",
				"libraryCatalog": "periodicos.uem.br",
				"publicationTitle": "Revista Brasileira de História das Religiões",
				"rights": "Copyright (c) 2020 Edilece Souza Couto, Tânia Maria Meira Mota (Autor)",
				"shortTitle": "Razões para peregrinar",
				"url": "https://periodicos.uem.br/ojs/index.php/RbhrAnpuh/article/view/54840",
				"volume": "13",
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
						"tag": "Catolicismo"
					},
					{
						"tag": "Peregrinação"
					},
					{
						"tag": "Romaria"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journal.equinoxpub.com/JSRNC/article/view/19606",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Dark Green Religion: A Decade Later A Decade Later",
				"creators": [
					{
						"firstName": "Bron",
						"lastName": "Taylor",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1558/jsrnc.34630",
				"ISSN": "1749-4915",
				"abstractNote": "I wrote the following remections in the hope they will encourage further research and debate about the phenomena I explored in Dark Green Religion: Nature Spiritualty and the Planetary Future. These remections are adapted from the ‘Vorwort zur deutschen Neuausgabe: Dunkelgrüne Religion—Zehn Jahre danach’, with which I introduced the German edition.",
				"issue": "4",
				"journalAbbreviation": "JSRNC",
				"language": "en",
				"libraryCatalog": "journal.equinoxpub.com",
				"pages": "496-510",
				"publicationTitle": "Journal for the Study of Religion, Nature and Culture",
				"shortTitle": "Dark Green Religion",
				"url": "https://journal.equinoxpub.com/JSRNC/article/view/19606",
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
						"tag": "Avatar"
					},
					{
						"tag": "Dark Green Religion"
					},
					{
						"tag": "nature spirituality"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jrfm.eu/index.php/ojs_jrfm/issue/view/13",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jrfm.eu/index.php/ojs_jrfm/article/view/256",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Book Review. Christopher Ocker / Susanne Elm (eds.), Material Christianity: Western Religion and the Agency of Things",
				"creators": [
					{
						"firstName": "Daria",
						"lastName": "Pezzoli-Olgiati",
						"creatorType": "author"
					}
				],
				"date": "2021/05/10",
				"DOI": "10.25364/05.7:2021.1.11",
				"ISSN": "2617-3697",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "jrfm.eu",
				"pages": "197–199",
				"publicationTitle": "Journal for Religion, Film and Media (JRFM)",
				"rights": "Copyright (c) 2021 Daria Pezzoli-Olgiati",
				"shortTitle": "Book Review. Christopher Ocker / Susanne Elm (eds.), Material Christianity",
				"url": "https://jrfm.eu/index.php/ojs_jrfm/article/view/256",
				"volume": "7",
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
					},
					{
						"tag": "materiality and its impact"
					},
					{
						"tag": "religious  thinking"
					},
					{
						"tag": "religious identities"
					},
					{
						"tag": "religious practices"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistasfranciscanas.org/index.php/ArchivoIberoAmericano/article/view/117",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La Orden Tercera Franciscana en la península ibérica: De sus orígenes medievales a su eclosión en la Edad Moderna",
				"creators": [
					{
						"firstName": "Alfredo Martín",
						"lastName": "García",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISSN": "2660-4418",
				"abstractNote": "After examining the state of the question regarding the Third Order of Saint Francis in Spain and Portugal, the present study analyses the medieval origins of this secular Franciscan order in the Iberian Peninsula. Subsequently, it examines the reasons for its decline in the late Middle Ages and beginning of the Early Modern Period, relating this to questions of a political nature, including pressure from the crown, ideology, the influence of heretical movements, and the internal organization of the Franciscans. This is followed by an analysis of the Order’s subsequent recovery in the early 17th century, which was closely linked to the reforms of the Council of Trent, in which secular religious associations played a major role. Lastly, the main reasons for the success of a secular order among various sectors of Old Regime society are explored, underlining the need to move away from earlier accusations that in the Early Modern Period, the Third Order had lost its original religious purity.",
				"issue": "284",
				"journalAbbreviation": "1",
				"language": "es",
				"libraryCatalog": "revistasfranciscanas.org",
				"pages": "69-97",
				"publicationTitle": "Archivo Ibero-Americano",
				"rights": "Derechos de autor 2017 Archivo Ibero-Americano",
				"shortTitle": "La Orden Tercera Franciscana en la península ibérica",
				"url": "https://revistasfranciscanas.org/index.php/ArchivoIberoAmericano/article/view/117",
				"volume": "77",
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
						"tag": "Edad Media"
					},
					{
						"tag": "Edad Moderna"
					},
					{
						"tag": "Orden Tercera Franciscana"
					},
					{
						"tag": "asociacionismo religioso secular"
					},
					{
						"tag": "península ibérica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistasfranciscanas.org/index.php/ArchivoIberoAmericano/issue/view/16",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jeac.de/ojs/index.php/jeac/article/view/297",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Review of: Martha C. Nussbaum, The Monarchy of Fear. A Philosopher looks at our Political Crisis",
				"creators": [
					{
						"firstName": "Tanja",
						"lastName": "Smailus",
						"creatorType": "author"
					}
				],
				"date": "2020/10/31",
				"DOI": "10.25784/jeac.v2i0.297",
				"ISSN": "2627-6062",
				"abstractNote": ",",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "jeac.de",
				"pages": "86-87",
				"publicationTitle": "Journal of Ethics in Antiquity and Christianity",
				"rights": "Copyright (c) 2020 Journal of Ethics in Antiquity and Christianity",
				"shortTitle": "Review of",
				"url": "https://jeac.de/ojs/index.php/jeac/article/view/297",
				"volume": "2",
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
						"tag": "Angst"
					},
					{
						"tag": "Emotionen"
					},
					{
						"tag": "Ethik"
					},
					{
						"tag": "Ethik in Antike und Christentum"
					},
					{
						"tag": "Gesellschaft"
					},
					{
						"tag": "Martha Nussbaum"
					},
					{
						"tag": "Philosophie"
					},
					{
						"tag": "Politik"
					},
					{
						"tag": "Psychologie"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jeac.de/ojs/index.php/jeac/issue/view/16",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/785",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Day Storm in Mesopotamian Literature: A Background to the Biblical Day of Yahweh?",
				"creators": [
					{
						"firstName": "Sebastian",
						"lastName": "Fink",
						"creatorType": "author"
					},
					{
						"firstName": "Mark S.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "2021/06/29",
				"DOI": "10.35068/aabner.v1i1.785",
				"ISSN": "2748-6419",
				"abstractNote": "Der hier vorliegende Artikel untersucht das Konzept eines göttlichen&nbsp;(Entscheidungs-)Tages, speziell des „Sturm-Tages“, in der sumerischen und akkadischen Literatur des ersten und zweiten Jahrtausends und vergleicht dieses&nbsp;mit dem „Tag Jahwehs“ im Alten Testament.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "ojs3.uni-tuebingen.de",
				"pages": "29-63",
				"publicationTitle": "Advances in Ancient, Biblical, and Near Eastern Research",
				"rights": "Copyright (c) 2021 Sebastian Fink, Mark S. Smith",
				"shortTitle": "The Day Storm in Mesopotamian Literature",
				"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/785",
				"volume": "1",
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
						"tag": "Akkadian literature"
					},
					{
						"tag": "Day of the Lord"
					},
					{
						"tag": "Mesopotamian Lamentations"
					},
					{
						"tag": "Sumerian literature"
					},
					{
						"tag": "day-storm"
					},
					{
						"tag": "divine agency"
					},
					{
						"tag": "divine wrath"
					}
				],
				"notes": [
					{
						"note": "orcid:http://orcid.org/0000-0002-6270-8368 | Sebastian Fink | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aabner.org/ojs/index.php/beabs/article/view/781",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "AABNER Forum Peer Review System",
				"creators": [
					{
						"firstName": "Izaak Jozias de",
						"lastName": "Hulster",
						"creatorType": "author"
					},
					{
						"firstName": "Valérie",
						"lastName": "Nicolet",
						"creatorType": "author"
					},
					{
						"firstName": "Ronit",
						"lastName": "Nikolsky",
						"creatorType": "author"
					},
					{
						"firstName": "Jason M.",
						"lastName": "Silverman",
						"creatorType": "author"
					}
				],
				"date": "2021/06/18",
				"DOI": "10.35068/aabner.v1i1.781",
				"ISSN": "2748-6419",
				"abstractNote": "The AABNER founding editors-in-chief describe some of the problems with traditional double-blind peer review and describe our solution for them, forum peer&nbsp;review, which we have developed for use within AABNER.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "aabner.org",
				"pages": "13-22",
				"publicationTitle": "Advances in Ancient, Biblical, and Near Eastern Research",
				"rights": "Copyright (c) 2021 Izaak J. de Hulster, Valérie Nicolet, Ronit Nikolsky, Jason M. Silverman",
				"url": "https://aabner.org/ojs/index.php/beabs/article/view/781",
				"volume": "1",
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
						"tag": "Peer review"
					},
					{
						"tag": "academic publishing"
					},
					{
						"tag": "ethics"
					},
					{
						"tag": "forum review"
					}
				],
				"notes": [
					{
						"note": "orcid:http://orcid.org/0000-0003-0706-4480 | Izaak Jozias de Hulster | taken from website"
					},
					{
						"note": "orcid:http://orcid.org/0000-0001-9070-0585 |  Valérie Nicolet | taken from website"
					},
					{
						"note": "orcid:http://orcid.org/0000-0002-3771-8062 |  Ronit Nikolsky | taken from website"
					},
					{
						"note": "orcid:http://orcid.org/0000-0002-0240-9219 |  Jason M. Silverman | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ote-journal.otwsa-otssa.org.za/index.php/journal/issue/view/22",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ote-journal.otwsa-otssa.org.za/index.php/journal/article/view/433",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Homosexuality and Liminality in Sodom: THE Quests for Home, Fun, and Justice (Gen 19:1-29)",
				"creators": [
					{
						"firstName": "Cephas",
						"lastName": "Tushima",
						"creatorType": "author"
					}
				],
				"date": "2021/05/30",
				"DOI": "10.17159/2312–3621/2021/v34n1a6",
				"ISSN": "2312-3621",
				"abstractNote": "This essay explores the first segment of the Lot sub-narrative of the Abraham cycle (Gen 11:27–25:10). The study adopts a narrative close reading approach and canonical theological hermeneutical framework in its reading strategies (with the canon’s reception history undergirding its plausibility structures), aiming ultimately at unfolding the world of possibilities of being-in-the-world in the text, particularly from an ethical standpoint. The study shows Lot, enmeshed in his sense of marginality from YHWH’s repeated covenantal promises of progeny to Abraham, ditch time-tested tradition and embark on a quest for freedom and a home of his own, consequently, assuming significance and security in Sodom (where he sat on the city council at the gate). His initial assumed marginality in Abraham’s home attains reality in Sodom, where the Sodomites desirous of ‘having fun’ with Lot’s angelic guests (who were on a search for justice) reprimands Lot, a mere immigrant—in their view—for his audacity to rebuke them. The visitation of YHWH’s justice on Sodom renders the self-serving Lot homeless, driving him to ultimate marginality, as he inhabits the liminal space of an incestuous cave dweller. A theologico-ethical appropriation of the narrative draws attention, first, to the temptation often to be so caring to outsiders and yet be so unkind to those closest to us (like Lot). Second, tradition is a stabilising force in society and jettisoning it unnecessarily creates cascading disequilibria. Third, alienation from God is the grand source of all liminality. Fourth, inordinate desires lead to choices that bring about a breakdown in the social order. Fifth, like Lot, we need to catch heaven’s heartbeat for the oppressed and become voices for their justice in our time.\nhttps://doi.org/10.17159/2312–3621/2021/v34n1a6",
				"issue": "1",
				"journalAbbreviation": "OTE",
				"language": "en",
				"libraryCatalog": "ote-journal.otwsa-otssa.org.za",
				"pages": "68-88",
				"publicationTitle": "Old Testament Essays",
				"rights": "Copyright (c) 2021 Cephas Tushima",
				"shortTitle": "Homosexuality and Liminality in Sodom",
				"url": "https://ote-journal.otwsa-otssa.org.za/index.php/journal/article/view/433",
				"volume": "34",
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
						"tag": "Abraham"
					},
					{
						"tag": "Biblical Ethics"
					},
					{
						"tag": "Genesis"
					},
					{
						"tag": "Homosexuality"
					},
					{
						"tag": "Immigrants"
					},
					{
						"tag": "Intertextuality"
					},
					{
						"tag": "Justice"
					},
					{
						"tag": "Lot"
					},
					{
						"tag": "Narrative Criticism"
					},
					{
						"tag": "Sodom"
					}
				],
				"notes": [
					"Cephas Tushima | https://orcid.org/0000-0003-0923-1350"
				],
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
		"url": "https://jebs.eu/ojs/index.php/jebs/issue/view/75",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jebs.eu/ojs/index.php/jebs/article/view/697",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Teaching Preaching: As Practical Theology",
				"creators": [
					{
						"firstName": "Stuart",
						"lastName": "Blythe",
						"creatorType": "author"
					}
				],
				"date": "2021/05/20",
				"DOI": "10.25782/jebs.v21i1.697",
				"ISSN": "1804-6444",
				"abstractNote": "This article explores the teaching of preaching as practical theology through a number of discussions concerning practical theology and theological education. According to Miller-McLemore’s definition, both preaching, and the teaching of preaching are expressions of practical theology. One is located in the life of the church. The other in the curriculum of theological education. The purpose of Christian practical theology is to serve the life of the church. The teaching of preaching as practical theology should support the practice of preaching in the church. This means that theological educators need to pay attention to the types of knowledge students actually need for congregational practice. This requires knowledge that goes beyond cognitive understanding (episteme) to include practical wisdom (phronesis) and skill (techne). Since preaching teaching involves both wisdom and skill, there are limitations to what can be taught and learned in the classroom. Be this as it may, conceptualising the teaching of preaching as practical theology has implications for the classroom.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "jebs.eu",
				"pages": "45-66",
				"publicationTitle": "Journal of European Baptist Studies",
				"rights": "Copyright (c) 2021 Stuart Blythe",
				"shortTitle": "Teaching Preaching",
				"url": "https://jebs.eu/ojs/index.php/jebs/article/view/697",
				"volume": "21",
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
						"tag": "practical theology"
					},
					{
						"tag": "preaching"
					},
					{
						"tag": "skill"
					},
					{
						"tag": "teaching preaching"
					},
					{
						"tag": "wisdom"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://limina-graz.eu/index.php/limina/article/view/103",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Antimodernismus als Autoritarismus?: Zum Mehrwert sozialpsychologischer Analysekategorien im Kontext theologischer Fundamentalismusforschung",
				"creators": [
					{
						"firstName": "Sonja Angelika",
						"lastName": "Strube",
						"creatorType": "author"
					}
				],
				"date": "2021/05/12",
				"ISSN": "2617-1953",
				"abstractNote": "Fundamentalistische religiöse Stile, im katholischen Glaubensspektrum durch vorkonziliar-antimodernistische und traditionalismusaffine Frömmigkeitsformen geprägt, gehen auffallend oft mit expliziter Gruppenbezogener Menschenfeindlichkeit und sogar extrem rechten politischen Einstellungen einher. Diese Beobachtung legt nicht nur nahe, nach möglichen gemeinsamen psychischen Prädispositionen für politische wie religiöse autoritäre Einstellungen zu fragen, sondern ermutigt auch die Integration sozialpsychologischer Analysekategorien in die theologische Fundamentalismusforschung.\nDer vorliegende Beitrag stellt zunächst zentrale (schwerpunktmäßig sozialpsychologische) Forschungen zur Ambivalenz von Religiosität und zu Zusammenhängen zwischen religiösen Stilen und Vorurteilen sowie Autoritarismus vor. In einem zweiten Schritt wendet er deren sozialpsychologische Kategorien auf die Analyse rechtskatholischer Proteste gegen die Einbeziehung indigener Figuren in die Eröffnungszeremonie der Amazonassynode 2019 an. Dies ermöglicht die Offenlegung autoritärer und ethnozentrischer Haltungen, die durch religiösen Exklusivismus, strafende Gottesbilder sowie entsprechende eschatologische Vorstellungen gerechtfertigt werden. Aus sozialpsychologischer Perspektive lässt sich der innerkirchliche Konflikt um die Reformen des Zweiten Vatikanischen Konzils als ein ,Clash‘ unterschiedlicher – reiferer bzw. wenig komplexer – religiöser Stile beschreiben.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "limina-graz.eu",
				"pages": "16-40",
				"publicationTitle": "LIMINA - Grazer theologische Perspektiven",
				"rights": "Copyright (c) 2021 Sonja Angelika Strube",
				"shortTitle": "Antimodernismus als Autoritarismus?",
				"url": "https://limina-graz.eu/index.php/limina/article/view/103",
				"volume": "4",
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
						"tag": "(katholischer) Fundamentalismus"
					},
					{
						"tag": "Antimodernismus"
					},
					{
						"tag": "Autoritarismus / autoritäre Persönlichkeit"
					},
					{
						"tag": "Gruppenbezogene Menschenfeindlichkeit"
					},
					{
						"tag": "Religion und Vorurteil"
					},
					{
						"tag": "Traditionalismus"
					},
					{
						"tag": "Zweites Vatikanisches Konzil"
					},
					{
						"tag": "rechtsextreme Einstellungen"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistas.agustinosvalladolid.es/index.php/estudio/article/view/9",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Spirituality as relationality of reasonability: Critical challenge of human reason to ontology from the viewpoint of metaphysics",
				"creators": [
					{
						"firstName": "Macario Ofilada",
						"lastName": "Mina",
						"creatorType": "author"
					}
				],
				"date": "2021/04/01",
				"ISSN": "2792-260X",
				"abstractNote": "Este ensayo es un acercamiento a la fundamentación de la noción de la espiritualidad desde la metafísica, es decir, la primera filosofía. La filosofía solo puede ser espiritual, es construir caminos hacia lo originario. El alma de la espiritualidad, que se hace concreta en la mediación de la espiritualidad (camino de la realidad experienciada como real o lo real experienciado como realidad), es la conciencia de la presencia de lo Trascendente en la inmanencia de la historia, contenida en el cosmos, que es la totalidad de todo lo real como realidad o de la realidad como real. Pero esta historia está ligada a categorías ontológicas. La verdadera espiritualidad se logra solo mediante la metafísica. Sin lo espiritual, que es el camino de la espiritualidad, la espiritualidad se reduciría en mera espiritualidad o en ontología del espíritu.&nbsp;",
				"issue": "1",
				"journalAbbreviation": "EstAgus",
				"language": "es",
				"libraryCatalog": "revistas.agustinosvalladolid.es",
				"pages": "37-63",
				"publicationTitle": "Estudio Agustiniano",
				"rights": "Derechos de autor 2021",
				"shortTitle": "Spirituality as relationality of reasonability",
				"url": "https://revistas.agustinosvalladolid.es/index.php/estudio/article/view/9",
				"volume": "56",
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
						"tag": "Absoluto"
					},
					{
						"tag": "Comunión"
					},
					{
						"tag": "Contemplación"
					},
					{
						"tag": "Escatología"
					},
					{
						"tag": "Esperanza"
					},
					{
						"tag": "Espiritualidad"
					},
					{
						"tag": "Historia"
					},
					{
						"tag": "Metafísica"
					},
					{
						"tag": "Ontología"
					},
					{
						"tag": "Relacionalidad"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/781",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "AABNER Forum Peer Review System",
				"creators": [
					{
						"firstName": "Izaak Jozias de",
						"lastName": "Hulster",
						"creatorType": "author"
					},
					{
						"firstName": "Valérie",
						"lastName": "Nicolet",
						"creatorType": "author"
					},
					{
						"firstName": "Ronit",
						"lastName": "Nikolsky",
						"creatorType": "author"
					},
					{
						"firstName": "Jason M.",
						"lastName": "Silverman",
						"creatorType": "author"
					}
				],
				"date": "2021/06/18",
				"DOI": "10.35068/aabner.v1i1.781",
				"ISSN": "2748-6419",
				"abstractNote": "The AABNER founding editors-in-chief describe some of the problems with traditional double-blind peer review and describe our solution for them, forum peer&nbsp;review, which we have developed for use within AABNER.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "ojs3.uni-tuebingen.de",
				"pages": "13-22",
				"publicationTitle": "Advances in Ancient, Biblical, and Near Eastern Research",
				"rights": "Copyright (c) 2021 Izaak J. de Hulster, Valérie Nicolet, Ronit Nikolsky, Jason M. Silverman",
				"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/781",
				"volume": "1",
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
						"tag": "Peer review"
					},
					{
						"tag": "academic publishing"
					},
					{
						"tag": "ethics"
					},
					{
						"tag": "forum review"
					}
				],
				"notes": [
					{
						"note": "orcid:http://orcid.org/0000-0003-0706-4480 | Izaak Jozias de Hulster | taken from website"
					},
					{
						"note": "orcid:http://orcid.org/0000-0001-9070-0585 |  Valérie Nicolet | taken from website"
					},
					{
						"note": "orcid:http://orcid.org/0000-0002-3771-8062 |  Ronit Nikolsky | taken from website"
					},
					{
						"note": "orcid:http://orcid.org/0000-0002-0240-9219 |  Jason M. Silverman | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/785",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Day Storm in Mesopotamian Literature: A Background to the Biblical Day of Yahweh?",
				"creators": [
					{
						"firstName": "Sebastian",
						"lastName": "Fink",
						"creatorType": "author"
					},
					{
						"firstName": "Mark S.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "2021/06/29",
				"DOI": "10.35068/aabner.v1i1.785",
				"ISSN": "2748-6419",
				"abstractNote": "Der hier vorliegende Artikel untersucht das Konzept eines göttlichen&nbsp;(Entscheidungs-)Tages, speziell des „Sturm-Tages“, in der sumerischen und akkadischen Literatur des ersten und zweiten Jahrtausends und vergleicht dieses&nbsp;mit dem „Tag Jahwehs“ im Alten Testament.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "ojs3.uni-tuebingen.de",
				"pages": "29-63",
				"publicationTitle": "Advances in Ancient, Biblical, and Near Eastern Research",
				"rights": "Copyright (c) 2021 Sebastian Fink, Mark S. Smith",
				"shortTitle": "The Day Storm in Mesopotamian Literature",
				"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/785",
				"volume": "1",
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
						"tag": "Akkadian literature"
					},
					{
						"tag": "Day of the Lord"
					},
					{
						"tag": "Mesopotamian Lamentations"
					},
					{
						"tag": "Sumerian literature"
					},
					{
						"tag": "day-storm"
					},
					{
						"tag": "divine agency"
					},
					{
						"tag": "divine wrath"
					}
				],
				"notes": [
					{
						"note": "orcid:http://orcid.org/0000-0002-6270-8368 | Sebastian Fink | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/787",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Wings, Weapons, and the Horned Tiara: Iconographic Representation of the Deity of the Mediterranean Sea in the Bronze Age",
				"creators": [
					{
						"firstName": "Joanna",
						"lastName": "Töyräänvuori",
						"creatorType": "author"
					}
				],
				"date": "2021/06/29",
				"DOI": "10.35068/aabner.v1i1.787",
				"ISSN": "2748-6419",
				"abstractNote": "Dieser Aufsatz bespricht die Ikonographie des vergöttlichten Mittelmeers&nbsp;in der syrischen Glyptik der mittleren und späten Bronzezeit im Lichte der&nbsp;textlichen Zeugnisse aus der Stadt Ugarit (Ras Shamra). Die Arbeit von&nbsp;Paolo Matthiae zur Erkennung des visuellen Vokabulars der Darstellung der&nbsp;Gottheit weiterführend, argumentiert der Aufsatz, dass der Grund für die&nbsp;Darstellung des Meeresgottes als geflügelte Gottheit in der antiken semitischen&nbsp;Vorstellung lag, wo er ein Rolle als Vermittler zwischen dem himmlischen und dem irdischen Ozean hat. Der Artikel liefert auch eine Heuristik für&nbsp;die Unterscheidung von Darstellungen des geflügelten Meeresgottes von den&nbsp;Darstellungen der geflügelten Göttin die zusammen mit Wasservögeln und&nbsp;Fischen abgebildet wird.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "ojs3.uni-tuebingen.de",
				"pages": "89-128",
				"publicationTitle": "Advances in Ancient, Biblical, and Near Eastern Research",
				"rights": "Copyright (c) 2021 Joanna Töyräänvuori",
				"shortTitle": "Wings, Weapons, and the Horned Tiara",
				"url": "https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/787",
				"volume": "1",
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
						"tag": "Bronze Age"
					},
					{
						"tag": "Mediterranean Sea"
					},
					{
						"tag": "North West Semitic"
					},
					{
						"tag": "Syrian glyptic"
					},
					{
						"tag": "Ugarit"
					},
					{
						"tag": "cylinder seals"
					},
					{
						"tag": "iconography"
					},
					{
						"tag": "sea god"
					}
				],
				"notes": [
					{
						"note": "orcid:http://orcid.org/0000-0003-4932-8755 | Joanna Töyräänvuori | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
