{
	"translatorID": "4304cce6-240c-477c-95a0-11e19d2e5021",
	"label": "ubtue_DOAJ",
	"creator": "Helena Nebel",
	"target": "doaj.org",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-20 10:14:32"
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
	if (url.match(/\/toc\//)) {
	// placeholder, the Embedded Metadata translator fills in the correct item type
	return "multiple";
	}
	else if (url.match(/\/article\//)) {
	// placeholder, the Embedded Metadata translator fills in the correct item type
	return "journalArticle";
	}
}

function getSearchResults(doajJSON, url, checkOnly) {
	var items = {};
	var found = false;
	let rows = doajJSON["results"];
	for (var i=0; i<rows.length; i++) {
		let title = rows[i]["bibjson"]["title"];
		let href = "https://www.doaj.org/article/" + rows[i]["id"];
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function scrape(doc, url) {
	let articleID = url.replace("https://www.doaj.org/article/", "");
	ZU.doGet("https://doaj.org/api/v2/search/articles/id:" + articleID, function(text) {
		let articleJSON = JSON.parse(text);
		let bibJSON = articleJSON["results"][0]["bibjson"];
		item = new Zotero.Item("journalArticle");
		item.title = bibJSON["title"];
		item.abstractNote = bibJSON["abstract"];
		for (let identifier of bibJSON["identifier"]) {
			if (identifier["type"] == "doi") {
				item.DOI = identifier["id"];
			}
			else if (identifier["type"] == "eissn") {
				item.ISSN = identifier["id"];
			}
		}
		item.volume = bibJSON["journal"]["volume"];
		item.issue = bibJSON["journal"]["number"];
		item.date = bibJSON["year"];
		item.tags = bibJSON["keywords"];
		for (let creator of bibJSON["author"]) {
			let newCreator = ZU.cleanAuthor(creator["name"]);
			newCreator["creatorType"] = "author";
			item.creators.push(newCreator);
			if (creator["orcid_id"] != "") {
				item.notes.push({note: "orcid:" + creator["orcid_id"] + ' | ' + creator["name"] + ' | '});
			}
		}
		item.pages = bibJSON["start_page"];
		if (bibJSON["end_page"] != "") {
			item.pages += "-" + bibJSON["end_page"];
		}
		item.url = url;
		item.complete();
		});
	
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
	let issn = url.match(/\/toc\/([^?]+)/)[1];
	url = "https://doaj.org/api/v2/search/articles/issn:" + issn;
	Z.debug(url);
	ZU.doGet(url, function(text) {
		let doajJSON = JSON.parse(text);
		Zotero.selectItems(getSearchResults(doajJSON, url, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape, doajJSON);
		});
		});
	}
	else {
		
		scrape(doc, url);
	}
}

/*
Beispiel-JSON:
[{"last_updated": "2021-12-06T10:40:14Z", 
"bibjson": {"identifier": [{"id": "10.34291/Edinost/76/02/Budiselic", "type": "doi"}, 
{"id": "2335-4127", "type": "pissn"}, {"id": "2385-8907", "type": "eissn"}], 
"journal": {"volume": "76", "number": "2", "country": "SI", "issns": ["2335-4127", "2385-8907"], 
"publisher": "Faculty of Theology, University of Ljubljana, Slovenia, EU", 
"language": ["DE", "EN", "HR", "IT", "SL"], "title": "Edinost in Dialog"}, 
"month": "12", "end_page": "157", "keywords": ["liturgy", "free churches", 
"liturgical churches", "worship service", "worship"], "year": "2021", "start_page": "131", 
"subject": [{"code": "BL660-2680", "scheme": "LCC", "term": "History and principles of religions"}, 
{"code": "BV1-5099", "scheme": "LCC", "term": "Practical Theology"}, 
{"code": "BL1-50", "scheme": "LCC", "term": "Religion (General)"}], 
"author": [{"orcid_id": "", 
"affiliation": "Biblical Institute of Zagreb, Ku\u0161lanova 21, HR-10000 Zagreb, HR, EU", 
"name": "Ervin Budiseli\u0107"}, 
{"orcid_id": "", 
"affiliation": "Biblical Institute of Zagreb, Ku\u0161lanova 21, HR-10000 Zagreb, HR, EU", 
"name": "Dalibor Kraljik"}], "link": [], 
"abstract": "This article deals with the relationship between form and content in the context of a church service by observing and comparing church services and forms of worship in free churches in comparison to liturgical churches. Special emphasis has been put on the reflection about the \u226bliturgy\u226a among free churches, on the detection of possible wrong practices and on offering solutions in light of the New Testament. Furthermore, the \u226bliturgy\u226a among free churches is compared to churches with a strict liturgical structure, aiming to conclude what liturgical churches can offer to non-liturgical or free churches in terms of worship through a comparative overview of the two worship traditions. In the first part of the article, the sources and basic characteristics of worship in both free churches and in liturgical churches are presented and compared. In the second part of the article, an overview is given of the mutual misconceptions between the free and liturgical churches. Arguments for the criticism of liturgical worship services as well as free church worship services are presented. In the third and concluding part of the article, special focus is put on the existent issues in free church worship services, while offering viable solutions on how to potentially correct problematic areas of worship services in free churches based on the New Testament and on certain aspects present in liturgical churches that are also in harmony with the New Testament.", 
"title": "\u226bLiturgy\u226a of Free Churches"}, 
"id": "965f04641261431f8b9744a1273d742b", 
"created_date": "2021-12-06T10:40:14Z"},
*/


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ajol.info/index.php/thrb/article/view/63347",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Knowledge, treatment seeking and preventive practices in respect of malaria among patients with HIV at the Lagos University Teaching Hospital",
				"creators": [
					{
						"firstName": "Akinwumi A.",
						"lastName": "Akinyede",
						"creatorType": "author"
					},
					{
						"firstName": "Alade",
						"lastName": "Akintonwa",
						"creatorType": "author"
					},
					{
						"firstName": "Charles",
						"lastName": "Okany",
						"creatorType": "author"
					},
					{
						"firstName": "Olufunsho",
						"lastName": "Awodele",
						"creatorType": "author"
					},
					{
						"firstName": "Duro C.",
						"lastName": "Dolapo",
						"creatorType": "author"
					},
					{
						"firstName": "Adebimpe",
						"lastName": "Adeyinka",
						"creatorType": "author"
					},
					{
						"firstName": "Ademola",
						"lastName": "Yusuf",
						"creatorType": "author"
					}
				],
				"date": "2011/10/17",
				"DOI": "10.4314/thrb.v13i4.63347",
				"ISSN": "1821-9241",
				"abstractNote": "The synergistic interaction between Human Immunodeficiency virus (HIV) disease and Malaria makes it mandatory for patients with HIV to respond appropriately in preventing and treating malaria. Such response will help to control the two diseases. This study assessed the knowledge of 495 patients attending the HIV clinic, in Lagos University Teaching Hospital, Nigeria.&nbsp; Their treatment seeking, preventive practices with regards to malaria, as well as the impact of socio &ndash; demographic / socio - economic status were assessed. Out of these patients, 245 (49.5 %) used insecticide treated bed nets; this practice was not influenced by socio &ndash; demographic or socio &ndash; economic factors.&nbsp; However, knowledge of the cause, knowledge of prevention of malaria, appropriate use of antimalarial drugs and seeking treatment from the right source increased with increasing level of education (p &lt; 0.05). A greater proportion of the patients, 321 (64.9 %) utilized hospitals, pharmacy outlets or health centres when they perceived an attack of malaria. Educational intervention may result in these patients seeking treatment from the right place when an attack of malaria fever is perceived.",
				"issue": "4",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "www.ajol.info",
				"publicationTitle": "Tanzania Journal of Health Research",
				"rights": "Copyright (c)",
				"url": "https://www.ajol.info/index.php/thrb/article/view/63347",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scholarworks.umass.edu/climate_nuclearpower/2011/nov19/34/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Session F: Contributed Oral Papers – F2: Energy, Climate, Nuclear Medicine: Reducing Energy Consumption and CO2 One Street Lamp at a Time",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Somssich",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"abstractNote": "Why wait for federal action on incentives to reduce energy use and address  Greenhouse Gas (GHG) reductions (e.g. CO2), when we can take personal  actions right now in our private lives and in our communities? One such  initiative by private citizens working with Portsmouth NH officials resulted  in the installation of energy reducing lighting products on Court St. and  the benefits to taxpayers are still coming after over 4 years of operation.  This citizen initiative to save money and reduce CO2 emissions, while only  one small effort, could easily be duplicated in many towns and cities.  Replacing old lamps in just one street fixture with a more energy efficient  (Non-LED) lamp has resulted after 4 years of operation ($\\sim $15,000 hr.  life of product) in real electrical energy savings of $>$ {\\$}43. and CO2  emission reduction of $>$ 465 lbs. The return on investment (ROI) was less  than 2 years. This is much better than any financial investment available  today and far safer. Our street only had 30 such lamps installed; however,  the rest of Portsmouth (population 22,000) has at least another 150 street  lamp fixtures that are candidates for such an upgrade. The talk will also  address other energy reduction measures that green the planet and also put  more green in the pockets of citizens and municipalities.",
				"conferenceName": "Climate Change and the Future of Nuclear Power",
				"language": "en",
				"libraryCatalog": "scholarworks.umass.edu",
				"shortTitle": "Session F",
				"url": "https://scholarworks.umass.edu/climate_nuclearpower/2011/nov19/34",
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
		"url": "https://scholarworks.umass.edu/lov/vol2/iss1/2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Wabanaki Resistance and Healing: An Exploration of the Contemporary Role of an Eighteenth Century Bounty Proclamation in an Indigenous Decolonization Process",
				"creators": [
					{
						"firstName": "Bonnie D.",
						"lastName": "Newsom",
						"creatorType": "author"
					},
					{
						"firstName": "Jamie",
						"lastName": "Bissonette-Lewey",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"DOI": "10.7275/R5KW5CXB",
				"ISSN": "1947-508X",
				"abstractNote": "The purpose of this paper is to examine the contemporary role of an eighteenth century bounty proclamation issued on the Penobscot Indians of Maine. We focus specifically on how the changing cultural context of the 1755 Spencer Phips Bounty Proclamation has transformed the document from serving as a tool for sanctioned violence to a tool of decolonization for the Indigenous peoples of Maine. We explore examples of the ways indigenous and non-indigenous people use the Phips Proclamation to illustrate past violence directed against Indigenous peoples. This exploration is enhanced with an analysis of the re-introduction of the Phips Proclamation using concepts of decolonization theory.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "scholarworks.umass.edu",
				"pages": "2",
				"publicationTitle": "Landscapes of Violence",
				"shortTitle": "Wabanaki Resistance and Healing",
				"url": "https://scholarworks.umass.edu/lov/vol2/iss1/2",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scholarworks.umass.edu/open_access_dissertations/508/",
		"items": [
			{
				"itemType": "thesis",
				"title": "Decision-Theoretic Meta-reasoning in Partially Observable and Decentralized Settings",
				"creators": [
					{
						"firstName": "Alan Scott",
						"lastName": "Carlin",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"abstractNote": "This thesis examines decentralized meta-reasoning. For a single agent or multiple agents, it may not be enough for agents to compute correct decisions if they do not do so in a timely or resource efficient fashion. The utility of agent decisions typically increases with decision quality, but decreases with computation time. The reasoning about one's computation process is referred to as meta-reasoning. Aspects of meta-reasoning considered in this thesis include the reasoning about how to allocate computational resources, including when to stop one type of computation and begin another, and when to stop all computation and report an answer. Given a computational model, this translates into computing how to schedule the basic computations that solve a problem. This thesis constructs meta-reasoning strategies for the purposes of monitoring and control in multi-agent settings, specifically settings that can be modeled by the Decentralized Partially Observable Markov Decision Process (Dec-POMDP). It uses decision theory to optimize computation for efficiency in time and space in communicative and non-communicative decentralized settings. Whereas base-level reasoning describes the optimization of actual agent behaviors, the meta-reasoning strategies produced by this thesis dynamically optimize the computational resources which lead to the selection of base-level behaviors.",
				"extra": "DOI: 10.7275/n8e9-xy93",
				"language": "en",
				"libraryCatalog": "scholarworks.umass.edu",
				"university": "University of Massachusetts Amherst",
				"url": "https://scholarworks.umass.edu/open_access_dissertations/508",
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
		"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/en/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Perceptions of HIV rapid testing among injecting drug users in Brazil",
				"creators": [
					{
						"firstName": "P. R.",
						"lastName": "Telles-Dias",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Westman",
						"creatorType": "author"
					},
					{
						"firstName": "A. E.",
						"lastName": "Fernandez",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Sanchez",
						"creatorType": "author"
					}
				],
				"date": "2007-12",
				"DOI": "10.1590/S0034-89102007000900015",
				"ISSN": "0034-8910, 0034-8910, 1518-8787",
				"abstractNote": "OBJETIVO: Descrever as impressões, experiências, conhecimentos, crenças e a receptividade de usuários de drogas injetáveis para participar das estratégias de testagem rápida para HIV. MÉTODOS: Estudo qualitativo exploratório foi conduzido entre usuários de drogas injetáveis, de dezembro de 2003 a fevereiro de 2004, em cinco cidades brasileiras, localizadas em quatro regiões do País. Um roteiro de entrevista semi-estruturado contendo questões fechadas e abertas foi usado para avaliar percepções desses usuários sobre procedimentos e formas alternativas de acesso e testagem. Foram realizadas 106 entrevistas, aproximadamente 26 por região. RESULTADOS: Características da população estudada, opiniões sobre o teste rápido e preferências por usar amostras de sangue ou saliva foram apresentadas junto com as vantagens e desvantagens associadas a cada opção. Os resultados mostraram a viabilidade do uso de testes rápidos entre usuários de drogas injetáveis e o interesse deles quanto à utilização destes métodos, especialmente se puderem ser equacionadas questões relacionadas à confidencialidade e confiabilidade dos testes. CONCLUSÕES: Os resultados indicam que os testes rápidos para HIV seriam bem recebidos por essa população. Esses testes podem ser considerados uma ferramenta valiosa, ao permitir que mais usuários de drogas injetáveis conheçam sua sorologia para o HIV e possam ser referidos para tratamento, como subsidiar a melhoria das estratégias de testagem entre usuários de drogas injetáveis.",
				"journalAbbreviation": "Rev. Saúde Pública",
				"language": "en",
				"libraryCatalog": "scielosp.org",
				"pages": "94-100",
				"publicationTitle": "Revista de Saúde Pública",
				"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/en/",
				"volume": "41",
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
		"url": "https://www.hindawi.com/journals/mpe/2013/868174/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Robust Filtering for Networked Stochastic Systems Subject to Sensor Nonlinearity",
				"creators": [
					{
						"firstName": "Guoqiang",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Jianwei",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Yuguang",
						"lastName": "Bai",
						"creatorType": "author"
					}
				],
				"date": "2013/02/20",
				"DOI": "10.1155/2013/868174",
				"ISSN": "1024-123X",
				"abstractNote": "The problem of network-based robust filtering for stochastic systems with sensor nonlinearity is investigated in this paper. In the network environment, the effects of the sensor saturation, output quantization, and network-induced delay are taken into simultaneous consideration, and the output measurements received in the filter side are incomplete. The random delays are modeled as a linear function of the stochastic variable described by a Bernoulli random binary distribution. The derived criteria for performance analysis of the filtering-error system and filter design are proposed which can be solved by using convex optimization method. Numerical examples show the effectiveness of the design method.",
				"language": "en",
				"libraryCatalog": "www.hindawi.com",
				"publicationTitle": "Mathematical Problems in Engineering",
				"url": "https://www.hindawi.com/journals/mpe/2013/868174/",
				"volume": "2013",
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
		"url": "https://volokh.com/2013/12/22/northwestern-cant-quit-asa-boycott-member/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Northwestern Can't Quit ASA Over Boycott Because it is Not a Member",
				"creators": [
					{
						"firstName": "Eugene",
						"lastName": "Kontorovich",
						"creatorType": "author"
					}
				],
				"date": "2013-12-22T11:58:34-05:00",
				"abstractNote": "Northwestern University recently condemned the American Studies Association boycott of Israel. Unlike some other schools that quit their institutional membership in the ASA over the boycott, Northwestern has not. Many of my Northwestern colleagues were about to start urging a similar withdrawal. Then we learned from our administration that despite being listed as in institutional …",
				"blogTitle": "The Volokh Conspiracy",
				"language": "en-US",
				"url": "https://volokh.com/2013/12/22/northwestern-cant-quit-asa-boycott-member/",
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
		"url": "https://hbr.org/2015/08/how-to-do-walking-meetings-right",
		"items": [
			{
				"itemType": "webpage",
				"title": "How to Do Walking Meetings Right",
				"creators": [
					{
						"firstName": "Russell",
						"lastName": "Clayton",
						"creatorType": "author"
					},
					{
						"firstName": "Christopher",
						"lastName": "Thomas",
						"creatorType": "author"
					},
					{
						"firstName": "Jack",
						"lastName": "Smothers",
						"creatorType": "author"
					}
				],
				"date": "2015-08-05T12:05:17Z",
				"abstractNote": "New research finds creativity benefits.",
				"url": "https://hbr.org/2015/08/how-to-do-walking-meetings-right",
				"websiteTitle": "Harvard Business Review",
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
		"url": "https://olh.openlibhums.org/article/id/4400/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Opening the Open Library of Humanities",
				"creators": [
					{
						"firstName": "Martin Paul",
						"lastName": "Eve",
						"creatorType": "author"
					},
					{
						"firstName": "Caroline",
						"lastName": "Edwards",
						"creatorType": "author"
					}
				],
				"date": "2015-09-28 00:00",
				"DOI": "10.16995/olh.46",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "olh.openlibhums.org",
				"publicationTitle": "Open Library of Humanities",
				"url": "https://olh.openlibhums.org/article/id/4400/",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vox.com/2016/1/7/10726296/wheres-rey-star-wars-monopoly",
		"items": [
			{
				"itemType": "webpage",
				"title": "#WheresRey and the big Star Wars toy controversy, explained",
				"creators": [
					{
						"firstName": "Caroline",
						"lastName": "Framke",
						"creatorType": "author"
					}
				],
				"date": "2016-01-07T08:20:02-05:00",
				"abstractNote": "Excluding female characters in merchandise is an ongoing pattern.",
				"language": "en",
				"url": "https://www.vox.com/2016/1/7/10726296/wheres-rey-star-wars-monopoly",
				"websiteTitle": "Vox",
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
		"url": "http://www.diva-portal.org/smash/record.jsf?pid=diva2%3A766397&dswid=334",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Mobility modeling for transport efficiency : Analysis of travel characteristics based on mobile phone data",
				"creators": [
					{
						"firstName": "Vangelis",
						"lastName": "Angelakis",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Gundlegård",
						"creatorType": "author"
					},
					{
						"firstName": "Clas",
						"lastName": "Rydergren",
						"creatorType": "author"
					},
					{
						"firstName": "Botond",
						"lastName": "Rajna",
						"creatorType": "author"
					},
					{
						"firstName": "Katerina",
						"lastName": "Vrotsou",
						"creatorType": "author"
					},
					{
						"firstName": "Richard",
						"lastName": "Carlsson",
						"creatorType": "author"
					},
					{
						"firstName": "Julien",
						"lastName": "Forgeat",
						"creatorType": "author"
					},
					{
						"firstName": "Tracy H.",
						"lastName": "Hu",
						"creatorType": "author"
					},
					{
						"firstName": "Evan L.",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Simon",
						"lastName": "Moritz",
						"creatorType": "author"
					},
					{
						"firstName": "Sky",
						"lastName": "Zhao",
						"creatorType": "author"
					},
					{
						"firstName": "Yaotian",
						"lastName": "Zheng",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"abstractNote": "DiVA portal is a finding tool for research publications and student theses written at the following 50 universities and research institutions.",
				"conferenceName": "Netmob 2013 - Third International Conference on the Analysis of Mobile Phone Datasets, May 1-3, 2013, MIT, Cambridge, MA, USA",
				"language": "eng",
				"libraryCatalog": "www.diva-portal.org",
				"shortTitle": "Mobility modeling for transport efficiency",
				"url": "http://urn.kb.se/resolve?urn=urn:nbn:se:liu:diva-112443",
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
		"url": "https://link.springer.com/article/10.1023/A:1021669308832",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Why Bohm's Quantum Theory?",
				"creators": [
					{
						"firstName": "H. D.",
						"lastName": "Zeh",
						"creatorType": "author"
					}
				],
				"date": "1999/04/01",
				"DOI": "10.1023/A:1021669308832",
				"ISSN": "1572-9524",
				"abstractNote": "This is a brief reply to S. Goldstein's article “Quantum theory without observers” in Physics Today. It is pointed out that Bohm's pilot wave theory is successful only because it keeps Schrödinger's (exact) wave mechanics unchanged, while the rest of it is observationally meaningless and solely based on classical prejudice.",
				"issue": "2",
				"journalAbbreviation": "Found Phys Lett",
				"language": "en",
				"libraryCatalog": "link.springer.com",
				"pages": "197-200",
				"publicationTitle": "Foundations of Physics Letters",
				"rights": "1999 Plenum Publishing Corporation",
				"url": "https://link.springer.com/article/10.1023/A:1021669308832",
				"volume": "12",
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
		"url": "https://muse.jhu.edu/article/234097",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Serfs on the Move: Peasant Seasonal Migration in Pre-Reform Russia, 1800–61",
				"creators": [
					{
						"firstName": "Boris B.",
						"lastName": "Gorshkov",
						"creatorType": "author"
					}
				],
				"date": "2000",
				"DOI": "10.1353/kri.2008.0061",
				"ISSN": "1538-5000",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "muse.jhu.edu",
				"pages": "627-656",
				"publicationTitle": "Kritika: Explorations in Russian and Eurasian History",
				"shortTitle": "Serfs on the Move",
				"url": "https://muse.jhu.edu/article/234097",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://media.ccc.de/v/35c3-9386-introduction_to_deep_learning",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Introduction to Deep Learning",
				"creators": [
					{
						"firstName": "",
						"lastName": "teubi",
						"creatorType": "author"
					}
				],
				"date": "2018-12-27 01:00:00 +0100",
				"abstractNote": "This talk will teach you the fundamentals of machine learning and give you a sneak peek into the internals of the mystical black box. You...",
				"language": "en",
				"libraryCatalog": "media.ccc.de",
				"url": "https://media.ccc.de/v/35c3-9386-introduction_to_deep_learning",
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
		"url": "https://upcommons.upc.edu/handle/2117/114657",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Necesidad y morfología: la forma racional",
				"creators": [
					{
						"firstName": "Antonio A.",
						"lastName": "García García",
						"creatorType": "author"
					}
				],
				"date": "2015-06",
				"ISBN": "9788460842118",
				"abstractNote": "Abstracts aceptados sin presentacion / Accepted abstracts without presentation",
				"conferenceName": "International Conference Arquitectonics Network: Architecture, Education and Society, Barcelona, 3-5 June 2015: Abstracts",
				"language": "spa",
				"libraryCatalog": "upcommons.upc.edu",
				"publisher": "GIRAS. Universitat Politècnica de Catalunya",
				"rights": "Open Access",
				"shortTitle": "Necesidad y morfología",
				"url": "https://upcommons.upc.edu/handle/2117/114657",
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
		"url": "https://www.pewresearch.org/fact-tank/2019/12/12/u-s-children-more-likely-than-children-in-other-countries-to-live-with-just-one-parent/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "U.S. has world’s highest rate of children living in single-parent households",
				"creators": [
					{
						"firstName": "Stephanie",
						"lastName": "Kramer",
						"creatorType": "author"
					}
				],
				"abstractNote": "Almost a quarter of U.S. children under 18 live with one parent and no other adults, more than three times the share of children around the world who do so.",
				"blogTitle": "Pew Research Center",
				"language": "en-US",
				"url": "https://www.pewresearch.org/fact-tank/2019/12/12/u-s-children-more-likely-than-children-in-other-countries-to-live-with-just-one-parent/",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
		"items": [
			{
				"itemType": "webpage",
				"title": "Conservation Research, Policy and Practice",
				"creators": [
					{
						"firstName": "William J.",
						"lastName": "Sutherland",
						"creatorType": "editor"
					},
					{
						"firstName": "Peter N. M.",
						"lastName": "Brotherton",
						"creatorType": "editor"
					},
					{
						"firstName": "Zoe G.",
						"lastName": "Davies",
						"creatorType": "editor"
					},
					{
						"firstName": "Nancy",
						"lastName": "Ockendon",
						"creatorType": "editor"
					},
					{
						"firstName": "Nathalie",
						"lastName": "Pettorelli",
						"creatorType": "editor"
					},
					{
						"firstName": "Juliet A.",
						"lastName": "Vickery",
						"creatorType": "editor"
					}
				],
				"date": "2020/04",
				"abstractNote": "Conservation research is essential for advancing knowledge but to make an impact scientific evidence must influence conservation policies, decision making and practice. This raises a multitude of challenges. How should evidence be collated and presented to policymakers to maximise its impact? How can effective collaboration between conservation scientists and decision-makers be established? How can the resulting messages be communicated to bring about change? Emerging from a successful international symposium organised by the British Ecological Society and the Cambridge Conservation Initiative, this is the first book to practically address these questions across a wide range of conservation topics. Well-renowned experts guide readers through global case studies and their own experiences. A must-read for practitioners, researchers, graduate students and policymakers wishing to enhance the prospect of their work 'making a difference'. This title is also available as Open Access on Cambridge Core.",
				"extra": "DOI: 10.1017/9781108638210",
				"language": "en",
				"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
				"websiteTitle": "Cambridge Core",
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
		"url": "https://journals.linguisticsociety.org/proceedings/index.php/PLSA/article/view/4468",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Robin Hood approach to forced alignment: English-trained algorithms and their use on Australian languages",
				"creators": [
					{
						"firstName": "Sarah",
						"lastName": "Babinski",
						"creatorType": "author"
					},
					{
						"firstName": "Rikker",
						"lastName": "Dockum",
						"creatorType": "author"
					},
					{
						"firstName": "J. Hunter",
						"lastName": "Craft",
						"creatorType": "author"
					},
					{
						"firstName": "Anelisa",
						"lastName": "Fergus",
						"creatorType": "author"
					},
					{
						"firstName": "Dolly",
						"lastName": "Goldenberg",
						"creatorType": "author"
					},
					{
						"firstName": "Claire",
						"lastName": "Bowern",
						"creatorType": "author"
					}
				],
				"date": "2019/03/15",
				"DOI": "10.3765/plsa.v4i1.4468",
				"ISSN": "2473-8689",
				"abstractNote": "Forced alignment automatically aligns audio recordings of spoken language with transcripts at the segment level, greatly reducing the time required to prepare data for phonetic analysis. However, existing algorithms are mostly trained on a few well-documented languages. We test the performance of three algorithms against manually aligned data. For at least some tasks, unsupervised alignment (either based on English or trained from a small corpus) is sufficiently reliable for it to be used on legacy data for low-resource languages. Descriptive phonetic work on vowel inventories and prosody can be accurately captured by automatic alignment with minimal training data. Consonants provided significantly more challenges for forced alignment.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "journals.linguisticsociety.org",
				"pages": "3-12",
				"publicationTitle": "Proceedings of the Linguistic Society of America",
				"rights": "Copyright (c) 2019 Sarah Babinski, Rikker Dockum, J. Hunter Craft, Anelisa Fergus, Dolly Goldenberg, Claire Bowern",
				"shortTitle": "A Robin Hood approach to forced alignment",
				"url": "https://journals.linguisticsociety.org/proceedings/index.php/PLSA/article/view/4468",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.swr.de/wissen/1000-antworten/kultur/woher-kommt-redensart-ueber-die-wupper-gehen-100.html",
		"items": [
			{
				"itemType": "webpage",
				"title": "Woher kommt \"über die Wupper gehen\"?",
				"creators": [
					{
						"firstName": "",
						"lastName": "SWRWissen",
						"creatorType": "author"
					}
				],
				"abstractNote": "Es gibt eine Vergleichsredensart: &quot;Der ist über den Jordan gegangen.“ Das heißt, er ist gestorben. Das bezieht sich auf die alten Grenzen Israels. In Wuppertal jedoch liegt jenseits des Flusses das Gefängnis.",
				"language": "de",
				"url": "https://www.swr.de/wissen/1000-antworten/kultur/woher-kommt-redensart-ueber-die-wupper-gehen-100.html",
				"websiteTitle": "swr.online",
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
		"url": "https://www.azatliq.org/a/24281041.html",
		"items": [
			{
				"itemType": "webpage",
				"title": "Татар яшьләре татарлыкны сакларга тырыша",
				"creators": [
					{
						"firstName": "гүзәл",
						"lastName": "мәхмүтова",
						"creatorType": "author"
					}
				],
				"abstractNote": "Бу көннәрдә “Идел” җәйләвендә XXI Татар яшьләре көннәре үтә. Яшьләр вакытларын төрле чараларда катнашып үткәрә.",
				"language": "tt",
				"url": "https://www.azatliq.org/a/24281041.html",
				"websiteTitle": "Азатлык Радиосы",
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
	}
]
/** END TEST CASES **/
