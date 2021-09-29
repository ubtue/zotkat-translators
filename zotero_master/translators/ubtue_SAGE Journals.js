{
	"translatorID": "bb53844a-2adf-4b6a-989b-d0266674f3af",
	"label": "ubtue_SAGE Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://journals\\.sagepub\\.com(/toc)?(/doi/((abs|full|pdf)/)?10\\.|/action/doSearch\\?|/toc/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-29 13:11:43"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2016 Philipp Zumstein
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

// SAGE uses Atypon, but as of now this is too distinct from any existing Atypon sites to make sense in the same translator.

// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
	if (url.includes('/abs/10.') || url.includes('/full/10.') || url.includes('/pdf/10.') || url.includes('/doi/10.')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	let rows = ZU.xpath(doc, '//span[contains(@class, "art_title")]/a[contains(@href, "/doi/full/10.") or contains(@href, "/doi/abs/10.") or contains(@href, "/doi/pdf/10.")][1] | //a[contains(concat( " ", @class, " " ), concat( " ", "ref", " " )) and contains(concat( " ", @class, " " ), concat( " ", "nowrap", " " ))] | //*[contains(concat( " ", @class, " " ), concat( " ", "hlFld-Title", " " ))]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent.replace(/Citation|ePub.*|Abstract/, ''));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		href = href.replace("/doi/pdf/", "/doi/abs/");
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var risURL = "//journals.sagepub.com/action/downloadCitation";
	var doi = ZU.xpathText(doc, '//meta[@name="dc.Identifier" and @scheme="doi"]/@content');
	if (!doi) {
		doi = url.match(/10\.[^?#]+/)[0];
	}
	var post = "doi=" + encodeURIComponent(doi) + "&include=abs&format=ris&direct=false&submit=Download+Citation";
	var pdfurl = "//" + doc.location.host + "/doi/pdf/" + doi;
	var articleType = ZU.xpath(doc, '//span[@class="ArticleType"]/span');
	//Z.debug(pdfurl);
	//Z.debug(post);
	ZU.doPost(risURL, post, function (text) {
		//The publication date is saved in DA and the date first
		//appeared online is in Y1. Thus, we want to prefer DA over T1
		//and will therefore simply delete the later in cases both
		//dates are present.
		//Z.debug(text);
		if (text.includes("DA  - ")) {
			text = text.replace(/Y1\s{2}- .*\r?\n/, '');
		}

		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			// The subtitle will be neglected in RIS and is only present in
			// the website itself. Moreover, there can be problems with
			// encodings of apostrophs.
			var subtitle = ZU.xpathText(doc, '//div[contains(@class, "publicationContentSubTitle")]/h1');
			var title = ZU.xpathText(doc, '//div[contains(@class, "publicationContentTitle")]/h1');
			if (title) {
				item.title = title.trim();
				if (subtitle) {
					item.title += ': ' + subtitle.trim();
				}
			}
			//if author name include "(Translator)" change creatorType and delete "(Translator" from lastName e.g. https://journals.sagepub.com/doi/full/10.1177/0040573620947051
			for (let i in item.creators) {
				let translator = item.creators[i].lastName;
				if (item.creators[i].lastName.match(/\(?Translator\)?/)) {
					item.creators[i].creatorType = "translator";
					item.creators[i].lastName = item.creators[i].lastName.replace('(Translator)', '');
				}
			}
			//scrape ORCID from website e.g. https://journals.sagepub.com/doi/full/10.1177/0084672419883339
			let authorSectionEntries = doc.querySelectorAll('.author-section-div');
			for (let authorSectionEntry of authorSectionEntries) {
				    let entryHTML = authorSectionEntry.innerHTML;
					let regexOrcid = /\d+-\d+-\d+-\d+x?/i;
					let regexName = /author=.*"/;
					if(entryHTML.match(regexOrcid)) {
						item.notes.push({note: "orcid:" + entryHTML.match(regexOrcid)[0] + ' | ' + entryHTML.match(regexName)[0].replace('\"', '')});
					}
			}
			// Workaround to address address weird incorrect multiple extraction by both querySelectorAll and xpath
			// So, let's deduplicate...
			item.notes = Array.from(new Set(item.notes.map(JSON.stringify))).map(JSON.parse);
			// ubtue: extract translated and other abstracts from the different xpath
			var ubtueabstract = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "abstractInFull", " " ))]');
			var otherabstract = ZU.xpathText(doc, '//article//div[contains(@class, "tabs-translated-abstract")]/p');
			var abstract = ZU.xpathText(doc, '//article//div[contains(@class, "abstractSection")]/p');
			if (abstract) {
				item.abstractNote = abstract;
			}
			if (otherabstract) {
				item.notes.push({note: "abs:" + otherabstract.replace(/^Résumé/, '')});
			} else {
				item.abstractNote = ubtueabstract;
			}			

			var tagentry = ZU.xpathText(doc, '//kwd-group[1] | //*[contains(concat( " ", @class, " " ), concat( " ", "hlFld-KeywordText", " " ))]');
			if (tagentry) {
				item.tags = tagentry.replace(/.*Keywords/, ',').replace(/Mots-clés/, ',').split(",");
			}
			// ubtue: add tags "Book Review" if ""Book Review"
			if (articleType) {
				for (let r of articleType) {
					var reviewDOIlink = r.innerHTML;
					if (reviewDOIlink.match(/(product|book)\s+reviews?/i)) {
						item.tags.push('Book Review');
					} else if (reviewDOIlink.match(/article\s+commentary|review\s+article/i)) { //"Review article", "Article commentary" as Keywords
						item.tags.push(reviewDOIlink)
					}
				}
			}
			//ubtue: add tag "Book Review" in every issue 5 of specific journals if the dc.Type is "others"
			let reviewType = ZU.xpathText(doc, '//meta[@name="dc.Type"]/@content');
			if (item.ISSN === '0142-064X' || item.ISSN === '0309-0892') {
				if (reviewType && reviewType.match(/other/i) && item.issue === '5') {
					item.tags.push('Book Review');
					item.notes.push({note: "Booklist:" + item.date.match(/\d{4}$/)});
					if (item.abstractNote && item.abstractNote.match(/,(?!\s\w)/g)) {
						item.abstractNote = '';	
					}
				}
			}	
			// numbering issues with slash, e.g. in case of  double issue "1-2" > "1/2"
			if (item.issue) item.issue = item.issue.replace('-', '/');
			
			// ubtue: add tags "Book Review" if "Review Article"
			if (articleType) {
				for (let r of articleType) {
					let reviewDOIlink = r.textContent;
					if (reviewDOIlink.match(/Review Article/)) {
						item.tags.push('RezensionstagPica');
					}
				}
			}
			// Workaround while Sage hopefully fixes RIS for authors
			for (let i = 0; i < item.creators.length; i++) {
				if (!item.creators[i].firstName) {
					let type = item.creators[i].creatorType;
					let comma = item.creators[i].lastName.includes(",");
					item.creators[i] = ZU.cleanAuthor(item.creators[i].lastName, type, comma);
				}
			}
			// scrape tags
			if (!item.tags || item.tags.length === 0) {
				var embedded = ZU.xpathText(doc, '//meta[@name="keywords"]/@content');
				if (embedded) item.tags = embedded.split(",");
				if (!item.tags) {
					var tags = ZU.xpath(doc, '//div[@class="abstractKeywords"]//a');
					if (tags) item.tags = tags.map(n => n.textContent);
				}
			}
			// mark articles as "LF" (MARC=856 |z|kostenfrei), that are published as open access
			let accessIcon = doc.querySelector('.accessIcon[alt]');
			if (accessIcon && accessIcon.alt.match(/open\s+access/gi)) item.notes.push({note: 'LF:'});
			
			item.language = ZU.xpathText(doc, '//meta[@name="dc.Language"]/@content');
			item.complete();
		});
		translator.translate();
	});
}

/** END TEST CASES **//** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/abs/10.1177/1754073910380971",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Emotion and Regulation are One!",
				"creators": [
					{
						"lastName": "Kappas",
						"firstName": "Arvid",
						"creatorType": "author"
					}
				],
				"date": "January 1, 2011",
				"DOI": "10.1177/1754073910380971",
				"ISSN": "1754-0739",
				"abstractNote": "Emotions are foremost self-regulating processes that permit rapid responses and adaptations to situations of personal concern. They have biological bases and are shaped ontogenetically via learning and experience. Many situations and events of personal concern are social in nature. Thus, social exchanges play an important role in learning about rules and norms that shape regulation processes. I argue that (a) emotions often are actively auto-regulating—the behavior implied by the emotional reaction bias to the eliciting event or situation modifies or terminates the situation; (b) certain emotion components are likely to habituate dynamically, modifying the emotional states; (c) emotions are typically intra- and interpersonal processes at the same time, and modulating forces at these different levels interact; (d) emotions are not just regulated—they regulate. Important conclusions of my arguments are that the scientific analysis of emotion should not exclude regulatory processes, and that effortful emotion regulation should be seen relative to a backdrop of auto-regulation and habituation, and not the ideal notion of a neutral baseline. For all practical purposes unregulated emotion is not a realistic concept.",
				"issue": "1",
				"journalAbbreviation": "Emotion Review",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "17-25",
				"publicationTitle": "Emotion Review",
				"url": "https://doi.org/10.1177/1754073910380971",
				"volume": "3",
				"attachments": [],
				"tags": [
					{
						"tag": " emotion regulation"
					},
					{
						"tag": " facial expression"
					},
					{
						"tag": " facial feedback"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/1754073910380971</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/toc/rera/86/3",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0954408914525387",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Brookfield powder flow tester – Results of round robin tests with CRM-116 limestone powder",
				"creators": [
					{
						"lastName": "Berry",
						"firstName": "RJ",
						"creatorType": "author"
					},
					{
						"lastName": "Bradley",
						"firstName": "MSA",
						"creatorType": "author"
					},
					{
						"lastName": "McGregor",
						"firstName": "RG",
						"creatorType": "author"
					}
				],
				"date": "August 1, 2015",
				"DOI": "10.1177/0954408914525387",
				"ISSN": "0954-4089",
				"abstractNote": "A low cost powder flowability tester for industry has been developed at The Wolfson Centre for Bulk Solids Handling Technology, University of Greenwich in collaboration with Brookfield Engineering and four food manufacturers: Cadbury, Kerry Ingredients, GSK and United Biscuits. Anticipated uses of the tester are primarily for quality control and new product development, but it can also be used for storage vessel design.This paper presents the preliminary results from ‘round robin’ trials undertaken with the powder flow tester using the BCR limestone (CRM-116) standard test material. The mean flow properties have been compared to published data found in the literature for the other shear testers.",
				"issue": "3",
				"journalAbbreviation": "Proceedings of the Institution of Mechanical Engineers, Part E: Journal of Process Mechanical Engineering",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "215-230",
				"publicationTitle": "Proceedings of the Institution of Mechanical Engineers, Part E: Journal of Process Mechanical Engineering",
				"url": "https://doi.org/10.1177/0954408914525387",
				"volume": "229",
				"attachments": [],
				"tags": [
					{
						"tag": " BCR limestone powder (CRM-116)"
					},
					{
						"tag": " Brookfield powder flow tester"
					},
					{
						"tag": " Jenike shear cell"
					},
					{
						"tag": " Schulze ring shear tester"
					},
					{
						"tag": " Shear cell"
					},
					{
						"tag": " characterizing powder flowability"
					},
					{
						"tag": " flow function"
					},
					{
						"tag": " reproducibility"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0954408914525387</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/action/doSearch?AllField=test&",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/1541204015581389",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Moffitt’s Developmental Taxonomy and Gang Membership: An Alternative Test of the Snares Hypothesis",
				"creators": [
					{
						"lastName": "Petkovsek",
						"firstName": "Melissa A.",
						"creatorType": "author"
					},
					{
						"lastName": "Boutwell",
						"firstName": "Brian B.",
						"creatorType": "author"
					},
					{
						"lastName": "Barnes",
						"firstName": "J. C.",
						"creatorType": "author"
					},
					{
						"lastName": "Beaver",
						"firstName": "Kevin M.",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2016",
				"DOI": "10.1177/1541204015581389",
				"ISSN": "1541-2040",
				"abstractNote": "Moffitt’s taxonomy remains an influential theoretical framework within criminology. Despite much empirical scrutiny, comparatively less time has been spent testing the snares component of Moffitt’s work. Specifically, are there factors that might engender continued criminal involvement for individuals otherwise likely to desist? The current study tested whether gang membership increased the odds of contact with the justice system for each of the offender groups specified in Moffitt’s original developmental taxonomy. Our findings provided little evidence that gang membership increased the odds of either adolescence-limited or life-course persistent offenders being processed through the criminal justice system. Moving forward, scholars may wish to shift attention to alternative variables—beyond gang membership—when testing the snares hypothesis.",
				"issue": "4",
				"journalAbbreviation": "Youth Violence and Juvenile Justice",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "335-349",
				"publicationTitle": "Youth Violence and Juvenile Justice",
				"shortTitle": "Moffitt’s Developmental Taxonomy and Gang Membership",
				"url": "https://doi.org/10.1177/1541204015581389",
				"volume": "14",
				"attachments": [],
				"tags": [
					{
						"tag": " Moffitt’s developmental taxonomy"
					},
					{
						"tag": " delinquency"
					},
					{
						"tag": " gang membership"
					},
					{
						"tag": " snares"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/1541204015581389</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/2056997119868248",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Discernment, technology, and digital citizenship in a Christian school system",
				"creators": [
					{
						"lastName": "Smith",
						"firstName": "David I",
						"creatorType": "author"
					},
					{
						"lastName": "Sevensma",
						"firstName": "Kara",
						"creatorType": "author"
					}
				],
				"date": "July 1, 2020",
				"DOI": "10.1177/2056997119868248",
				"ISSN": "2056-9971",
				"abstractNote": "Using a qualitative analysis of school artifacts, this article analyzes the documentary record of one Christian school system’s experience with technological change. It focuses on documentary evidence for how the concept of Christian discernment was deployed to situate new technologies within a Christian discourse. The idea of discernment shifted in emphasis as new technologies were implemented. The theologically rooted concept of discernment both shaped and was shaped by the ongoing effort to manage technological change. Examining this evolution offers an empirical contribution to discussions of how Christian schools can sustain an integrity of fit between faith and practice.",
				"issue": "2",
				"journalAbbreviation": "International Journal of Christianity & Education",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "135-152",
				"publicationTitle": "International Journal of Christianity & Education",
				"url": "https://doi.org/10.1177/2056997119868248",
				"volume": "24",
				"attachments": [],
				"tags": [
					{
						"tag": " Christian schools"
					},
					{
						"tag": " digital citizenship"
					},
					{
						"tag": " digital technology"
					},
					{
						"tag": " discernment"
					},
					{
						"tag": " school leadership"
					},
					{
						"tag": " theology"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/2056997119868248</p>"
					},
					{
						"note": "orcid:0000-0002-9890-7342 | author=Smith, David I"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0040571X20944577",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Praying to win: reflections on the involvement of God in the outcomes of sport",
				"creators": [
					{
						"lastName": "Smith",
						"firstName": "Jason M.",
						"creatorType": "author"
					}
				],
				"date": "September 1, 2020",
				"DOI": "10.1177/0040571X20944577",
				"ISSN": "0040-571X",
				"abstractNote": "This article applies to sport the question: to what extent is God involved in the outcomes of worldly affairs? It examines Lincoln Harvey’s assertion that sport is one unique area of creation in which God has left the outcomes entirely up to us, as a ‘liturgical celebration of our contingency’. Not entirely satisfied with this answer, I take up concepts from Kathryn Tanner’s work to try to arrive at a solution wherein God’s providential care over all worldly affairs is maintained but with sufficient care so as not to imagine God choosing one team over another during every sporting event.",
				"issue": "5",
				"journalAbbreviation": "Theology",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "329-336",
				"publicationTitle": "Theology",
				"shortTitle": "Praying to win",
				"url": "https://doi.org/10.1177/0040571X20944577",
				"volume": "123",
				"attachments": [],
				"tags": [
					{
						"tag": " Kathryn Tanner"
					},
					{
						"tag": " Lincoln Harvey"
					},
					{
						"tag": " contingency"
					},
					{
						"tag": " providence"
					},
					{
						"tag": " sport"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0040571X20944577</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/2056997120919765",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Covenant and pedagogy",
				"creators": [
					{
						"lastName": "Faber",
						"firstName": "Ben",
						"creatorType": "author"
					}
				],
				"date": "November 1, 2020",
				"DOI": "10.1177/2056997120919765",
				"ISSN": "2056-9971",
				"abstractNote": "This article argues that “covenant” ought to serve universally as a framework for education, beyond the exclusive sense of covenant in use in Reformed Christian education. The article begins with covenant as creation’s answerable relationship with the Creator, then offers a brief account of language as a form of covenantal exchange, and concludes with pedagogy as a function of the covenantal structures of being and of speaking.",
				"issue": "3",
				"journalAbbreviation": "International Journal of Christianity & Education",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "254-268",
				"publicationTitle": "International Journal of Christianity & Education",
				"url": "https://doi.org/10.1177/2056997120919765",
				"volume": "24",
				"attachments": [],
				"tags": [
					{
						"tag": " Speech Act Theory"
					},
					{
						"tag": " answerability"
					},
					{
						"tag": " covenant theology"
					},
					{
						"tag": " philosophy of education"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/2056997120919765</p>"
					},
					{
						"note": "orcid:0000-0002-8821-3988 | author=Faber, Ben"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0014524620944817",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Commentary on the Letter of Polycarp to the Philippians",
				"creators": [
					{
						"lastName": "Foster",
						"firstName": "Paul",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2020",
				"DOI": "10.1177/0014524620944817",
				"ISSN": "0014-5246",
				"issue": "1",
				"journalAbbreviation": "The Expository Times",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "40-40",
				"publicationTitle": "The Expository Times",
				"url": "https://doi.org/10.1177/0014524620944817",
				"volume": "132",
				"attachments": [],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0014524620944817</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0014524620944817",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Commentary on the Letter of Polycarp to the Philippians",
				"creators": [
					{
						"lastName": "Foster",
						"firstName": "Paul",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2020",
				"DOI": "10.1177/0014524620944817",
				"ISSN": "0014-5246",
				"issue": "1",
				"journalAbbreviation": "The Expository Times",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "40-40",
				"publicationTitle": "The Expository Times",
				"url": "https://doi.org/10.1177/0014524620944817",
				"volume": "132",
				"attachments": [],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0014524620944817</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/toc/pcca/75/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/1542305020962013",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Stanford, M. S. (2019). Grace for the Children: Finding Hope in the Midst of Child and Adolescent Mental Illness",
				"creators": [
					{
						"lastName": "Welch",
						"firstName": "Barbara Kathleen",
						"creatorType": "author"
					}
				],
				"date": "March 1, 2021",
				"DOI": "10.1177/1542305020962013",
				"ISSN": "1542-3050",
				"issue": "1",
				"journalAbbreviation": "J Pastoral Care Counsel",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "75-76",
				"publicationTitle": "Journal of Pastoral Care & Counseling",
				"shortTitle": "Stanford, M. S. (2019). Grace for the Children",
				"url": "https://doi.org/10.1177/1542305020962013",
				"volume": "75",
				"attachments": [],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/1542305020962013</p>"
					},
					{
						"note": "orcid:0000-0001-5215-0447 | author=Welch, Barbara Kathleen"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
