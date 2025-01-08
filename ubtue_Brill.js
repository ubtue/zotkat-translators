{
	"translatorID": "b2fcf7d9-e023-412e-a2bc-f06d6275da24",
	"label": "ubtue_Brill",
	"creator": "Madeesh Kannan",
	"target": "^https?://brill.com/view/journals/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-01-08 10:12:57"
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
	if (url.match(/article-.+\.xml($|\?)/)) {
		return "journalArticle";
	} else if (url.match(/issue-\d+(-\d+)?\.xml$/)) {
		return "multiple";
 	}
	return false;
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let links = doc.querySelectorAll(".c-Typography--title");
	let usesTypography = !!links.length;
	if (!usesTypography) {
		links = doc.querySelectorAll(".c-Button--link, [target='_self']");
	}
	let text = usesTypography ?
			doc.querySelectorAll(".c-Typography--title > span") :
			doc.querySelectorAll(".c-Button--link, [target='_self']");
	for (let i = 0; i < links.length; ++i) {
		let href = links[i].href;
		let title = ZU.trimInternal(text[i].textContent);
		if (!href || !title) continue;
		if (!href.match(/article-.+\.xml$/))
			continue;

		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	let title = ZU.xpathText(doc, '//meta[@name="citation_title"]//@content');
	if (title) item.title = title; 
	if (!item.abstractNote) {
	  let abstractNote = ZU.xpath(doc, '//section[@class="abstract"]//p');
	  if (abstractNote && abstractNote.length > 0)
		 item.abstractNote = abstractNote[0].textContent.trim();
	  else
		 item.abstractNote = '';
	}
	if (ZU.xpathText(doc, '//abstract')) {
		item.abstractNote.substring(0,30)
		if (!ZU.xpathText(doc, '//abstract').includes(item.abstractNote.substring(0,30))) {
			item.notes.push('abs:' + ZU.xpathText(doc, '//abstract'));
			item.abstractNote = item.abstractNote.replace(/^abstract/i, '');
		}
	}
	// i set 100 as limit of string length, because usually a string of a pseudoabstract has less then 150 character e.g. "abstractNote": "\"Die Vernünftigkeit des jüdischen Dogmas\" published on 05 Sep 2020 by Brill."
	if (item.abstractNote.length < 100) delete item.abstractNote;


	
	item.tags = ZU.xpath(doc, '//dd[contains(@class, "keywords")]//a');
	if (item.tags) {
		let allTags = item.tags.map(i => i.textContent.trim());
		//deduplicate allTags
		item.tags = Array.from(new Set(allTags.map(JSON.stringify))).map(JSON.parse);
	}
	let reviewEntry = text(doc, '.articlecategory');
	if (reviewEntry && reviewEntry.match(/book\sreview/i)) item.tags.push('RezensionstagPica');
	// numbering issues with slash due to cataloguing rule
	if (item.issue) item.issue = item.issue.replace('-', '/');
	let date = item.date;
	//entry for scraping Berichtsjahr
	let dateEntry = ZU.xpathText(doc, '//div[@class="cover cover-image configurable-index-card-cover-image"]//@title');
	let berichtsjahr = extractBerichtsjahr(dateEntry);
	let erscheinungsjahr = extractErscheinungsjahr(date);
	if (erscheinungsjahr !== berichtsjahr) {
		item.date = extractBerichtsjahr(dateEntry);
	} else {
		item.date;
	}
	
	//scrape ORCID from website
	let SubheadingSpanHasOrcid = doc.querySelectorAll('.text-subheading span orcid').length;
	let authorSectionEntries = SubheadingSpanHasOrcid ? doc.querySelectorAll('.text-subheading span') :
						   doc.querySelectorAll('.contributor-details');
	let furtherSelector = SubheadingSpanHasOrcid ? '.c-Button--link' : '.contributor-details-link';
	if (authorSectionEntries) {
		for (let authorSectionEntry of authorSectionEntries) {
			let authorInfo = authorSectionEntry.querySelector(furtherSelector);
			let orcidHref = authorSectionEntry.querySelector('.orcid');
			if (authorInfo && orcidHref) {
				let author = authorInfo.childNodes[0].textContent;
				let orcid = orcidHref.textContent.replace(/.*(\d{4}-\d+-\d+-\d+x?)$/i, '$1');
				item.notes.push({note: "orcid:" + orcid + ' | ' + author});
			}
		}
	}

	//delete symbols in names
	for (let i in item.creators) {
		item.creators[i].lastName = item.creators[i].lastName.replace('†', '');
		item.creators[i].firstName = item.creators[i].firstName.replace('†', '');
	}
	//deduplicate
	item.notes = Array.from(new Set(item.notes.map(JSON.stringify))).map(JSON.parse);
	// mark articles as "LF" (MARC=856 |z|kostenfrei), that are published as open access	
	let openAccessTag = text(doc, '.has-license span');
	if (openAccessTag && openAccessTag.match(/open\s+access/gi)) item.notes.push({note: 'LF:'});
  // mark articles as "LF" (MARC=856 |z|kostenfrei), that are free accessible e.g. conference report 10.30965/25890433-04902001 
	let freeAccess = text(doc, '.color-access-free');
	if (freeAccess && freeAccess.match(/(free|freier)\s+(access|zugang)/gi)) item.notes.push('LF:');
	if (!item.itemType)	item.itemType = "journalArticle";
	for (let tag of ZU.xpath(doc, '//meta[@property="article:tag"]/@content')) {
		if (!item.tags.includes(tag.textContent)) item.tags.push(tag.textContent);
	}
	
	item.attachments = [];

	let additionalTitle = text(doc, '.title ~ div h4.typography-body');
	if (additionalTitle) {
		additionalTitle += text(doc, '.title ~ div h5.typography-body').replace(/^(?=.)/, ": ");
		item.notes.push({ note: "Paralleltitel: " + additionalTitle });
	}

	if (!item.itemType)	item.itemType = "journalArticle";
}

function extractErscheinungsjahr(date) {
	return date ? date.trim().match(/\d{4}/)[0] : '';
}

function extractBerichtsjahr(dateEntry) {
	let dateCandidate = dateEntry.match(/\(\s*(\d{4})\s*\):/);
	return dateCandidate.length > 1 ? dateCandidate[1] : null;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	if (doc.querySelector('body > meta')) {
	// Brill's HTML is structured incorrectly, and it causes some parsers
	// to interpret the <meta> tags as being in the body, which breaks EM.
	// We'll fix it here.
		for (let meta of doc.querySelectorAll('body > meta')) {
			doc.head.appendChild(meta);
		}
	}
	
	var translator = Zotero.loadTranslator("web");
	// Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
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
		"url": "https://brill.com/view/journals/ormo/100/2/article-p147_2.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "‘Our Traditions Will Kill Us!’: Negotiating Marriage Celebrations in the Face of Legal Regulation of Tradition in Tajikistan",
				"creators": [
					{
						"firstName": "Elena",
						"lastName": "Borisova",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1163/22138617-12340248",
				"ISSN": "2213-8617, 0030-5472",
				"abstractNote": "Abstract Based on extensive ethnographic research in northern Tajikistan, this article examines the implications of the law ordering traditions and rituals (tanzim), including marriage celebrations, in Tajikistan. At the centre of my analysis is the figure of a state employed ‘worker of culture’, Farkhod, whose family was affected by recent, rather militant, attempts by the state to regulate tradition. By following the story of his daughter’s wedding, I analyse how Farkhod tries to reconcile his roles of a caring father, a respectful community member, and a law-abiding citizen. I argue that the tanzim exacerbates the mismatch between the government’s attempts to impose a rigid notion of tradition and promote the idea of a certain kind of modern citizen, and people’s own understandings of being a modern and moral person having a good wedding.",
				"issue": "2",
				"language": "eng",
				"libraryCatalog": "brill.com",
				"pages": "147-171",
				"publicationTitle": "Oriente Moderno",
				"shortTitle": "‘Our Traditions Will Kill Us!’",
				"url": "https://brill.com/view/journals/ormo/100/2/article-p147_2.xml",
				"volume": "100",
				"attachments": [],
				"tags": [
					{
						"tag": "Tajikistan"
					},
					{
						"tag": "law"
					},
					{
						"tag": "marriage"
					},
					{
						"tag": "modernity"
					},
					{
						"tag": "tradition"
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
		"url": "https://brill.com/view/journals/ormo/100/2/article-p172_3.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Alignment and Alienation: The Ambivalent Modernisations of Uyghur Marriage in the 21st Century",
				"creators": [
					{
						"firstName": "Rune",
						"lastName": "Steenberg",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "Musapir",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1163/22138617-12340247",
				"ISSN": "2213-8617, 0030-5472",
				"abstractNote": "Abstract Uyghur marriages in Xinjiang in the 2010s have been characterised by various, sometimes seemingly contradictory trends of modernisation, such as monetisation, simplification, emphasis on ethnic symbolism, displays of piety and the active integration of both Turkish, Western and Chinese elements. This article views these trends as complex, inter-related reactions to the region’s socio-economic transformations and political campaigns. It analyses how these transformations and campaigns affect everyday decisions at the local level. The study of marriage provides a good insight into the effects of economic and political transformations on the ground. In such studies, we argue for a distinction between trends on the level of symbolic positioning and identity display from trends on a deeper structural level pertaining to social relations, economic integration and household strategies. In the case of Uyghurs in southern Xinjiang these two levels have shown opposite trends. On a surface level of symbolic display, the relatively open years of 2010-2014 allowed for the flourishing of trends that did not follow the Party-State line, such as Islamic piety and a strengthened Uyghur ethno-national identity. Yet, on a deeper structural level these trends signified improved integration into modern Chinese society. In contrast, the increased state violence of 2015-2020 enforced a strong symbolic alignment with Chinese Communist Party (CCP) ideology but at the same time alienated the Uyghur population from this society effectively necessitating the development of forms of organisation that the CCP deems backwards and undesirable.",
				"issue": "2",
				"language": "eng",
				"libraryCatalog": "brill.com",
				"pages": "172-199",
				"publicationTitle": "Oriente Moderno",
				"shortTitle": "Alignment and Alienation",
				"url": "https://brill.com/view/journals/ormo/100/2/article-p172_3.xml",
				"volume": "100",
				"attachments": [],
				"tags": [
					{
						"tag": "Uyghur"
					},
					{
						"tag": "Xinjiang"
					},
					{
						"tag": "commercialisation"
					},
					{
						"tag": "marriage"
					},
					{
						"tag": "modernisation"
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
		"url": "https://brill.com/view/journals/ormo/100/2/ormo.100.issue-2.xml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/rrcs/9/2/article-p249_5.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mapping Religious Sites in China: A Research Note",
				"creators": [
					{
						"firstName": "Jackie",
						"lastName": "Henke",
						"creatorType": "author"
					},
					{
						"firstName": "Fenggang",
						"lastName": "Yang (楊鳳崗)",
						"creatorType": "author"
					}
				],
				"date": "2022/10/24",
				"DOI": "10.1163/22143955-12340008",
				"ISSN": "2214-3947, 2214-3955",
				"abstractNote": "Drawing from visual studies scholarship, we highlight current and persistent critiques of sociological visualization, note recent developments in visualization tools for sociologists, and propose how sociologists can be reflective about their visualization choices. As a case study, we outline the visualization development and selection process in our project of mapping Chinese religious venues. We explain the visualization challenges we faced, the visual biases we hoped to manage, the strengths and limitations of various visualization methods we identified, and how we selected visualizations for varying research queries. In addition, we provide a list of considerations for fellow sociologists working to visualize geospatial point data.",
				"issue": "2",
				"language": "eng",
				"libraryCatalog": "brill.com",
				"pages": "249-274",
				"publicationTitle": "Review of Religion and Chinese Society",
				"shortTitle": "Mapping Religious Sites in China",
				"url": "https://brill.com/view/journals/rrcs/9/2/article-p249_5.xml",
				"volume": "9",
				"attachments": [],
				"tags": [
					{
						"tag": "ArcGIS"
					},
					{
						"tag": "geospatial data"
					},
					{
						"tag": "mapping"
					},
					{
						"tag": "point data"
					},
					{
						"tag": "visualization"
					},
					{
						"tag": "可視化"
					},
					{
						"tag": "地圖製作"
					},
					{
						"tag": "地理空間數據"
					},
					{
						"tag": "點狀數據"
					}
				],
				"notes": [
					"abs:摘要基於可視化研究的學術領域，我們提出對於社會學可視化研究已有的和持續的批評，指出可視化工具的新近發展，對於社會學學者在可視化選擇過程中應有的反思提出建議。作為一個案例研究，我們簡要概述在製作中國宗教場所地圖過程中關於可視化的種種選擇，坦承解釋所遇到的種種挑戰，如何盡力減少視覺偏見，檢討不同可視化方法的優點和侷限，以及如何根據研究問題而選定可視方式。最後，我們提供一個需要考慮因素的清單，或許可以作為社會學學者在地理空間點狀數據的可視化中的參考。",
					{
						"note": "orcid:0000-0002-1935-3215 | Jackie Henke"
					},
					{
						"note": "orcid:0000-0002-4723-9735 | Fenggang Yang (楊鳳崗)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/rrcs/9/2/article-p170_2.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Toward a Chinese Buddhist Modernism: Khenpo Sodargye and the Han Inundation of Larung Gar",
				"creators": [
					{
						"firstName": "Andrew S.",
						"lastName": "Taylor (唐安竺)",
						"creatorType": "author"
					}
				],
				"date": "2022/10/24",
				"DOI": "10.1163/22143955-12340005",
				"ISSN": "2214-3947, 2214-3955",
				"abstractNote": "Larung Gar is often hailed by scholars and practitioners alike as a last bastion of authentic Buddhist practice by ethnic Tibetans within the PRC. And yet, Larung is visited every year by tens of thousands of Han pilgrims and houses hundreds of Han monastics who have taken vows in the Tibetan Buddhist tradition. The author draws on a variety of oral and written sources to show that the Han inundation of Larung was not a byproduct of happenstance, but was actively facilitated by the Larung leadership, especially Khenpo Sodargye (མཁན་པོ་བསོད་དར་རྒྱས་ 索达吉堪布), through the targeted recruitment of Han practitioners. A comparative analysis of Tibetan- and Chinese-language materials shows that the neo-scientific and therapeutic teachings used to recruit Han practitioners superficially resemble similar “Buddhist modernist” discourses in the west and Tibet, but that their content is decidedly more soteriological than this moniker suggests. The article considers whether the encounter between Han practitioners and Tibetan Buddhism might eventually represent a nascent form of inter-ethnic Chinese Buddhist modernism.",
				"issue": "2",
				"language": "eng",
				"libraryCatalog": "brill.com",
				"pages": "170-197",
				"publicationTitle": "Review of Religion and Chinese Society",
				"shortTitle": "Toward a Chinese Buddhist Modernism",
				"url": "https://brill.com/view/journals/rrcs/9/2/article-p170_2.xml",
				"volume": "9",
				"attachments": [],
				"tags": [
					{
						"tag": "Chinese Buddhist modernism"
					},
					{
						"tag": "Khenpo Sodargye"
					},
					{
						"tag": "Larung Gar"
					},
					{
						"tag": "中国佛教现代主义"
					},
					{
						"tag": "喇荣五明佛学院"
					},
					{
						"tag": "索达吉堪布"
					}
				],
				"notes": [
					"abs:摘要佛学者和佛教徒都同意喇荣五明佛学院是中国境内真正藏传佛教修行的最后堡垒。然而，每年都有数以万计的汉族朝圣者到访喇荣，其中包含了数百名在藏传佛教传承中出家发愿的汉族僧侣。作者利用各种口头和书面资料表明汉族在喇荣的存在并非偶然的现象，而是喇荣的佛教领袖—尤其是索达吉堪布—主动招募汉族的佛教徒的结果。通过对藏文和语文材料的比较分析，本文展示用于招募汉族佛教徒的“新科学”和“新治疗”的教法，虽然表面上类似于在西方和西藏的“佛教现代主义”的话语，但其内容在“现代主义”之上救世神学的色彩更浓。本文讨论了汉族佛教徒与藏传佛教之间的相遇是否最终可能代表了一种新兴的、跨民族“中国佛教现代主义”。"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/rrcs/9/2/article-p222_4.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Seekers and Seers: Lay Buddhists and Buddhist Revival in Rural China",
				"creators": [
					{
						"firstName": "Shin-yi",
						"lastName": "Chao (趙昕毅)",
						"creatorType": "author"
					}
				],
				"date": "2022/10/24",
				"DOI": "10.1163/22143955-12340007",
				"ISSN": "2214-3947, 2214-3955",
				"abstractNote": "This paper explores lay Buddhism in contemporary rural North China through investigating the practice and practitioners of “Buddha-chanting” (nianfo 念佛) in relation to local religion, monastic Buddhism, and spirit mediums. The nianfo groups are led by and consist of ordinary villagers, overwhelmingly female. They meet in private houses or village temples of local deities. The groups are not subject to the authority of clergy, but individual group members, especially the leaders, may maintain a close relationship with a Buddhist monastery. These individuals are a link from monastic Buddhism to the Buddhist masses in villages, and the nianfo groups are the nexus of the networks. Members of the nianfo groups have a clear sense of being Buddhist while they also participate in activities of local religion. In addition, village spirit mediums, with whom the villagers often consult during crises, command some influence. They have also played a consequential role in the process of restoring Buddhism in the area.",
				"issue": "2",
				"language": "eng",
				"libraryCatalog": "brill.com",
				"pages": "222-248",
				"publicationTitle": "Review of Religion and Chinese Society",
				"shortTitle": "Seekers and Seers",
				"url": "https://brill.com/view/journals/rrcs/9/2/article-p222_4.xml",
				"volume": "9",
				"attachments": [],
				"tags": [
					{
						"tag": "lay Buddhism"
					},
					{
						"tag": "nianfo"
					},
					{
						"tag": "rural China"
					},
					{
						"tag": "spirit mediums"
					},
					{
						"tag": "women in lay Buddhism"
					},
					{
						"tag": "中國農村"
					},
					{
						"tag": "女性居士"
					},
					{
						"tag": "居士佛教"
					},
					{
						"tag": "念佛"
					},
					{
						"tag": "靈媒"
					}
				],
				"notes": [
					"abs:摘要本文通过调查“念佛会”与当地宗教、寺院佛教和灵媒的关系，探讨当代华北农村的居士佛教。念佛会由普通村民自发组织领导，绝大多数是女性。他们在私人住宅或民间宗教的村庄神庙中念佛。这些团体独立于神职人员权威，但个别团体成员，尤其是领导人，与佛教寺院保持密切关系。这些人是寺院佛教与乡村佛教群众的纽带，念佛团体是農村佛教网络的交汇点。念佛团体成員在参与当地宗教活动的同时，有着明确的佛教徒意识。此外，村民在危机期间经常咨询的村灵灵媒也具有一定的影响力。 他们还在该地区恢复佛教的过程中发挥了重要作用。",
					{
						"note": "orcid:0000-0001-8918-0826 | Shin-yi Chao (趙昕毅)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/ssm/36/3-4/article-p349_4.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Les premiers pères maristes en nouvelle-calédonie (1843-1853): Les enjeux de l’évangélisation et de l’inculturation",
				"creators": [
					{
						"firstName": "Yannick",
						"lastName": "Essertel",
						"creatorType": "author"
					}
				],
				"date": "2023/12/14",
				"DOI": "10.1163/18748945-bja10083",
				"ISSN": "1874-8945, 1874-8937",
				"abstractNote": "Résumé Entre 1844 et 1853, Guillaume Douarre, premier vicaire apostolique de Nouvelle-Calédonie, avec quelques pères et frères Maristes, débarquent pour évangéliser la Nouvelle-Calédonie. Dans un pays vierge de présence coloniale, en dépit des intentions de prise de possession de la France, les Maristes débutent leur prêche dans la langue locale qu’ils ont apprise. Immergés dans une culture qu’ils essayent de comprendre ils obtiennent quelques conversions et forment des catéchistes comme futurs relais auprès des habitants. Or, en 1847, alors que Douarre réalise un voyage en Europe, une coalition menée par quelques chefs kanak détruit la mission et massacre un frère. En nous appuyant sur le Journal de l’évêque nous pouvons remonter aux origines de ce drame. Nous apprenons que les Kanak se demandent si les « âmes des ancêtres ne sont pas de retour » installant un premier malentendu. Âmes censées avoir un pouvoir sur les éléments de la nature. Un deuxième malentendu prend corps : le rite du baptême dispensé par les « ancêtres » fait mourir pour certains, surtout quand survient l’épidémie de peste entrainant la mort aussi de chrétiens. Ces causes mêlées à des frustrations diverses ont donc abouti à la destruction de la mission. En dépit de ce drame l’inculturation du christianisme était à l’œuvre comme pouvait en témoigner l’émergence d’une solide petite chrétienté. Celle-ci était formée par des Maristes, appliquant une pédagogie d’évangélisation respectant les cultures, recommandée par les Instructions de la Propaganda Fide.",
				"issue": "3/4",
				"language": "fra",
				"libraryCatalog": "brill.com",
				"pages": "349-388",
				"publicationTitle": "Social Sciences and Missions",
				"shortTitle": "Les premiers pères maristes en nouvelle-calédonie (1843-1853)",
				"url": "https://brill.com/view/journals/ssm/36/3-4/article-p349_4.xml",
				"volume": "36",
				"attachments": [],
				"tags": [
					{
						"tag": "Instructions de la Propaganda Fide"
					},
					{
						"tag": "New Caledonia"
					},
					{
						"tag": "Nouvelle-Calédonie"
					},
					{
						"tag": "Propaganda Fide Instructions"
					},
					{
						"tag": "colonisation"
					},
					{
						"tag": "colonization"
					},
					{
						"tag": "culture kanak"
					},
					{
						"tag": "evangelisation"
					},
					{
						"tag": "inculturation"
					},
					{
						"tag": "kanak culture"
					},
					{
						"tag": "malentendu"
					},
					{
						"tag": "marist fathers"
					},
					{
						"tag": "misunderstanding"
					},
					{
						"tag": "pères maristes"
					},
					{
						"tag": "vicaire-apostolique"
					},
					{
						"tag": "vicar-apostolic"
					},
					{
						"tag": "évangélisation"
					}
				],
				"notes": [
					"abs:AbstractBetween 1844 and 1853, Guillaume Douarre, the first vicar apostolic of New Caledonia, along with a few Marist fathers and brothers, landed to evangelize New Caledonia. In a land untouched by colonial presence, despite France’s intentions to take possession, the Marists began preaching in the local language they had learned. Immersed in a culture they were trying to understand, they obtained a few converts and trained catechists as future relays to the inhabitants. But in 1847, while Douarre was on a trip to Europe, a coalition led by several Kanak chiefs destroyed the mission and massacred one of the brothers. Based on the Bishop’s Diary we can trace the origins of this tragedy. We learn that the Kanaks are wondering whether the “souls of the ancestors have returned”, setting up an initial misunderstanding. Souls who are supposed to have power over the elements of nature. A second misunderstanding takes shape : the rite of baptism dispensed by “ancestors” causes death for some, especially when the plague epidemic results in the death of Christians too. These causes, combined with various frustrations, led to the destruction of the mission. Despite this failure, the inculturation of Christianity was at work, as witnessed by the emergence of a solid little Christianity. This was formed by Marists, applying a pedagogy of evangelization respectful of cultures recommended by the Propaganda Fide Instructions., AbstractBetween 1844 and 1853, Guillaume Douarre, the first vicar apostolic of New Caledonia, along with a few Marist fathers and brothers, landed to evangelize New Caledonia. In a land untouched by colonial presence, despite France’s intentions to take possession, the Marists began preaching in the local language they had learned. Immersed in a culture they were trying to understand, they obtained a few converts and trained catechists as future relays to the inhabitants. But in 1847, while Douarre was on a trip to Europe, a coalition led by several Kanak chiefs destroyed the mission and massacred one of the brothers. Based on the Bishop’s Diary we can trace the origins of this tragedy. We learn that the Kanaks are wondering whether the “souls of the ancestors have returned”, setting up an initial misunderstanding. Souls who are supposed to have power over the elements of nature. A second misunderstanding takes shape : the rite of baptism dispensed by “ancestors” causes death for some, especially when the plague epidemic results in the death of Christians too. These causes, combined with various frustrations, led to the destruction of the mission. Despite this failure, the inculturation of Christianity was at work, as witnessed by the emergence of a solid little Christianity. This was formed by Marists, applying a pedagogy of evangelization respectful of cultures recommended by the Propaganda Fide Instructions.",
					{
						"note": "orcid:0000-0002-9623-5829 | Yannick Essertel"
					},
					{
						"note": "Paralleltitel: The First Marist Brothers in New Caledonia (1843-1853): The Challenges of Evangelization and Inculturation"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/scri/20/1/article-p106_8.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Livres polémiques imprimés en arabe, en Moldavie et en Valachie, au milieu du XVIIIe siècle",
				"creators": [
					{
						"firstName": "Policarp",
						"lastName": "Chițulescu",
						"creatorType": "author"
					}
				],
				"date": "2024/10/09",
				"DOI": "10.1163/18177565-bja10115",
				"ISSN": "1817-7530, 1817-7565",
				"abstractNote": "Résumé Les livres arabes imprimés dans les Principautés roumaines au milieu du XVIIIe siècle par le patriarche Sylvestre d’Antioche, avec l’aide généreuse des princes Ioan et Constantin Mavrocordat et de nombreux partisans locaux, étaient très recherchés dans les provinces arabophones de l’Empire ottoman. Ainsi, les copies ont presque entièrement disparu, détruites par un usage intense ou le passage du temps, ou pour des raisons confessionnelles. Par conséquent, les livres arabes du patriarche Sylvestre sont extrêmement rares de nos jours, leur contenu restant peu connu et peu étudié, une circonstance qui est révélée par leur absence dans les bibliographies et les études scientifiques du monde entier. Il est donc impératif de faire des recherches approfondies sur les livres arabes de Iași et de Bucarest imprimés en soutien aux chrétiens orthodoxes arabophones, de découvrir le contexte historique qui a généré un besoin d’œuvres polémiques imprimées en arabe, et les efforts du clergé orthodoxe et des princes roumains pour la consolidation de l’orthodoxie au Levant. Cette étude démontre que des projets véritablement missionnaires tels que celui du patriarche Sylvestre ont placé les sociétés roumaine, grecque, arabe et ottomane dans une interdépendance fascinante. L’article présente les résultats de nos recherches consacrées à l’imprimerie arabe en Moldavie et en Valachie à l’époque du patriarche Sylvestre d’Antioche en soutien à ses ouailles orthodoxes arabophones.",
				"issue": "1",
				"language": "fre",
				"libraryCatalog": "brill.com",
				"pages": "106-136",
				"publicationTitle": "Scrinium",
				"url": "https://brill.com/view/journals/scri/20/1/article-p106_8.xml",
				"volume": "20",
				"attachments": [],
				"tags": [
					{
						"tag": "Church of Antioch"
					},
					{
						"tag": "Empire ottoman"
					},
					{
						"tag": "Orthodox-Catholic interaction"
					},
					{
						"tag": "Principautés roumaines"
					},
					{
						"tag": "Romanian Principalities"
					},
					{
						"tag": "Sylvester of Antioch"
					},
					{
						"tag": "Sylvestre d’Antioche"
					},
					{
						"tag": "Syria"
					},
					{
						"tag": "Syrie"
					},
					{
						"tag": "interaction orthodoxe-catholique"
					},
					{
						"tag": "the Ottoman Empire"
					},
					{
						"tag": "Église d’Antioche"
					}
				],
				"notes": [
					"abs:RésuméLes livres arabes imprimés dans les Principautés roumaines au milieu du XVIIIe siècle par le patriarche Sylvestre d’Antioche, avec l’aide généreuse des princes Ioan et Constantin Mavrocordat et de nombreux partisans locaux, étaient très recherchés dans les provinces arabophones de l’Empire ottoman. Ainsi, les copies ont presque entièrement disparu, détruites par un usage intense ou le passage du temps, ou pour des raisons confessionnelles. Par conséquent, les livres arabes du patriarche Sylvestre sont extrêmement rares de nos jours, leur contenu restant peu connu et peu étudié, une circonstance qui est révélée par leur absence dans les bibliographies et les études scientifiques du monde entier. Il est donc impératif de faire des recherches approfondies sur les livres arabes de Iași et de Bucarest imprimés en soutien aux chrétiens orthodoxes arabophones, de découvrir le contexte historique qui a généré un besoin d’œuvres polémiques imprimées en arabe, et les efforts du clergé orthodoxe et des princes roumains pour la consolidation de l’orthodoxie au Levant. Cette étude démontre que des projets véritablement missionnaires tels que celui du patriarche Sylvestre ont placé les sociétés roumaine, grecque, arabe et ottomane dans une interdépendance fascinante. L’article présente les résultats de nos recherches consacrées à l’imprimerie arabe en Moldavie et en Valachie à l’époque du patriarche Sylvestre d’Antioche en soutien à ses ouailles orthodoxes arabophones., AbstractThe Arabic books printed in the Romanian Principalities in the mid-18th century by Patriarch Sylvester of Antioch with the generous help of the princes Ioan and Constantin Mavrocordat and many local supporters were much sought after in the Arabic-speaking provinces of the Ottoman Empire. Thus, copies disappeared almost entirely, destroyed through intense use or the passing of time, or for confessional reasons. Consequently, Patriarch Sylvester’s Arabic books are extremely rare nowadays, their content remaining little known and surveyed, a circumstance that is revealed by their absence from the scientific bibliographies and studies around the world. It is therefore imperative to carefully research the Arabic books of Iași and Bucharest printed in support of the Orthodox Arabic-speaking Christians, to discover the historical background that generated a need for polemical works printed in Arabic, and the efforts of the Orthodox clergy and the Romanian princes towards the consolidation of Orthodoxy in the Levant. This survey demonstrates that genuinely missionary projects such as Patriarch Sylvester’s placed the Romanian, Greek, Arabic, and Ottoman societies in a fascinating interdependence. The article presents the results of our research dedicated to Arabic printing in Moldavia and Wallachia in the days of Patriarch Sylvester of Antioch in support of his Orthodox Arabic-speaking flock., RésuméLes livres arabes imprimés dans les Principautés roumaines au milieu du XVIIIe siècle par le patriarche Sylvestre d’Antioche, avec l’aide généreuse des princes Ioan et Constantin Mavrocordat et de nombreux partisans locaux, étaient très recherchés dans les provinces arabophones de l’Empire ottoman. Ainsi, les copies ont presque entièrement disparu, détruites par un usage intense ou le passage du temps, ou pour des raisons confessionnelles. Par conséquent, les livres arabes du patriarche Sylvestre sont extrêmement rares de nos jours, leur contenu restant peu connu et peu étudié, une circonstance qui est révélée par leur absence dans les bibliographies et les études scientifiques du monde entier. Il est donc impératif de faire des recherches approfondies sur les livres arabes de Iași et de Bucarest imprimés en soutien aux chrétiens orthodoxes arabophones, de découvrir le contexte historique qui a généré un besoin d’œuvres polémiques imprimées en arabe, et les efforts du clergé orthodoxe et des princes roumains pour la consolidation de l’orthodoxie au Levant. Cette étude démontre que des projets véritablement missionnaires tels que celui du patriarche Sylvestre ont placé les sociétés roumaine, grecque, arabe et ottomane dans une interdépendance fascinante. L’article présente les résultats de nos recherches consacrées à l’imprimerie arabe en Moldavie et en Valachie à l’époque du patriarche Sylvestre d’Antioche en soutien à ses ouailles orthodoxes arabophones., AbstractThe Arabic books printed in the Romanian Principalities in the mid-18th century by Patriarch Sylvester of Antioch with the generous help of the princes Ioan and Constantin Mavrocordat and many local supporters were much sought after in the Arabic-speaking provinces of the Ottoman Empire. Thus, copies disappeared almost entirely, destroyed through intense use or the passing of time, or for confessional reasons. Consequently, Patriarch Sylvester’s Arabic books are extremely rare nowadays, their content remaining little known and surveyed, a circumstance that is revealed by their absence from the scientific bibliographies and studies around the world. It is therefore imperative to carefully research the Arabic books of Iași and Bucharest printed in support of the Orthodox Arabic-speaking Christians, to discover the historical background that generated a need for polemical works printed in Arabic, and the efforts of the Orthodox clergy and the Romanian princes towards the consolidation of Orthodoxy in the Levant. This survey demonstrates that genuinely missionary projects such as Patriarch Sylvester’s placed the Romanian, Greek, Arabic, and Ottoman societies in a fascinating interdependence. The article presents the results of our research dedicated to Arabic printing in Moldavia and Wallachia in the days of Patriarch Sylvester of Antioch in support of his Orthodox Arabic-speaking flock.",
					{
						"note": "orcid:0000-0002-3869-8884 | Policarp Chițulescu"
					},
					{
						"note": "LF:"
					},
					{
						"note": "Paralleltitel: Polemical Books Printed in Arabic in Moldavia and Wallachia in the mid-18th Century"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
