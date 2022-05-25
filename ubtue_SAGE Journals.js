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
	"lastUpdated": "2022-03-17 10:53:55"
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
					item.notes.push({note: "orcid:" + entryHTML.match(regexOrcid)[0] + ' | ' + entryHTML.match(regexName)[0].replace('\"', '').replace('author=', '')});
				}
			}
			
			//scrape ORCID at the bottom of text and split firstName and lastName for deduplicate notes. E.g. most of cases by reviews https://journals.sagepub.com/doi/10.1177/15423050211028189
			let ReviewAuthorSectionEntries = doc.querySelectorAll('.NLM_fn p');
			for (let ReviewAuthorSectionEntry of ReviewAuthorSectionEntries) {
				let entryInnerText = ReviewAuthorSectionEntry.innerText;
				let regexOrcid = /\d+-\d+-\d+-\d+x?/i;
				if(entryInnerText.match(regexOrcid) && entryInnerText.split('\n')[1] != undefined) {
					let authorEntry = entryInnerText.split('\n')[1].replace(/https:\/\/.*/, '');
					let fullName = entryInnerText.match(authorEntry)[0].replace('\"', '').trim();Z.debug(fullName)
					let	firstName = fullName.split(' ').slice(0, -1).join(' ');
					let	lastName = fullName.split(' ').slice(-1).join(' ');
					item.notes.push({note: "orcid:" + entryInnerText.match(regexOrcid)[0] + ' | ' + lastName + ', ' + firstName});
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
				item.notes.push({note: "abs:" + ZU.unescapeHTML(otherabstract.replace(/^Résumé/, ''))});
			} 
			else if (ubtueabstract != null) {
				item.abstractNote = ZU.unescapeHTML(ubtueabstract);
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
						item.tags.push('RezensionstagPica');
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
			let newNotes = [];
			for (let note of item.notes) {
				if (note['note'].match(/^(?:<p>)?doi:/) == null) newNotes.push(note)
				}
			item.notes = newNotes;
			item.language = ZU.xpathText(doc, '//meta[@name="dc.Language"]/@content');
			item.complete();
		});
		translator.translate();
	});
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/10.1177/00084298211036567",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "ACÉBAC: Les voix et les voies de l’Écriture",
				"creators": [
					{
						"lastName": "Luna",
						"firstName": "Rodolfo Felices",
						"creatorType": "author"
					}
				],
				"date": "September 1, 2021",
				"DOI": "10.1177/00084298211036567",
				"ISSN": "0008-4298",
				"abstractNote": "L’Association catholique d’études bibliques au Canada a été fondée en 1943 afin de promouvoir les études bibliques en français parmi le clergé catholique en charge de la formation académique des séminaristes. Au cours de ses 77 années d’existence, cette société savante a navigué à travers deux tournants herméneutiques majeurs : le déplacement d’attention de l’exégèse historico-critique vers les méthodes littéraires centrées sur le texte final, puis le déplacement subséquent vers les approches attentives aux lectrices et lecteurs. À partir de la Révolution tranquille au Québec, la composition de l’assemblée des membres s’est progressivement diversifiée, pour y inclure des laïcs, des femmes, des étranger.e.s à la foi catholique et des savant.e.s du monde séculier, sans affiliation religieuse professée ou connue. Le travail de l’exégèse est appelé à rencontrer le défi de l’interdisciplinarité, compte tenu de l’intérêt grandissant des sciences humaines et sociales pour le texte biblique.",
				"issue": "3",
				"journalAbbreviation": "Studies in Religion/Sciences Religieuses",
				"language": "en",
				"libraryCatalog": "ubtue_SAGE Journals",
				"pages": "336-343",
				"publicationTitle": "Studies in Religion/Sciences Religieuses",
				"shortTitle": "ACÉBAC",
				"url": "https://doi.org/10.1177/00084298211036567",
				"volume": "50",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " Canada"
					},
					{
						"tag": " French language"
					},
					{
						"tag": " biblical studies"
					},
					{
						"tag": " exegesis"
					},
					{
						"tag": " exégèse"
					},
					{
						"tag": " langue française"
					},
					{
						"tag": " learned societies"
					},
					{
						"tag": " sociétés savantesCanada"
					},
					{
						"tag": " études bibliques"
					}
				],
				"notes": [
					{
						"note": "abs:The Association catholique d’études bibliques au Canada was founded in 1943 to foster biblical studies in French among Roman Catholic clergy in charge of the academic instruction of seminarians. During its 77 years of existence, this learned society has navigated through two major hermeneutical turns in biblical studies : the shift of focus from historical-critical exegesis to final-text centered literary methods, and the shift from the latter to reader-conscious and reader-oriented approaches. The society’s membership has also widened to include non-clerics, women scholars, non-Catholics, and secular scholars, following the deep social transformation of the Révolution tranquille in Quebec and beyond. As interest in the Bible continues to grow among the humanities and social sciences, interdisciplinary work is both a challenge and an opportunity that guides the way forward."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/toc/pcca/current",
		"items": "multiple"
	}
]
/** END TEST CASES **/
