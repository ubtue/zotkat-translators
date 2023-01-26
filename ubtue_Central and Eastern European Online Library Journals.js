{
	"translatorID": "16f5862c-c47b-46ca-bcf7-1de75ffadd9f",
	"label": "ubtue_Central and Eastern European Online Library Journals",
	"creator": "Timotheus Kim",
	"target": "^https://www\\.ceeol\\.com/search",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-01-26 15:19:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Timotheus Kim
	
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

function detectWeb(doc, url) {
	if (url.includes('article')) return "journalArticle";
	else if (getSearchResults(doc, true)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.ng-binding');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), invokeEMTranslator);
		});
	}
	else {
		invokeEMTranslator(doc, url);
	}
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
	});
	translator.translate();
}

//scraping abstractNote from HTML, that is not included in Embedded Metadata
function postProcess(doc, item) {
	let abstractEntry = ZU.xpathText(doc, '//p[@class="summary"]');
	if (!item.abstractNote && abstractEntry) item.abstractNote = abstractEntry;
	item.abstractNote = decodeHTMLEntities(item.abstractNote); 
	let tags  = ZU.xpathText(doc, '//meta[@name="citation_keywords"]/@content').replace(/&#(\d+);/g, ((match, dec) => `${String.fromCharCode(dec)}`));
    if (tags) item.tags = tags.split(';');
	item.complete();
}

//decode html entities from the EM metadata
function decodeHTMLEntities(rawStr) {
  return rawStr.replace(/&#(\d+);/g, ((match, dec) => `${String.fromCharCode(dec)}`));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/article-detail?id=934009",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "God’s Holy Ordinance",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Benne",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "2450-4955, 2451-2141",
				"abstractNote": "In this article, I argue that the church must build up its theology of marriage in a more disciplined manner because the culture no longer sustains the Christian notion. In making a substantive argument I rely on the Lutheran “two ways that God reigns” approach in which we share “places of responsibility” with all humans, but in which the Christian virtues of faith, love, and hope transform those places into genuine Christian callings. I then contend strongly for the continued rejection of same-sex marriage among orthodox Christians. I conclude with what I hope is a compassionate pastoral approach—gracious tolerance—toward homosexual Christians.",
				"issue": "6",
				"language": "English",
				"libraryCatalog": "www.ceeol.com",
				"pages": "7-21",
				"publicationTitle": "Philosophy and Canon Law",
				"url": "https://www.ceeol.com/search/article-detail?id=934009",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " faith"
					},
					{
						"tag": " gracious tolerance"
					},
					{
						"tag": " hope"
					},
					{
						"tag": " love"
					},
					{
						"tag": " places of responsibility"
					},
					{
						"tag": "individualism"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/article-detail?id=945560",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zastosowanie modelu struktury kapitału Mertona Howarda Millera w warunkach zmienności polityki fiskalnej w Polsce w latach 2018–2019",
				"creators": [
					{
						"firstName": "Slawomir",
						"lastName": "Antkiewicz",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "2300-6102, 2353-9496",
				"abstractNote": "An essential condition for the proper functioning of Polish enterprises is the stability of tax solutions. However, over the years 2018–2019, several variants of tax changes appeared, which may have a significant impact on the capital structure of enterprises. The implementation of one of the variants will create specific preferences for the use of equity or foreign capital. The purpose of the papers is to analyse the impact of possible changes in the tax rates on the decisions of management boards of enterprises regarding the methods of financing Polish enterprises and shaping their capital structure. To achieve the research goal, the paper presents the capital structure and the evolution of theoretical concepts regarding the preferences for financing enterprises with shares or bonds. Particular attention was paid to Merton Howard Miller’s model, which argued that enterprises can use interest tax shields that reduce the basis for calculating income tax. The analytical-descriptive and comparative methods were used. Scenarios of changes in taxation were presented and preferences for the use of equity or foreign capital were demonstrated using the Miller model. The research results indicate that in the current legal situation there are preferences for financing an entity with corporate bonds and if the most realistic scenario of liquidating the tax levied on interest paid to bond holders plays out, these preferences will further increase.",
				"issue": "1",
				"language": "Polish",
				"libraryCatalog": "www.ceeol.com",
				"pages": "7-23",
				"publicationTitle": "International Business and Global Economy",
				"url": "https://www.ceeol.com/search/article-detail?id=945560",
				"volume": "38",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " bonds"
					},
					{
						"tag": " debt"
					},
					{
						"tag": " equity capital"
					},
					{
						"tag": " shares"
					},
					{
						"tag": " tax shield"
					},
					{
						"tag": "capital structure"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/article-detail?id=925530",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Az automatiz&#225;l&#225;s munkaerőpiaci &#233;s munkajogi k&#233;rd&#233;sei",
				"creators": [
					{
						"firstName": "ICB-InterConsult Bulgaria",
						"lastName": "Ltd",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "2734-6226, 2734-7095, 2734-6226",
				"abstractNote": "The fundamental value of labour law at all times is that it provides security in the economic sense and thus creates predictability: on the one hand, with rules protecting the worker and, on the other hand, by building a social network on the part of the state in case the worker is unable to work. In addition, it is crucial that labour law regulations can properly adapt to the economic and social changes of the 21st century, to the emergence of new trends. The development of robotics and artificial intelligence will undoubtedly have an impact on the dynamic and static elements of the work environment, the labour market, and the labour relationship, thus generating new challenges.",
				"issue": "4",
				"language": "Hungarian",
				"libraryCatalog": "www.ceeol.com",
				"pages": "63-76",
				"publicationTitle": "Erd&#233;lyi Jog&#233;let",
				"url": "https://www.ceeol.com/search/article-detail?id=925530",
				"volume": "III",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " automation"
					},
					{
						"tag": " occupational safety"
					},
					{
						"tag": " responsibility"
					},
					{
						"tag": " robotics"
					},
					{
						"tag": "artificial intelligence"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/article-detail?id=934330",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Pavao Maček, Pogledići i Malenići. Dva plemenita roda od Kurilovca: S priloženim rodoslovnim stablima",
				"creators": [
					{
						"firstName": "Ivan",
						"lastName": "Jurković",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "0351-9767, 1848-9087",
				"abstractNote": "Book-Review: Pavao Maček, Pogledići i Malenići. Dva plemenita roda od Kurilovca: S priloženim rodoslovnim stablima, Zagreb: Družtvo za povjestnicu Zagrebačke nadbiskupije “Tkalčić”, 2019, 574 stranice i dva rodoslovna stabla. Review by Ivan Jurković.",
				"issue": "58",
				"language": "Croatian",
				"libraryCatalog": "www.ceeol.com",
				"pages": "154-156",
				"publicationTitle": "Povijesni prilozi",
				"shortTitle": "Pavao Maček, Pogledići i Malenići. Dva plemenita roda od Kurilovca",
				"url": "https://www.ceeol.com/search/article-detail?id=934330",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " Pogledići and Malenići"
					},
					{
						"tag": " genealogical trees"
					},
					{
						"tag": " two noble families from Kurilovac"
					},
					{
						"tag": "Pavao Maček"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/article-detail?id=148736",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "PSALM 110 IN THE NEW TESTAMENT AND IN THE EARLY CHURCH",
				"creators": [
					{
						"firstName": "Predrag",
						"lastName": "Dragutinović",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"ISSN": "1584-7624",
				"abstractNote": "Der vorliegende Beitrag untersucht, wie Ps 110 in den christlichen theologischen Diskursen neu gelesen und eingebettet wurde. Die christlichen Texte, die hier in Betracht kommen, sind die Texte des Neuen Testaments und der Apostolischen Väter, in denen Psalm 110 ausdrücklich oder implizit benutzt wird. Die starke Benutzung des Psalms 110 durch die christlichen Gemeinden zeigt einen interessanten Weg dieses Textes im Prozess seiner Relektüre in der Kirche auf. Einerseits wird Psalm 110,1 „als ein Christologie-Baustein ins Neue Testament eingemauert“, anderseits wird bei manchen der Apostolischen Väter derselbe Text im Rahmen einer Paränese oder einer eschatologisch motivierten Gemeindeethik oder einer frühchristlichen Bundestheologie gebraucht.",
				"issue": "1",
				"language": "German",
				"libraryCatalog": "www.ceeol.com",
				"pages": "95-111",
				"publicationTitle": "Sacra Scripta",
				"url": "https://www.ceeol.com/search/article-detail?id=148736",
				"volume": "XI",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " Apostolische Väter"
					},
					{
						"tag": " Neues Testament"
					},
					{
						"tag": " Rezeption"
					},
					{
						"tag": "Ps 110"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
