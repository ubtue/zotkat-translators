{
	"translatorID": "04938f7b-4cda-4efa-bbe8-efc2fd6decb2",
	"label": "TyndaleBulletin",
	"creator": "Helena Nebel",
	"target": "tyndalebulletin.org\\/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-01-27 15:10:50"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	AEA Web translator Copyright © 2014 Sebastian Karcher 
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.indexOf('/\/article\/')>-1) {
		return "journalArticle";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//article//a[contains(@href, "/articles?id=")]|//li[@class="article"]//a[contains(@href, "/articles?id=")]');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
			if (!items) {
				return true;
			}
			var articles = new Array();
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');//Embedded Metadata
	translator.setHandler("itemDone", function(obj, item) {
		//Decode HTML entities in title, e.g. &#039;
		item.title = ZU.unescapeHTML(item.title);
		item.complete();
	});
	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});

}

	/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://academic.oup.com/isq/article-abstract/57/1/128/1796931?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Assessing the Causes of Capital Account Liberalization: How Measurement Matters1",
				"creators": [
					{
						"lastName": "Karcher",
						"firstName": "Sebastian",
						"creatorType": "author"
					},
					{
						"lastName": "Steinberg",
						"firstName": "David A.",
						"creatorType": "author"
					}
				],
				"date": "March 1, 2013",
				"DOI": "10.1111/isqu.12001",
				"ISSN": "0020-8833",
				"abstractNote": "Why do countries open their economies to global capital markets? A number of recent articles have found that two types of factors encourage politicians to liberalize their capital accounts: strong macroeconomic fundamentals and political pressure from proponents of open capital markets. However, these conclusions need to be re-evaluated because the most commonly used measure of capital account openness, Chinn and Ito's (2002) Kaopen index, suffers from systematic measurement error. We modify the Chinn–Ito variable and replicate two studies (Brooks and Kurtz 2007; Chwieroth 2007) to demonstrate that our improved measure overturns some prior findings. Some political variables have stronger effects on capital account policy than previously recognized, while macroeconomic fundamentals are less important than previous research suggests.",
				"issue": "1",
				"journalAbbreviation": "International Studies Quarterly",
				"libraryCatalog": "Silverchair",
				"pages": "128-137",
				"publicationTitle": "International Studies Quarterly",
				"shortTitle": "Assessing the Causes of Capital Account Liberalization",
				"url": "https://doi.org/10.1111/isqu.12001",
				"volume": "57",
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
		"url": "https://academic.oup.com/isq/article/64/2/419/5808900",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Civil Conflict and Agenda-Setting Speed in the United Nations Security Council",
				"creators": [
					{
						"lastName": "Binder",
						"firstName": "Martin",
						"creatorType": "author"
					},
					{
						"lastName": "Golub",
						"firstName": "Jonathan",
						"creatorType": "author"
					}
				],
				"date": "June 1, 2020",
				"DOI": "10.1093/isq/sqaa017",
				"ISSN": "0020-8833",
				"abstractNote": "The United Nations Security Council (UNSC) can respond to a civil conflict only if that conflict first enters the Council's agenda. Some conflicts reach the Council's agenda within days after they start, others after years (or even decades), and some never make it. So far, only a few studies have looked at the crucial UNSC agenda-setting stage, and none have examined agenda-setting speed. To fill this important gap, we develop and test a novel theoretical framework that combines insights from realist and constructivist theory with lessons from institutionalist theory and bargaining theory. Applying survival analysis to an original dataset, we show that the parochial interests of the permanent members (P-5) matter, but they do not determine the Council's agenda-setting speed. Rather, P-5 interests are constrained by normative considerations and concerns for the Council's organizational mission arising from the severity of a conflict (in terms of spillover effects and civilian casualties); by the interests of the widely ignored elected members (E-10); and by the degree of preference heterogeneity among both the P-5 and the E-10. Our findings contribute to a better understanding of how the United Nations (UN) works, and they have implications for the UN's legitimacy.",
				"issue": "2",
				"journalAbbreviation": "International Studies Quarterly",
				"libraryCatalog": "Silverchair",
				"pages": "419-430",
				"publicationTitle": "International Studies Quarterly",
				"url": "https://doi.org/10.1093/isq/sqaa017",
				"volume": "64",
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
		"url": "https://academic.oup.com/isq/advance-article-abstract/doi/10.1093/isq/sqaa085/5999080?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Angling for Influence: Institutional Proliferation in Development Banking",
				"creators": [
					{
						"lastName": "Pratt",
						"firstName": "Tyler",
						"creatorType": "author"
					}
				],
				"date": "November 23, 2020",
				"DOI": "10.1093/isq/sqaa085",
				"ISSN": "0020-8833",
				"abstractNote": "Why do states build new international organizations (IOs) in issue areas where many institutions already exist? Prevailing theories of institutional creation emphasize their ability to resolve market failures, but adding new IOs can increase uncertainty and rule inconsistency. I argue that institutional proliferation occurs when existing IOs fail to adapt to shifts in state power. Member states expect decision-making rules to reflect their underlying power; when it does not, they demand greater influence in the organization. Subsequent bargaining over the redistribution of IO influence often fails due to credibility and information problems. As a result, under-represented states construct new organizations that provide them with greater institutional control. To test this argument, I examine the proliferation of multilateral development banks since 1944. I leverage a novel identification strategy rooted in the allocation of World Bank votes at Bretton Woods to show that the probability of institutional proliferation is higher when power is misaligned in existing institutions. My results suggest that conflict over shifts in global power contribute to the fragmentation of global governance.",
				"issue": "sqaa085",
				"journalAbbreviation": "International Studies Quarterly",
				"libraryCatalog": "Silverchair",
				"publicationTitle": "International Studies Quarterly",
				"shortTitle": "Angling for Influence",
				"url": "https://doi.org/10.1093/isq/sqaa085",
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
		"url": "https://rupress.org/jcb/article-abstract/220/1/e202004184/211570/Katanin-p60-like-1-sculpts-the-cytoskeleton-in?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Katanin p60-like 1 sculpts the cytoskeleton in mechanosensory cilia",
				"creators": [
					{
						"lastName": "Sun",
						"firstName": "Landi",
						"creatorType": "author"
					},
					{
						"lastName": "Cui",
						"firstName": "Lihong",
						"creatorType": "author"
					},
					{
						"lastName": "Liu",
						"firstName": "Zhen",
						"creatorType": "author"
					},
					{
						"lastName": "Wang",
						"firstName": "Qixuan",
						"creatorType": "author"
					},
					{
						"lastName": "Xue",
						"firstName": "Zhaoyu",
						"creatorType": "author"
					},
					{
						"lastName": "Wu",
						"firstName": "Menghua",
						"creatorType": "author"
					},
					{
						"lastName": "Sun",
						"firstName": "Tianhui",
						"creatorType": "author"
					},
					{
						"lastName": "Mao",
						"firstName": "Decai",
						"creatorType": "author"
					},
					{
						"lastName": "Ni",
						"firstName": "Jianquan",
						"creatorType": "author"
					},
					{
						"lastName": "Pastor-Pareja",
						"firstName": "José Carlos",
						"creatorType": "author"
					},
					{
						"lastName": "Liang",
						"firstName": "Xin",
						"creatorType": "author"
					}
				],
				"date": "December 2, 2020",
				"DOI": "10.1083/jcb.202004184",
				"ISSN": "0021-9525",
				"abstractNote": "Mechanoreceptor cells develop a specialized cytoskeleton that plays structural and sensory roles at the site of mechanotransduction. However, little is known about how the cytoskeleton is organized and formed. Using electron tomography and live-cell imaging, we resolve the 3D structure and dynamics of the microtubule-based cytoskeleton in fly campaniform mechanosensory cilia. Investigating the formation of the cytoskeleton, we find that katanin p60-like 1 (kat-60L1), a neuronal type of microtubule-severing enzyme, serves two functions. First, it amplifies the mass of microtubules to form the dense microtubule arrays inside the sensory cilia. Second, it generates short microtubules that are required to build the nanoscopic cytoskeleton at the mechanotransduction site. Additional analyses further reveal the functional roles of Patronin and other potential factors in the local regulatory network. In all, our results characterize the specialized cytoskeleton in fly external mechanosensory cilia at near-molecular resolution and provide mechanistic insights into how it is formed.",
				"issue": "e202004184",
				"journalAbbreviation": "Journal of Cell Biology",
				"libraryCatalog": "Silverchair",
				"publicationTitle": "Journal of Cell Biology",
				"url": "https://doi.org/10.1083/jcb.202004184",
				"volume": "220",
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
		"url": "https://ashpublications.org/blood/article-abstract/doi/10.1182/blood.2019004397/474417/Preleukemic-and-Leukemic-Evolution-at-the-Stem?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Preleukemic and Leukemic Evolution at the Stem Cell Level",
				"creators": [
					{
						"lastName": "Stauber",
						"firstName": "Jacob",
						"creatorType": "author"
					},
					{
						"lastName": "Greally",
						"firstName": "John",
						"creatorType": "author"
					},
					{
						"lastName": "Steidl",
						"firstName": "Ulrich",
						"creatorType": "author"
					}
				],
				"date": "December 4, 2020",
				"DOI": "10.1182/blood.2019004397",
				"ISSN": "0006-4971",
				"abstractNote": "Hematological malignancies are an aggregate of diverse populations of cells that arise following a complex process of clonal evolution and selection. Recent approaches have facilitated the study of clonal populations and their evolution over time across multiple phenotypic cell populations. In this review, we present current concepts on the role of clonal evolution in leukemic initiation, disease progression, and relapse. We highlight recent advances and unanswered questions on the contribution of the hemopoietic stem cell population on these processes.",
				"issue": "blood.2019004397",
				"journalAbbreviation": "Blood",
				"libraryCatalog": "Silverchair",
				"publicationTitle": "Blood",
				"url": "https://doi.org/10.1182/blood.2019004397",
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
		"url": "https://ashpublications.org/search-results?page=1&q=blood",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://academic.oup.com/isq/search-results?page=1&q=test&fl_SiteID=5394&SearchSourceType=1&allJournals=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://rupress.org/jcb/issue",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ashpublications.org/hematology/issue/2019/1",
		"items": "multiple"
	}
]
/** END TEST CASES **/
