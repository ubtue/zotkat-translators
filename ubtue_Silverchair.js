{
	"translatorID": "12b2c808-5904-4c07-9718-d3f94336e130",
	"label": "ubtue_Silverchair",
	"creator": "Sebastian Karcher",
	"target": "/(article|advance-article|advance-article-abstract|article-abstract)/|search-results?|\\/issue(/|$)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 279,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-30 12:59:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

	based on Silverchair Translator Copyright © 2020 Sebastian Karcher

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

// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	let articleRegex = /\/(article|advance-article|advance-article-abstract|article-abstract)\//;
	if (articleRegex.test(url) && getArticleId(doc)) {
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
	// First one is issue, 2nd one search results
	var rows = doc.querySelectorAll('#ArticleList h5.item-title>a, #searchResultsPage .al-title a[href*="/article"]');
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc);
	}
}

function getArticleId(doc) {
	let id = attr(doc, '.citation-download-wrap input[name="resourceId"]', "value");
	if (!id) {
		id = attr(doc, 'a[data-article-id]', 'data-article-id');
	}
	return id;
}

function scrape(doc) {
	let id = getArticleId(doc);
	let type = attr(doc, '.citation-download-wrap input[name="resourceType"]', "value");
	if (!type) {
		type = "3";
	}
	var risURL = "/Citation/Download?resourceId=" + id + "&resourceType=" + type + "&citationFormat=0";
	// Z.debug(risURL);

	var pdfURL = attr(doc, 'a.article-pdfLink', 'href');
	// Z.debug("pdfURL: " + pdfURL);
	ZU.doGet(risURL, function (text) {
		// Z.debug(text);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			let lang = ZU.xpath(doc, '//script[@type="application/ld+json"]');
			if (lang.length > 0 && lang[0].innerHTML && lang[0].innerHTML.match(/"inLanguage"\s*:\s*"[^"]+"/)) {
				item.language = lang[0].innerHTML.match(/"inLanguage"\s*:\s*"([^"]+)"/)[1];
			}
			if (ZU.xpathText(doc, '//div[@class="journal-footer-colophon"]') 
				&& ZU.xpathText(doc, '//div[@class="journal-footer-colophon"]').match(/Online.*\d{4}-\d{3}./)){
					item.ISSN = ZU.xpathText(doc, '//div[@class="journal-footer-colophon"]').match(/Online.*(\d{4}-\d{3}.)/)[1];
				}
			if (item.title.trim().match(/^Review/)) {
				item.tags.push("RezensionstagPica");
			}
			item.attachments = [];
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://academic.oup.com/isq/article/57/1/128/1796931",
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
				"language": "en",
				"libraryCatalog": "ubtue_Silverchair",
				"pages": "128-137",
				"publicationTitle": "International Studies Quarterly",
				"shortTitle": "Assessing the Causes of Capital Account Liberalization",
				"url": "https://doi.org/10.1111/isqu.12001",
				"volume": "57",
				"attachments": [],
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
				"language": "en",
				"libraryCatalog": "ubtue_Silverchair",
				"pages": "419-430",
				"publicationTitle": "International Studies Quarterly",
				"url": "https://doi.org/10.1093/isq/sqaa017",
				"volume": "64",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://academic.oup.com/isq/article/65/1/95/5999080",
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
				"date": "March 8, 2021",
				"DOI": "10.1093/isq/sqaa085",
				"ISSN": "0020-8833",
				"abstractNote": "Why do states build new international organizations (IOs) in issue areas where many institutions already exist? Prevailing theories of institutional creation emphasize their ability to resolve market failures, but adding new IOs can increase uncertainty and rule inconsistency. I argue that institutional proliferation occurs when existing IOs fail to adapt to shifts in state power. Member states expect decision-making rules to reflect their underlying power; when it does not, they demand greater influence in the organization. Subsequent bargaining over the redistribution of IO influence often fails due to credibility and information problems. As a result, under-represented states construct new organizations that provide them with greater institutional control. To test this argument, I examine the proliferation of multilateral development banks since 1944. I leverage a novel identification strategy rooted in the allocation of World Bank votes at Bretton Woods to show that the probability of institutional proliferation is higher when power is misaligned in existing institutions. My results suggest that conflict over shifts in global power contribute to the fragmentation of global governance.",
				"issue": "1",
				"journalAbbreviation": "International Studies Quarterly",
				"language": "en",
				"libraryCatalog": "ubtue_Silverchair",
				"pages": "95-108",
				"publicationTitle": "International Studies Quarterly",
				"shortTitle": "Angling for Influence",
				"url": "https://doi.org/10.1093/isq/sqaa085",
				"volume": "65",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rupress.org/jcb/article/220/1/e202004184/211570/Katanin-p60-like-1-sculpts-the-cytoskeleton-in",
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
				"ISSN": "1540-8140",
				"abstractNote": "Mechanoreceptor cells develop a specialized cytoskeleton that plays structural and sensory roles at the site of mechanotransduction. However, little is known about how the cytoskeleton is organized and formed. Using electron tomography and live-cell imaging, we resolve the 3D structure and dynamics of the microtubule-based cytoskeleton in fly campaniform mechanosensory cilia. Investigating the formation of the cytoskeleton, we find that katanin p60-like 1 (kat-60L1), a neuronal type of microtubule-severing enzyme, serves two functions. First, it amplifies the mass of microtubules to form the dense microtubule arrays inside the sensory cilia. Second, it generates short microtubules that are required to build the nanoscopic cytoskeleton at the mechanotransduction site. Additional analyses further reveal the functional roles of Patronin and other potential factors in the local regulatory network. In all, our results characterize the specialized cytoskeleton in fly external mechanosensory cilia at near-molecular resolution and provide mechanistic insights into how it is formed.",
				"issue": "1",
				"journalAbbreviation": "Journal of Cell Biology",
				"libraryCatalog": "ubtue_Silverchair",
				"pages": "e202004184",
				"publicationTitle": "Journal of Cell Biology",
				"url": "https://doi.org/10.1083/jcb.202004184",
				"volume": "220",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ashpublications.org/blood/article/137/8/1013/474417/Preleukemic-and-leukemic-evolution-at-the-stem",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Preleukemic and leukemic evolution at the stem cell level",
				"creators": [
					{
						"lastName": "Stauber",
						"firstName": "Jacob",
						"creatorType": "author"
					},
					{
						"lastName": "Greally",
						"firstName": "John M.",
						"creatorType": "author"
					},
					{
						"lastName": "Steidl",
						"firstName": "Ulrich",
						"creatorType": "author"
					}
				],
				"date": "February 25, 2021",
				"DOI": "10.1182/blood.2019004397",
				"ISSN": "0006-4971",
				"abstractNote": "Hematological malignancies are an aggregate of diverse populations of cells that arise following a complex process of clonal evolution and selection. Recent approaches have facilitated the study of clonal populations and their evolution over time across multiple phenotypic cell populations. In this review, we present current concepts on the role of clonal evolution in leukemic initiation, disease progression, and relapse. We highlight recent advances and unanswered questions about the contribution of the hematopoietic stem cell population to these processes.",
				"issue": "8",
				"journalAbbreviation": "Blood",
				"language": "en",
				"libraryCatalog": "ubtue_Silverchair",
				"pages": "1013-1018",
				"publicationTitle": "Blood",
				"url": "https://doi.org/10.1182/blood.2019004397",
				"volume": "137",
				"attachments": [],
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
	},
	{
		"type": "web",
		"url": "https://online.ucpress.edu/nr/article/26/3/129/195194/Review-Kabbalah-and-Sex-Magic-A-Mythical-Ritual",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Review: Kabbalah and Sex Magic: A Mythical-Ritual Genealogy, by Marla Segol",
				"creators": [
					{
						"lastName": "Coudert",
						"firstName": "Allison P.",
						"creatorType": "author"
					},
					{
						"lastName": "French",
						"firstName": "Aaron",
						"creatorType": "author"
					}
				],
				"date": "February 1, 2023",
				"DOI": "10.1525/nr.2023.26.3.129",
				"ISSN": "1541-8480",
				"abstractNote": "The idea that God interacts sexually with human beings may seem utterly alien to modern Judaism, but in this fascinating book Marla Segol demonstrates that some Jews conceived and still conceive of God as a sexual being. However, her attempt to link the late antique and medieval texts she analyzes to the modern sex magic of Yehuda Berg and Shmuley Boteach—as well as to an odd assortment of “Meetup” sex therapists—goes a step too far. There is a yawning gap between medieval and modern sex magic, but Segol makes only a superficial attempt to fill this in. Her discussion of the Zohar (thirteenth century), the most important kabbalistic text ever written, and the Lurianic Kabbalah (sixteenth century), which influenced Berg, is cursory; and the Sabbatean, Frankist, and Hasidic movements are not mentioned at all. It is to be hoped that Segol will investigate these possible missing links in the future because she is clearly an accomplished scholar and the material she presents about antique and medieval kabbalistic sex magic is intriguing.",
				"issue": "3",
				"journalAbbreviation": "Nova Religio",
				"language": "en",
				"libraryCatalog": "ubtue_Silverchair",
				"pages": "129-131",
				"publicationTitle": "Nova Religio",
				"shortTitle": "Review",
				"url": "https://doi.org/10.1525/nr.2023.26.3.129",
				"volume": "26",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
