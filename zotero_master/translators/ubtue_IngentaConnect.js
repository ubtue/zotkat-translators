{
	"translatorID": "07590ac4-49da-4cbb-b91f-5525fd6c47f1",
	"label": "ubtue_IngentaConnect",
	"creator": "Michael Berkowitz",
	"target": "^https?://(www\\.)?ingentaconnect\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-14 15:54:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Michael Berkowitz
	
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

// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
	Z.debug(url);
	if (url.includes("article?") || url.includes("article;") || url.includes("/art")) {
		return "journalArticle";
	}
	// permalinks
	else if (url.includes("/content/") && getRisUrl(doc)) {
		return "journalArticle";
	}
	else if ((url.includes("search") && getSearchResults(doc)) || (url.match(/content\//) && getSearchResults(doc))) {
		return "multiple";
	}
	
	return false;
}

function getSearchResults(doc) {
	var items = {}, found = false;
	var rows = ZU.xpath(doc, '//strong/a');
	for (var i = 0; i < rows.length; i++) {
		var id = ZU.xpathText(rows[i], './@href');
		var title = ZU.xpathText(rows[i], './@title');
		if (!id || !title) {
			continue;
		}
		else {
			found = true;
			items[id] = title;
		}
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

function getRisUrl(doc) {
	return ZU.xpathText(doc, '//div[contains(@class,"export-formats")]/ul/li/a[contains(text(), "EndNote")]/@href');
}

function scrape(newDoc, url) {
	var abs, pdf;
	var risurl = getRisUrl(newDoc);
	if (ZU.xpathText(newDoc, '//div[@id="abstract"]')) {
		abs = Zotero.Utilities.trimInternal(ZU.xpathText(newDoc, '//div[@id="abstract"]')).substr(10);
	}
	var articleID = ZU.xpathText(newDoc, '/html/head/meta[@name="IC.identifier"]/@content');
	if (articleID) {
		pdf = '/search/download?pub=infobike://' + articleID + '&mimetype=application/pdf';
	}
	else {
		pdf = url.replace(/[?&#].*/, '')
			.replace('/content/', '/search/download?pub=infobike://')
			+ '&mimetype=application/pdf';
	}
	if (ZU.xpathText(newDoc, '//div[@id="info"]/p[1]/a')) {
		var keywords = ZU.xpathText(newDoc, '//div[@id="info"]/p[1]/a');
		var key;
		var keys = [];
		while (key == keywords.iterateNext()) {
			keys.push(Zotero.Utilities.capitalizeTitle(key.textContent, true));
		}
	}
	Zotero.Utilities.HTTP.doGet(risurl, function (text) {
		// fix spacing per spec
		text = text.replace(/([A-Z0-9]{2})  ?-/g, "$1  -");
		// Zotero.debug(text);
		text = text.replace(/(PY\s+-\s+)\/+/, "$1");
		text = text.replace(/ER\s\s-/, "") + "\nER  - ";
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			if (abs) item.abstractNote = abs;
			if (pdf) item.attachments.push({ url: pdf, title: "IngentaConnect Full Text PDF", mimeType: "application/pdf" });
			// Note that the RIS translator gives us a link to the record already
			item.url = null;
			if (keys) item.tags = keys;
			if (item.date) item.date = item.date.replace(/T00:00:00\/*/, "");
			if (item.DOI) {
				if (item.DOI.match(/^doi:/)) {
					item.DOI = item.DOI.substr(4);
				}
			}
			let ISSN = ZU.xpathText(newDoc, '//meta[@name="DCTERMS.isPartOf"]/@content');Z.debug(ISSN)
			if (ISSN) item.ISSN = ISSN.match(/\d{4}-\d{4}/).toString();
			item.complete();
		});
		translator.translate();
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ingentaconnect.com/search%3bjsessionid=296g394n0j012.alice?form_name=quicksearch&ie=%25E0%25A5%25B0&value1=argentina&option1=tka&x=0&y=0",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Linking logistics to strategy in Argentina",
				"creators": [
					{
						"lastName": "Carranza",
						"firstName": "Octavio",
						"creatorType": "author"
					},
					{
						"lastName": "Maltz",
						"firstName": "Arnold",
						"creatorType": "author"
					},
					{
						"lastName": "Ant�n",
						"firstName": "Juan Pablo",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"DOI": "10.1108/09600030210437988",
				"issue": "6",
				"journalAbbreviation": "International Journal of Physical Distribution & Logistics Management",
				"libraryCatalog": "ubtue_IngentaConnect",
				"publicationTitle": "International Journal of Physical Distribution & Logistics Management",
				"volume": "32",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Argentina"
					},
					{
						"tag": "Benchmarking"
					},
					{
						"tag": "Customer Service"
					},
					{
						"tag": "Logistics"
					},
					{
						"tag": "Strategy"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "The development of short food supply chain for locally produced honey : Understanding consumers’ opinions and willingness to pay in Argentina",
				"creators": [
					{
						"lastName": "Kallas",
						"firstName": "Zein",
						"creatorType": "author"
					},
					{
						"lastName": "Alba",
						"firstName": "Martin Federico",
						"creatorType": "author"
					},
					{
						"lastName": "Casellas",
						"firstName": "Karina",
						"creatorType": "author"
					},
					{
						"lastName": "Berges",
						"firstName": "Miriam",
						"creatorType": "author"
					},
					{
						"lastName": "Degreef",
						"firstName": "Gustavo",
						"creatorType": "author"
					},
					{
						"lastName": "Gil",
						"firstName": "José M.",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.1108/BFJ-01-2019-0070",
				"issue": "5",
				"journalAbbreviation": "British Food Journal",
				"libraryCatalog": "ubtue_IngentaConnect",
				"pages": "1664-1680",
				"publicationTitle": "British Food Journal",
				"shortTitle": "The development of short food supply chain for locally produced honey",
				"volume": "123",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Argentina"
					},
					{
						"tag": "Hedonic evaluation"
					},
					{
						"tag": "Local honey"
					},
					{
						"tag": "Non-hypothetical discrete choice experiment"
					},
					{
						"tag": "Short food supply chains"
					},
					{
						"tag": "Willingness to pay"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Alcohol use disorders and antiretroviral therapy among prisoners in Argentina",
				"creators": [
					{
						"lastName": "Alpert",
						"firstName": "Michael",
						"creatorType": "author"
					},
					{
						"lastName": "Wickersham",
						"firstName": "Jeffrey A.",
						"creatorType": "author"
					},
					{
						"lastName": "Vázquez",
						"firstName": "Mariana",
						"creatorType": "author"
					},
					{
						"lastName": "Altice",
						"firstName": "Frederick L.",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"DOI": "10.1108/17449201311310797",
				"issue": "1",
				"journalAbbreviation": "International Journal of Prisoner Health",
				"libraryCatalog": "ubtue_IngentaConnect",
				"publicationTitle": "International Journal of Prisoner Health",
				"volume": "9",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Alcohol use disorders"
					},
					{
						"tag": "Argentina"
					},
					{
						"tag": "Criminals"
					},
					{
						"tag": "HIV/AIDS"
					},
					{
						"tag": "Personal health"
					},
					{
						"tag": "Social support"
					},
					{
						"tag": "Substance abuse"
					},
					{
						"tag": "Substance misuse"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Argentina’s Defence Deficit",
				"creators": [
					{
						"lastName": "Battaleme",
						"firstName": "Juan",
						"creatorType": "author"
					},
					{
						"lastName": "Santibañes",
						"firstName": "Francisco de",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.1080/00396338.2019.1637123",
				"issue": "4",
				"journalAbbreviation": "Survival",
				"libraryCatalog": "ubtue_IngentaConnect",
				"pages": "63-78",
				"publicationTitle": "Survival",
				"volume": "61",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "An analysis of intercultural bilingual education in Argentina",
				"creators": [
					{
						"lastName": "Hecht",
						"firstName": "Ana Carolina",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.1108/JME-12-2013-0036",
				"issue": "2",
				"journalAbbreviation": "Journal for Multicultural Education",
				"libraryCatalog": "ubtue_IngentaConnect",
				"publicationTitle": "Journal for Multicultural Education",
				"volume": "8",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Argentina"
					},
					{
						"tag": "Decentralization"
					},
					{
						"tag": "Diversity"
					},
					{
						"tag": "Education"
					},
					{
						"tag": "Educational policy"
					},
					{
						"tag": "Ethnolinguistic minorities"
					},
					{
						"tag": "Inequality"
					},
					{
						"tag": "Intercultural"
					},
					{
						"tag": "Intercultural bilingual education"
					},
					{
						"tag": "Neoliberal"
					},
					{
						"tag": "Regionalization"
					},
					{
						"tag": "Teacher profiles"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "A New Species of Mastigostyla (Iridaceae) from Argentina",
				"creators": [
					{
						"lastName": "Donadío",
						"firstName": "Sabina",
						"creatorType": "author"
					},
					{
						"lastName": "Nicola",
						"firstName": "Marcela V.",
						"creatorType": "author"
					},
					{
						"lastName": "Scataglini",
						"firstName": "María A.",
						"creatorType": "author"
					},
					{
						"lastName": "Pozner",
						"firstName": "Raúl",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"DOI": "10.1600/036364416X692280",
				"issue": "3",
				"journalAbbreviation": "Systematic Botany",
				"libraryCatalog": "ubtue_IngentaConnect",
				"pages": "714-719",
				"publicationTitle": "Systematic Botany",
				"volume": "41",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Andes"
					},
					{
						"tag": "South America"
					},
					{
						"tag": "Tigridieae"
					},
					{
						"tag": "taxonomy"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Clitocybula azurea in Argentina: redescription and phylogenetic position",
				"creators": [
					{
						"lastName": "Niveiro",
						"firstName": "Nicolás",
						"creatorType": "author"
					},
					{
						"lastName": "Alberti",
						"firstName": "Melisa",
						"creatorType": "author"
					},
					{
						"lastName": "Ramírez",
						"firstName": "Natalia A.",
						"creatorType": "author"
					},
					{
						"lastName": "Albertó",
						"firstName": "Edgardo O.",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.5248/136.235",
				"issue": "1",
				"journalAbbreviation": "Mycotaxon",
				"libraryCatalog": "ubtue_IngentaConnect",
				"pages": "235-247",
				"publicationTitle": "Mycotaxon",
				"shortTitle": "Clitocybula azurea in Argentina",
				"volume": "136",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "AGARICALES"
					},
					{
						"tag": "ATLANTIC FOREST"
					},
					{
						"tag": "ITS"
					},
					{
						"tag": "MARASMIACEAE"
					},
					{
						"tag": "MUSHROOM"
					},
					{
						"tag": "TAXONOMY"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "The relevance of public policies for the sustainability of community media: Lessons from Argentina",
				"creators": [
					{
						"lastName": "Segura",
						"firstName": "Mara Soledad",
						"creatorType": "author"
					},
					{
						"lastName": "Linares",
						"firstName": "Alejandro",
						"creatorType": "author"
					},
					{
						"lastName": "Espada",
						"firstName": "Agustn",
						"creatorType": "author"
					},
					{
						"lastName": "Longo",
						"firstName": "Vernica",
						"creatorType": "author"
					},
					{
						"lastName": "Hidalgo",
						"firstName": "Ana Laura",
						"creatorType": "author"
					},
					{
						"lastName": "Traversaro",
						"firstName": "Natalia",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.1386/joacm_00050_1",
				"issue": "2",
				"journalAbbreviation": "Journal of Alternative & Community Media",
				"libraryCatalog": "ubtue_IngentaConnect",
				"pages": "74-90",
				"publicationTitle": "Journal of Alternative & Community Media",
				"shortTitle": "The relevance of public policies for the sustainability of community media",
				"volume": "4",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Community media"
					},
					{
						"tag": "human rights"
					},
					{
						"tag": "legalisation policy"
					},
					{
						"tag": "promotion policy"
					},
					{
						"tag": "sustainability"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Strategic capabilities, competitive strategy, and performance among retailers in Argentina, Peru and the United States",
				"creators": [
					{
						"lastName": "Parnell",
						"firstName": "John A.",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"DOI": "10.1108/00251741111094482",
				"issue": "1",
				"journalAbbreviation": "Management Decision",
				"libraryCatalog": "ubtue_IngentaConnect",
				"publicationTitle": "Management Decision",
				"volume": "49",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Argentina"
					},
					{
						"tag": "Competitive strategy"
					},
					{
						"tag": "Peru"
					},
					{
						"tag": "Spain"
					},
					{
						"tag": "Strategic groups"
					},
					{
						"tag": "United States of America"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Socio-economic Segregation with (without) Competitive Education Policies. A Comparative Analysis of Argentina and Chile",
				"creators": [
					{
						"lastName": "Narodowski",
						"firstName": "Mariano",
						"creatorType": "author"
					},
					{
						"lastName": "Nores",
						"firstName": "Milagros",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"DOI": "10.1080/0305006022000030720",
				"issue": "4",
				"journalAbbreviation": "Comparative Education",
				"libraryCatalog": "ubtue_IngentaConnect",
				"publicationTitle": "Comparative Education",
				"volume": "38",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.ingentaconnect.com/content/tpp/ep/2014/00000010/00000001/art00001",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Strategies for enabling the use of research evidence",
				"creators": [
					{
						"lastName": "Gough",
						"firstName": "David",
						"creatorType": "author"
					},
					{
						"lastName": "Boaz",
						"firstName": "Annette",
						"creatorType": "author"
					}
				],
				"date": "2014-01-01",
				"DOI": "10.1332/174426413X13836441441630",
				"ISSN": "1744-2648",
				"issue": "1",
				"journalAbbreviation": "Evidence & Policy: A Journal of Research, Debate and Practice",
				"libraryCatalog": "ubtue_IngentaConnect",
				"pages": "3-4",
				"publicationTitle": "Evidence & Policy: A Journal of Research, Debate and Practice",
				"volume": "10",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.ingentaconnect.com/search/article?option1=title&value1=credibility+associated+with+how+often+they+present+research+evidence+to+public+or+partly+government-owned+organisations&sortDescending=true&sortField=default&pageSize=10&index=1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Are indicators of faculty members' credibility associated with how often they present research evidence to public or partly government-owned organisations? A cross-sectional survey",
				"creators": [
					{
						"lastName": "Ouimet",
						"firstName": "Mathieu",
						"creatorType": "author"
					},
					{
						"lastName": "Bédard",
						"firstName": "Pierre-Olivier",
						"creatorType": "author"
					},
					{
						"lastName": "Léon",
						"firstName": "Grégory",
						"creatorType": "author"
					},
					{
						"lastName": "Dagenais",
						"firstName": "Christian",
						"creatorType": "author"
					}
				],
				"date": "2014-01-01",
				"DOI": "10.1332/174426413X662699",
				"ISSN": "1744-2648",
				"abstractNote": "This study provides an empirical test of the assumption that the credibility of the messenger is one of the factors that influence knowledge mobilisation among policy makers. This general hypothesis was tested using a database of 321 social scientists from the province of Quebec that\ncombines survey and bibliometric data. A regression model was used to study the association between indicators of faculty members' credibility and the number of times they have presented research evidence to public or partly government-owned organisations over an 18-month period. Overall,\nempirical results provide new evidence supporting the credibility hypothesis.",
				"issue": "1",
				"journalAbbreviation": "Evidence & Policy: A Journal of Research, Debate and Practice",
				"libraryCatalog": "ubtue_IngentaConnect",
				"pages": "5-27",
				"publicationTitle": "Evidence & Policy: A Journal of Research, Debate and Practice",
				"shortTitle": "Are indicators of faculty members' credibility associated with how often they present research evidence to public or partly government-owned organisations?",
				"volume": "10",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "CREDIBILITY"
					},
					{
						"tag": "CROSS-SECTIONAL SURVEY"
					},
					{
						"tag": "FACULTY MEMBERS"
					},
					{
						"tag": "KNOWLEDGE TRANSFER"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ingentaconnect.com/search/article?option1=tka&value1=search&pageSize=10&index=1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Search engine optimisation in 2017: A new world where old rules still matter",
				"creators": [
					{
						"lastName": "Alpert",
						"firstName": "Brian",
						"creatorType": "author"
					}
				],
				"date": "2017-03-01",
				"ISSN": "2050-0076",
				"abstractNote": "The ability for website content to be found on search engines has always been a concern for anyone managing a website. Search has evolved, however, and improving ‘findability’ means more today than ever, in no small part due to the sophisticated technologies underpinning\ntoday’s search engines. This paper discusses the current state of search, provides an overview of still-important variables and techniques for search engine optimisation, and discusses newer, important considerations. Also discussed are priorities for relaunching an existing site (or\nlaunching a new one), and a look at current trends that illuminate where things are heading.",
				"issue": "1",
				"journalAbbreviation": "Journal of Digital & Social Media Marketing",
				"libraryCatalog": "ubtue_IngentaConnect",
				"pages": "39-60",
				"publicationTitle": "Journal of Digital & Social Media Marketing",
				"shortTitle": "Search engine optimisation in 2017",
				"volume": "5",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "SEO"
					},
					{
						"tag": "engine"
					},
					{
						"tag": "findability"
					},
					{
						"tag": "marketing"
					},
					{
						"tag": "optimisation"
					},
					{
						"tag": "rank"
					},
					{
						"tag": "search"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ingentaconnect.com/contentone/itc/ce/2021/00000016/00000002/art00002;jsessionid=5we4wiqelhv2.x-ic-live-01",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Autism and the Image of God: on Becoming a Mobile and Reproductive Church",
				"creators": [
					{
						"lastName": "Brock",
						"firstName": "Brian",
						"creatorType": "author"
					}
				],
				"date": "2021-09-21",
				"ISSN": "1550-4891",
				"abstractNote": "Disabilities like autism invite the church to reconsider the meaning and grammar of the gospel message. The reality that most people with disabilities do not feel positively welcome in churches has several root causes, some of which may trace back to truncated Christian accounts of\nthe image of God. The paper suggests that churches who want to become more open to the gifts of people God has for them through people with disabilities should ask: \"How do we image God toward those with disabilities?\" It was this latter question that oriented the interest of Christians during\nthe patristic period in the social outcasts in their societies, as it continues to motivate some Christians in the non-Western world as they enact love in very practical ways for people their own society discards. I conclude with a personal example of how this new theological perspective reshapes\nChristians' ways of living as church.",
				"issue": "2",
				"journalAbbreviation": "Cultural Encounters",
				"libraryCatalog": "ubtue_IngentaConnect",
				"pages": "5-20",
				"publicationTitle": "Cultural Encounters",
				"shortTitle": "Autism and the Image of God",
				"volume": "16",
				"attachments": [
					{
						"title": "IngentaConnect Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
