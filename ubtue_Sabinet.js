{
	"translatorID": "af110456-03a1-4335-9b39-613f2814cdd2",
	"label": "ubtue_Sabinet",
	"creator": "Timotheus Kim",
	"target": "^https://journals.co.za/[a-zA-Z]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-09 15:43:41"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
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
	if (url.includes('/doi'))
		return "journalArticle";
	else if (url.includes('/toc/') && getSearchResults(doc))
		return "multiple";
	else 
		return false
}


function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[@class="issue-item__title"]/a');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
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
	var risURL = "//journals.co.za/action/downloadCitation";
	var doi = ZU.xpathText(doc, '//meta[@name="dc.Identifier" and @scheme="doi"]/@content');
	if (!doi) {
		doi = url.match(/10\.[^?#]+/)[0];
	}
	var post = "doi=" + encodeURIComponent(doi) + "&include=abs&format=ris&direct=false&submit=Download+Citation";

	// Z.debug(pdfurl);
	// Z.debug(post);
	ZU.doPost(risURL, post, function (text) {
		// The publication date is saved in DA and the date first
		// appeared online is in Y1. Thus, we want to prefer DA over T1
		// and will therefore simply delete the later in cases both
		// dates are present.
		// Z.debug(text);
		if (text.includes("DA  - ")) {
			text = text.replace(/Y1[ ]{2}- .*\r?\n/, '');
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
			// The encoding of apostrophs in the RIS are incorrect and
			// therefore we extract the abstract again from the website.
			var abstract = ZU.xpathText(doc, '//article//div[contains(@class, "abstractSection")]/p');
			if (abstract) {
				item.abstractNote = abstract;
			}
			
			// Workaround while Sabinet hopefully fixes RIS for authors
			for (let i = 0; i < item.creators.length; i++) {
				if (!item.creators[i].firstName) {
					let type = item.creators[i].creatorType;
					let comma = item.creators[i].lastName.includes(",");
					item.creators[i] = ZU.cleanAuthor(item.creators[i].lastName, type, comma);
				}
			}
			// mark open access articles as "LF"
			let accessIcon = ZU.xpathText(doc, '//*[contains(@class, "citation__access__type")]');//Z.debug(accessIcon)
			if (accessIcon && accessIcon.match(/open\s+access/gi)) item.notes.push({note: 'LF:'});
			item.language = ZU.xpathText(doc, '//meta[@name="dc.Language"]/@content');
			//scraping orcid number 
			let authorSectionEntries = ZU.xpath(doc, '//*[contains(@class, "loa-accordion")]');//Z.debug(authorSectionEntries)
			for (let authorSectionEntry of authorSectionEntries) {
				let authorInfo = authorSectionEntry.textContent;//Z.debug(authorInfo)
				//let orcidHref = authorSectionEntry.querySelector('.textContent');
				if (authorInfo) {
					let author = authorInfo.split("http")[0];//Z.debug(author)
					let orcid = authorInfo.replace(/.*(\d{4}-\d+-\d+-\d+x?)/i, '$1').replace("Search for more papers by this author", "").trim();
					item.notes.push({note: "orcid:" + orcid + " | author=" + author + " | taken from website"});
				}
			}
			//deduplicate
			item.notes = Array.from(new Set(item.notes.map(JSON.stringify))).map(JSON.parse);
			//scraping keywords
			let keywordsEntry = ZU.xpathText(doc, '//a[starts-with(@href, "/keyword")]');
			if (keywordsEntry) {
				let keywords =  keywordsEntry.split(",");
				for (let keyword in keywords) {
					item.tags.push(keywords[keyword].replace(/^\w/gi,function(m){ return m.toUpperCase();}));
				}
			}
			//ISSN
			let lookupIssn = doc.querySelectorAll('#menu-item-pub_nav-1 a');//Z.debug(lookupIssn)
			if (!item.ISSN) {
				let post = lookupIssn[0].href.replace(/toc/, 'journal').replace(/current/, '');//Z.debug(post)
				ZU.processDocuments(post, function (scrapeIssn) {
					var issn = ZU.xpathText(scrapeIssn, '//*[(@class = "teaser__row")]');//Z.debug(eissn)
					if (issn && issn.match(/\d{4}-?\d{4}/gi)) {
						item.ISSN = issn.match(/\d{4}-?\d{4}/gi).toString();
					}
					item.complete();
				});
			}
		});
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://journals.co.za/doi/abs/10.17159/2312-3621/2020/v33n1a3",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Reading trauma narratives : insidious trauma in the story of Rachel, Leah, Bilhah and Zilpah (Genesis 29-30) and Margaret Atwood’s The Handmaid’s Tale",
				"creators": [
					{
						"firstName": "Claassens",
						"lastName": "Juliana",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2020",
				"DOI": "10.17159/2312-3621/2020/v33n1a3",
				"ISSN": "1010-9919",
				"abstractNote": "This article investigates the notion of insidious trauma as a helpful means of interpreting the story of Rachel, Leah, Bilhah and Zilpah as told in Genesis 29-30 that has found its way into the\n      haunting trauma narrative of Margaret Atwood’s The Handmaid’s Tale. In the first instance, this article outlines the category of insidious trauma as it is situated in terms of the broader field\n      of trauma hermeneutics, as well as the way in which it relates to the related disciplines of feminist and womanist biblical interpretation. This article will then continue to show how insidious\n      trauma features in two very different, though intrinsically connected trauma narratives, i.e., the world imagined by Atwood in The Handmaid’s Tale, and the biblical narrative regarding the four\n      women through whose reproductive efforts the house of Israel had been built that served as the inspiration for Atwood’s novel. This article argues that these trauma narratives, on the one hand,\n      reflect the ongoing effects of systemic violation in terms of gender, race and class, but also how, embedded in these narratives there are signs of resistance that serve as the basis of\n      survival of the self and also of others.",
				"issue": "1",
				"journalAbbreviation": "Old Testament Essays",
				"libraryCatalog": "ubtue_Sabinet",
				"pages": "10-31",
				"publicationTitle": "Old Testament Essays",
				"shortTitle": "Reading trauma narratives",
				"url": "https://doi.org/10.17159/2312-3621/2020/v33n1a3",
				"volume": "33",
				"attachments": [],
				"tags": [
					{
						"tag": " Bilhah"
					},
					{
						"tag": " Insiduous Trauma"
					},
					{
						"tag": " Leah"
					},
					{
						"tag": " Rachel"
					},
					{
						"tag": " Reproductive Loss"
					},
					{
						"tag": " The Handmaid’s Tale"
					},
					{
						"tag": " Zilpah"
					},
					{
						"tag": "Trauma narratives"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.17159/2312-3621/2020/v33n1a3</p>"
					},
					{
						"note": "LF:"
					},
					{
						"note": "orcid:Juliana Claassens | author= Juliana Claassens     Search for more papers by this author      | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.co.za/doi/abs/10.17159/2312-3621/2020/v33n1a3",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Reading trauma narratives : insidious trauma in the story of Rachel, Leah, Bilhah and Zilpah (Genesis 29-30) and Margaret Atwood’s The Handmaid’s Tale",
				"creators": [
					{
						"firstName": "Claassens",
						"lastName": "Juliana",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2020",
				"DOI": "10.17159/2312-3621/2020/v33n1a3",
				"ISSN": "1010-9919",
				"abstractNote": "This article investigates the notion of insidious trauma as a helpful means of interpreting the story of Rachel, Leah, Bilhah and Zilpah as told in Genesis 29-30 that has found its way into the\n      haunting trauma narrative of Margaret Atwood’s The Handmaid’s Tale. In the first instance, this article outlines the category of insidious trauma as it is situated in terms of the broader field\n      of trauma hermeneutics, as well as the way in which it relates to the related disciplines of feminist and womanist biblical interpretation. This article will then continue to show how insidious\n      trauma features in two very different, though intrinsically connected trauma narratives, i.e., the world imagined by Atwood in The Handmaid’s Tale, and the biblical narrative regarding the four\n      women through whose reproductive efforts the house of Israel had been built that served as the inspiration for Atwood’s novel. This article argues that these trauma narratives, on the one hand,\n      reflect the ongoing effects of systemic violation in terms of gender, race and class, but also how, embedded in these narratives there are signs of resistance that serve as the basis of\n      survival of the self and also of others.",
				"issue": "1",
				"journalAbbreviation": "Old Testament Essays",
				"libraryCatalog": "ubtue_Sabinet",
				"pages": "10-31",
				"publicationTitle": "Old Testament Essays",
				"shortTitle": "Reading trauma narratives",
				"url": "https://doi.org/10.17159/2312-3621/2020/v33n1a3",
				"volume": "33",
				"attachments": [],
				"tags": [
					{
						"tag": " Insiduous Trauma"
					},
					{
						"tag": " Leah"
					},
					{
						"tag": " Rachel"
					},
					{
						"tag": " Reproductive Loss"
					},
					{
						"tag": " The Handmaid’s Tale"
					},
					{
						"tag": " Trauma narratives"
					},
					{
						"tag": " Zilpah"
					},
					{
						"tag": "Bilhah"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.17159/2312-3621/2020/v33n1a3</p>"
					},
					{
						"note": "LF:"
					},
					{
						"note": "orcid:Juliana Claassens | author= Juliana Claassens     Search for more papers by this author      | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
