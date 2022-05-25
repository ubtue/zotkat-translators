{
	"translatorID": "8f0d9d23-f26e-4504-a022-6e39c9274744",
	"label": "ubtue_georgefox_tudublin",
	"creator": "Helena Nebel",
	"target": "(georgefox.edu|arrow.tudublin.ie)\\/.+\\/vol.+\\/iss.+\\/",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-25 09:44:15"
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
	if (url.match(/\/iss/) && getSearchResults(doc, true)) {
		return "multiple";
	} 
	else return "journalArticle";
}

function getSearchResults(doc, checkOnly) {
  let items = {};
  let found = false;
  
  rows = ZU.xpath(doc, '//div[@class="doc"]//a');
  for (let row of rows) {
	if (row.textContent != "PDF") {
	let href = ZU.xpathText(row, './@href');
	let title = row.textContent;
	if (!href || !title) continue;
	if (checkOnly) return true;
	found = true;
	items[href] = title;
  }
  }
  return found ? items : false;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (ZU.xpath(doc, '//div[@id="authors"]') != null) {
				let html = ZU.xpath(doc, '//body')[0].innerHTML.replace(/\n/g, '');
				if (html.match(/<p class="author"><a href=.+?><strong>(.+?)<\/strong>.+?<div id="orcid" class="element"><h4>Author ORCID Identifier<\/h4><p>ORCID: https:\/\/orcid.org\/(.+?)<\/p><\/div>/) != null) {
					let orcidInformation = html.match(/<p class="author"><a href=.+?><strong>(.+?)<\/strong>.+?<div id="orcid" class="element"><h4>Author ORCID Identifier<\/h4><p>ORCID: https:\/\/orcid.org\/(.+?)<\/p><\/div>/);
					let author = orcidInformation[1];
					let orcid = orcidInformation[2];
					i.notes.push({note:  author + ' | orcid:' + orcid + ' | ' + 'taken from website'});
		}
		}
		if (i.ISSN == "2693-2148" || i.ISSN == "2009-7379") {
			i.notes.push('artikelID:' + i.pages);
			i.pages = '';
			if (i.title.match(/^Book\s+review/gi) != null) i.tags.push('RezensionstagPica');
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
		"url": "https://digitalcommons.georgefox.edu/ree/vol42/iss1/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://digitalcommons.georgefox.edu/ree/vol42/iss1/2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Aspects of the Holocaust During the Slovak Autonomy Period (October 6, 1938, to March 14, 1939)",
				"creators": [
					{
						"firstName": "Madeline",
						"lastName": "Vadkerty",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.55221/2693-2148.2315",
				"ISSN": "2693-2148",
				"abstractNote": "Antisemitism was not a new phenomenon in Slovakia and can be traced back to the Middle Ages and beyond. Looking at the more recent past, after the Austro-Hungarian Compromise in 1867, Jews became equal citizens in the eyes of the state. The Hungarian Parliament passed an Act of Emancipation for Jews that same year, mainly for the purpose of economic development, which was beneficial for the Jewish population. A year later, Hungary's Nationality Act was issued as part of an active policy of magyarization (Hungarianization). However, it did not affect Jews, who were considered a religious group and not a national group. Jews thrived under these new conditions, but ethnic and national groups, such as the Slovaks who were subjected to the new legislation, possessed only limited linguistic and cultural rights.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "digitalcommons.georgefox.edu",
				"publicationTitle": "Occasional Papers on Religion in Eastern Europe",
				"url": "https://digitalcommons.georgefox.edu/ree/vol42/iss1/2",
				"volume": "42",
				"attachments": [],
				"tags": [],
				"notes": [
					"artikelID:2"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://digitalcommons.georgefox.edu/ree/vol42/iss1/7/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Book Review: Anna Niedźwiedź and Kaja Kajder, eds., Mapy miasta: Dziedzictwa i sacrum w przestrzeni Krakowa / Maps of the City: Heritages and the Sacred within Kraków’s Cityscape.",
				"creators": [
					{
						"firstName": "Christopher",
						"lastName": "Garbowski",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.55221/2693-2148.2320",
				"ISSN": "2693-2148",
				"abstractNote": "The book Maps of the City is the result of an exhibition at The Seweryn Udziela Ethnographic Museum in Kraków that was held between November 2017 and February 2018. As the subtitle makes clear, the exhibition focused on the place of heritage and the sacred within Kraków’s cityscape, together with the relationship between the two, both for the city’s residents and visitors. The latter group includes pilgrims. The curator of the exhibition was Anna Niedźwiedź, a cultural anthropologist at Jagiellonian University and author of The Image and the Figure: Our Lady of Częstochowa in Polish Culture and Popular Religion (2010). She is also one of the editors of the book. This richly illustrated volume is no mere catalogue of a museum exhibition. The editors, together with their team of anthropologists, have written essays based on original research that forms the basis of the exhibition and the chapters of the book. What we have in the end is a book that is both for the broader reading public and the scholar, and due to its bilingual form, both for Polish and English readers.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "digitalcommons.georgefox.edu",
				"publicationTitle": "Occasional Papers on Religion in Eastern Europe",
				"shortTitle": "Book Review",
				"url": "https://digitalcommons.georgefox.edu/ree/vol42/iss1/7",
				"volume": "42",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [
					"artikelID:7"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arrow.tudublin.ie/ijrtp/vol10/iss1/2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Religious Servicescape: Does Convenience Matter for Revisit Intentions and Positive Word of Mouth?",
				"creators": [
					{
						"firstName": "Ghada Talat",
						"lastName": "Alhothali",
						"creatorType": "author"
					},
					{
						"firstName": "Islam",
						"lastName": "Elgammal",
						"creatorType": "author"
					},
					{
						"firstName": "Felix T.",
						"lastName": "Mavondo",
						"creatorType": "author"
					}
				],
				"ISSN": "2009-7379",
				"abstractNote": "Umrah is an optional holy ritual that is highly rewarded when performed in the month of Ramadan. Hence, managing such an event is a challenging mission facing stakeholders. However, limited studies have examined the quality of services provided in the Umrah site (i.e., the Holy Mosque in the city of Makkah, Saudi Arabia) from the pilgrims’ perspective. The current study examines the influence of religious servicescape on service convenience and investigates whether service convenience matters to pilgrims. Further, the study tests the role of religious attractiveness (i.e., of the Kaaba) on pilgrims’ behavioural outcomes (i.e. intention to revisit and Positive Word of Mouth (PWOM). A Mixed-method approach is followed to collect rich data (i.e., quantitative and qualitative). The findings demonstrate that religious servicescape has a critical impact on service convenience. The results also show that service convenience is also a significant mediator between servicescape and PWOM. However, service convenience does not mediate the relationship between religious servicescape and intention to revisit. Consequently, service convenience in the religious context matters to pilgrims and the service provider. Further, Kaaba attractiveness creates a ‘halo’ effect.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "arrow.tudublin.ie",
				"publicationTitle": "International Journal of Religious Tourism and Pilgrimage",
				"shortTitle": "Religious Servicescape",
				"url": "https://arrow.tudublin.ie/ijrtp/vol10/iss1/2",
				"volume": "10",
				"attachments": [],
				"tags": [
					{
						"tag": "Kaaba"
					},
					{
						"tag": "Saudi Arabia"
					},
					{
						"tag": "Umrah"
					},
					{
						"tag": "religious servicescape"
					},
					{
						"tag": "service convenience"
					}
				],
				"notes": [
					"artikelID:2"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
