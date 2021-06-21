{
	"translatorID": "acf93a17-a83b-482b-a45e-0c64cfd49bee",
	"label": "MDPI Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.mdpi\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-21 08:58:43"
}

/*
	MDPI Translator
	Copyright (C) 2013 Sebastian Karcher
	
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
*/


function detectWeb(doc, url) {
	var xpath='//meta[@name="citation_journal_title"]';
	if (ZU.xpath(doc, xpath).length > 0) {
		return "journalArticle";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "article-content")]/a[contains(@class, "title-link")]');
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
			var articles = [];
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
	//use Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler('itemDone', function(obj, item) {
		if (!item.abstractNote) item.abstractNote = item.extra;
		// prefer citation_authors if present for the initials
		let authors = attr(doc, 'meta[name="citation_authors"]', 'content');
		if (authors) {
			let i=0;
			for (let author of authors.split(';')) {
				if (author.includes(item.creators[i].lastName)) {
					item.creators[i] = ZU.cleanAuthor(author, "author", true);
				}
				i++;
			}
		}
		//all mdpi url include issn
		if (!item.ISSN) item.ISSN = item.url.match(/\d{4}-\d{3}(\d|x)/i)[0];
		delete item.extra;
		item.complete();
	});
	translator.translate();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.mdpi.com/2075-4418/2/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.mdpi.com/2076-3387/3/3/32",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Autonomy, Conformity and Organizational Learning",
				"creators": [
					{
						"firstName": "Nobuyuki",
						"lastName": "Hanaki",
						"creatorType": "author"
					},
					{
						"firstName": "Hideo",
						"lastName": "Owan",
						"creatorType": "author"
					}
				],
				"date": "2013/9",
				"DOI": "10.3390/admsci3030032",
				"ISSN": "2076-3387",
				"abstractNote": "There is often said to be a tension between the two types of organizational learning activities, exploration and exploitation. The argument goes that the two activities are substitutes, competing for scarce resources when firms need different capabilities and management policies. We present another explanation, attributing the tension to the dynamic interactions among search, knowledge sharing, evaluation and alignment within organizations. Our results show that successful organizations tend to bifurcate into two types: those that always promote individual initiatives and build organizational strengths on individual learning and those good at assimilating the individual knowledge base and exploiting shared knowledge. Straddling the two types often fails. The intuition is that an equal mixture of individual search and assimilation slows down individual learning, while at the same time making it difficult to update organizational knowledge because individuals’ knowledge base is not sufficiently homogenized. Straddling is especially inefficient when the operation is sufficiently complex or when the business environment is sufficiently turbulent.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.mdpi.com",
				"pages": "32-52",
				"publicationTitle": "Administrative Sciences",
				"rights": "http://creativecommons.org/licenses/by/3.0/",
				"url": "https://www.mdpi.com/2076-3387/3/3/32",
				"volume": "3",
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
				"tags": [
					{
						"tag": "NK landscape"
					},
					{
						"tag": "ambidexterity"
					},
					{
						"tag": "complexity"
					},
					{
						"tag": "exploitation"
					},
					{
						"tag": "exploration"
					},
					{
						"tag": "organizational learning"
					},
					{
						"tag": "turbulence"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.mdpi.com/search?q=preference&journal=algorithms&volume=&authors=&section=&issue=&article_type=&special_issue=&page=&search=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.mdpi.com/1420-3049/23/10/2454",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Measuring Artificial Sweeteners Toxicity Using a Bioluminescent Bacterial Panel",
				"creators": [
					{
						"firstName": "Dorin",
						"lastName": "Harpaz",
						"creatorType": "author"
					},
					{
						"firstName": "Loo Pin",
						"lastName": "Yeo",
						"creatorType": "author"
					},
					{
						"firstName": "Francesca",
						"lastName": "Cecchini",
						"creatorType": "author"
					},
					{
						"firstName": "Trish H. P.",
						"lastName": "Koon",
						"creatorType": "author"
					},
					{
						"firstName": "Ariel",
						"lastName": "Kushmaro",
						"creatorType": "author"
					},
					{
						"firstName": "Alfred I. Y.",
						"lastName": "Tok",
						"creatorType": "author"
					},
					{
						"firstName": "Robert S.",
						"lastName": "Marks",
						"creatorType": "author"
					},
					{
						"firstName": "Evgeni",
						"lastName": "Eltzov",
						"creatorType": "author"
					}
				],
				"date": "2018/10",
				"DOI": "10.3390/molecules23102454",
				"ISSN": "1420-3049",
				"abstractNote": "Artificial sweeteners have become increasingly controversial due to their questionable influence on consumers&rsquo; health. They are introduced in most foods and many consume this added ingredient without their knowledge. Currently, there is still no consensus regarding the health consequences of artificial sweeteners intake as they have not been fully investigated. Consumption of artificial sweeteners has been linked with adverse effects such as cancer, weight gain, metabolic disorders, type-2 diabetes and alteration of gut microbiota activity. Moreover, artificial sweeteners have been identified as emerging environmental pollutants, and can be found in receiving waters, i.e., surface waters, groundwater aquifers and drinking waters. In this study, the relative toxicity of six FDA-approved artificial sweeteners (aspartame, sucralose, saccharine, neotame, advantame and acesulfame potassium-k (ace-k)) and that of ten sport supplements containing these artificial sweeteners, were tested using genetically modified bioluminescent bacteria from E. coli. The bioluminescent bacteria, which luminesce when they detect toxicants, act as a sensing model representative of the complex microbial system. Both induced luminescent signals and bacterial growth were measured. Toxic effects were found when the bacteria were exposed to certain concentrations of the artificial sweeteners. In the bioluminescence activity assay, two toxicity response patterns were observed, namely, the induction and inhibition of the bioluminescent signal. An inhibition response pattern may be observed in the response of sucralose in all the tested strains: TV1061 (MLIC = 1 mg/mL), DPD2544 (MLIC = 50 mg/mL) and DPD2794 (MLIC = 100 mg/mL). It is also observed in neotame in the DPD2544 (MLIC = 2 mg/mL) strain. On the other hand, the induction response pattern may be observed in its response in saccharin in TV1061 (MLIndC = 5 mg/mL) and DPD2794 (MLIndC = 5 mg/mL) strains, aspartame in DPD2794 (MLIndC = 4 mg/mL) strain, and ace-k in DPD2794 (MLIndC = 10 mg/mL) strain. The results of this study may help in understanding the relative toxicity of artificial sweeteners on E. coli, a sensing model representative of the gut bacteria. Furthermore, the tested bioluminescent bacterial panel can potentially be used for detecting artificial sweeteners in the environment, using a specific mode-of-action pattern.",
				"issue": "10",
				"language": "en",
				"libraryCatalog": "www.mdpi.com",
				"pages": "2454",
				"publicationTitle": "Molecules",
				"rights": "http://creativecommons.org/licenses/by/3.0/",
				"url": "https://www.mdpi.com/1420-3049/23/10/2454",
				"volume": "23",
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
				"tags": [
					{
						"tag": "artificial sweeteners"
					},
					{
						"tag": "bioluminescent bacteria"
					},
					{
						"tag": "environmental pollutants"
					},
					{
						"tag": "gut microbiota"
					},
					{
						"tag": "sport supplements"
					},
					{
						"tag": "toxic effect"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.mdpi.com/2077-1444/12/5/368",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sex Manuals in Malay Manuscripts as Another Transcript of Gender Relations",
				"creators": [
					{
						"firstName": "Maznah",
						"lastName": "Mohamad",
						"creatorType": "author"
					}
				],
				"date": "2021/5",
				"DOI": "10.3390/rel12050368",
				"ISSN": "2077-1444",
				"abstractNote": "This article interprets the narratives of sex manuals produced within the Malay-Indonesian archipelago before the coming of Western colonialism and the dawn of postcolonial Islamic resurgence. In the collection of Malaysian libraries and museums, these manuscripts are largely classified as Kitab Jimak and Kitab Tib. They are all written in the Malay language with indigenous references, though the contents are likely derived from a common genre of texts transmitted from an early Arab-Islamic world and circulated within the region before the coming of European colonialism. The corpora of sexual knowledge in these texts emphasises the valorisation of sexual pleasure in conjugal relationships. Through an extensive list of prescriptions—from sexual techniques to diet, food taboos, medicine, pharmacopoeia, mantras, charms, and astrological knowledge—a near-sacral sexual experience is aspired. Couples are guided in their attainment of pleasure (nikmat) through the adherence of Islamic ethics (akhlak), rules (hukum), and etiquette (tertib). The fulfilment of women’s desire in the process is central in these observances. Nevertheless, despite placing much emphasis on mutual pleasure, these texts also contain ambiguous and paradoxical pronouncements on the position of women, wavering from veneration to misogyny. The article also highlights how intertextual studies of similar texts throughout the Islamic world can be a new focus of studies on the early history of gender and sexuality in Islam.",
				"issue": "5",
				"language": "en",
				"libraryCatalog": "www.mdpi.com",
				"pages": "368",
				"publicationTitle": "Religions",
				"rights": "http://creativecommons.org/licenses/by/3.0/",
				"url": "https://www.mdpi.com/2077-1444/12/5/368",
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
				"tags": [
					{
						"tag": "Islam"
					},
					{
						"tag": "pleasure"
					},
					{
						"tag": "sexual ethics"
					},
					{
						"tag": "sexuality"
					},
					{
						"tag": "spirituality"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
