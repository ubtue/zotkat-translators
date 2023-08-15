{
	"translatorID": "93ebb1de-fbe0-4f97-b866-b5fbb4a14d2f",
	"label": "ubtue_David_Publishing",
	"creator": "Paula Hähndel",
	"target": "http://www.davidpublisher.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-15 09:23:44"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	Modified 2023 by Paula Hähndel
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
	if (url.includes("Article")) {
		return "journalArticle";
	} else if (getSearchResults(doc, url)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, url) {
	var items = {};
	var found = false;
	let baseurl = url.substring(0,url.substring(8).indexOf("/")+8);
	var rows = ZU.xpath(doc, '//div[@style="text-align:justify;"]');
	for (let i = 0; i < rows.length; i++) {
		let href = baseurl + rows[i].innerHTML.match(/<a\s+href="([^"]*)"/)[1];
		let title = ZU.trimInternal(rows[i].textContent);
		if (title.includes("Front Matter")) continue;
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
  if (detectWeb(doc, url) == "multiple") {
	Zotero.selectItems(getSearchResults(doc, url, false), function (items) {
	  if (items) ZU.processDocuments(Object.keys(items), scrape);
	});
  } else
  {
	scrape(doc, url);
  }
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("c159dcfe-8a53-4301-a499-30f6549c340d");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.itemType = "journalArticle";
		if (i.DOI.match(/\/\d{4}-\d{3}.\//)) {
			i.ISSN = i.DOI.match(/\/(\d{4}-\d{3}.)\//)[1];
		}
		if (i.creators) {
			for (let j in i.creators) {
				if (i.creators[j].lastName && !i.creators[j].firstName) {
					let name = i.creators[j].lastName;
					i.creators[j].lastName = name.substring(name.lastIndexOf(" ")+1);
					i.creators[j].firstName = name.substring(0,name.lastIndexOf(" "));
					delete i.creators[j].fieldMode;
				}
			}
		}
		if (ZU.xpath(doc, '//div[@class="downimg"]')) {
			if (ZU.xpathText(doc, '//div[@class="downimg"]').match(/Open\s+Access/)) {
				i.notes.push({note : "LF:"});
			}
		}
		if (i.pages) i.pages = i.pages.trim().replace(/^([^-]+)-\1$/, '$1');
		let text = ZU.xpathText(doc, "//div[@class='newslist']");
		if (text.match(/abstract/i)) {
			i.abstract = text.match(/abstract\s+([^\n]+)\n/i)[1];
		}
		if (text.match(/keyword/i)) {
			let tags = text.match(/keywords?\s+([^\n]+)\n/i)[1];
			tags = tags.split(", ");
			for (let j in tags) i.tags.push(tags[j].trim().replace(/^[a-zA-ZÀ-ÿ-. ]/, function($0) { return $0.toUpperCase(); }));
		}
		/*if (ZU.xpathText(doc, '//section[@class="section"]//a') && ZU.xpathText(doc, '//section[@class="section"]//a').includes("Review")) {
			i.notes.push({"note": "RezensionstagPica"})
		}*/
		i.attachments = [];
		if (!i.language) i.language = "eng";
		i.complete();
	});
	translator.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.davidpublisher.com/index.php/Home/Journal/detail?journalid=42&jx=CRS&cont=allissues",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.davidpublisher.com/index.php/Home/Article/index?id=49395.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Bellini’s Norma and the Challenge of Regieoper",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Ephraim",
						"lastName": "David"
					}
				],
				"date": "2023-07-28",
				"DOI": "10.17265/2328-2177/2023.07.001",
				"ISSN": "2328-2177",
				"issue": "7",
				"journalAbbreviation": "JCRS",
				"language": "eng",
				"libraryCatalog": "DOI.org (Crossref)",
				"publicationTitle": "Journal of Cultural and Religious Studies",
				"url": "http://www.davidpublisher.com/index.php/Home/Article/index?id=49395.html",
				"volume": "11",
				"attachments": [],
				"tags": [
					{
						"tag": "Adaptability"
					},
					{
						"tag": "Director’s opera"
					},
					{
						"tag": "Faithfulness to the original"
					},
					{
						"tag": "Inner coherence"
					}
				],
				"notes": [
					{
						"note": "LF:"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.davidpublisher.com/index.php/Home/Article/index?id=35101.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Biological Diffusion Coefficient for 3D Tumor Growth in Homogeneous Media",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Noha M.",
						"lastName": "Salem"
					},
					{
						"creatorType": "author",
						"firstName": "Manal M.",
						"lastName": "Awad"
					},
					{
						"creatorType": "author",
						"firstName": "Amina M.",
						"lastName": "Sakr"
					},
					{
						"creatorType": "author",
						"firstName": "Medhat A.",
						"lastName": "ElMessiery"
					}
				],
				"date": "2018-01-28",
				"DOI": "10.17265/1934-7332/2018.01.002",
				"ISSN": "1934-7332",
				"issue": "1",
				"journalAbbreviation": "CTA",
				"language": "eng",
				"libraryCatalog": "DOI.org (Crossref)",
				"publicationTitle": "Computer Technology and Application",
				"url": "http://www.davidpublisher.org/index.php/Home/Article/index?id=35101.html",
				"volume": "8",
				"attachments": [],
				"tags": [
					{
						"tag": "Biological diffusion coefficient"
					},
					{
						"tag": "Stochastic modelling"
					},
					{
						"tag": "Tumor growth"
					}
				],
				"notes": [
					{
						"note": "LF:"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
