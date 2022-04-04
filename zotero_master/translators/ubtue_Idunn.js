{
	"translatorID": "4b0cdfd0-2bb1-4cde-8535-939df5e93c92",
	"label": "ubtue_Idunn",
	"creator": "Helena Nebel",
	"target": "idunn\\.no",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-31 14:59:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

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

var reviewURLs = [];

function detectWeb(doc, url) {
	// except for "multiple", the return values of this function are placeholders that
	// will be replaced by the Embedded Metadata translator's results
	if (/\/doi\/.+/.test(url))
		return "journalArticle";
	else if (/\/toc\/.+/.test(url))
		return "multiple";
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, '//div[@class="issue-item__title"]/a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	let sections = ZU.xpath(doc, '//div[@class="titled_issues"][contains(h4, "Bokmeldinger") or contains(h4, "book review")]');
	for (let i = 0; i < sections.length; i++) {
		let rows = ZU.xpath(sections[i], './/div[@class="issue-item__title"]/a');
		for (let i = 0; i < rows.length; i++) {
			reviewURLs.push(rows[i].href);
		}
		}
	return found ? items : false;
}

function postProcess(item, doc) {
	item.creators = [];
	for (let a of ZU.xpath(doc, '//div[@property="author"]')) {
		let creator = {"firstName": "", "lastName": "", "creatorType": "author"};
		if (ZU.xpathText(a, './/span[@property="givenName"]') != null) creator.firstName = ZU.xpathText(a, './/span[@property="givenName"]');
		if (ZU.xpathText(a, './/span[@property="familyName"]') != null) creator.lastName = ZU.xpathText(a, './/span[@property="familyName"]');
		item.creators.push(creator);
	}
 	//Paralleltitel --> 4002
 	let parallelTitel = ZU.xpathText(doc, '//div[(@property="name" and @lang="en")]');
 	if (parallelTitel) {
 		parallelTitel = ZU.trimInternal(parallelTitel);
 		item.notes.push({note: 'Paralleltitel:' + parallelTitel});
 	}
 	if (ZU.xpathText(doc, '//span[@class="subtitle"]') != null) item.title = item.title + ": " + ZU.xpathText(doc, '//span[@class="subtitle"]');
 	
	// sanitize page number ranges
	if (item.pages) {
		let pages = item.pages.trim();
		if (pages) {
			let matched = pages.match(/^([0-9]+-[0-9]+)/);
			if (matched)
				item.pages = matched[1];
			}
		}
	
	if (typeof item.abstractNote == 'undefined') {
		let absNO = ZU.xpathText(doc, '//section[@id="abstract"]/div[@role="paragraph"]');
		let absEN = ZU.xpathText(doc, '//section[@id="abstract-en"]/div[@role="paragraph"]');
		if (absEN != null && absNO != null) {
			item.abstractNote = absNO + '\\n4207 ' + absEN;
		}
		else if (absNO != null) {
			item.abstractNote = absNO;
		}
		else if (absEN != null) {
			item.abstractNote = absEN;
		}
			}
		let openAccessTag = ZU.xpathText(doc, '//i[@class="icon-open_access"]');
		if (openAccessTag != null) {
				item.notes.push({'note': 'LF:'});
		}
		if (reviewURLs.includes(item.url.replace("https://doi.org/", "https://www.idunn.no/doi/"))) {
			item.tags.push('RezensionstagPica');
			item.abstractNote = '';
			}
		let issn_list = ['1893-0271', '1890-7008'];
		for (let issn of issn_list) {
			if (item.url.match(issn) != null) item.ISSN = issn;
		}
		if (item.url.match(/\/njrs/) != null) item.ISSN = '1890-7008';
		item.attachments = [];
		//on the website, a note says "The journal only publishes articles in English"
		if (item.issue[0] == '0') {
			item.issue = item.issue.substring(1, item.issue.length);
		}
		let newNotes = [];
		for (let note of item.notes) {
			if (note.note.match(/^(?:<p>)?doi:/) == null) {
				newNotes.push(note);
			}
		}
		item.notes = newNotes;
		for (let keyWordTag of ZU.xpath(doc, '//section[@property="keywords"]/ol//a')) {
			item.tags.push(keyWordTag.textContent);
		}
		if (item.date == undefined || item.date == "") item.date = ZU.xpathText(doc, '//span[@property="datePublished"]').match(/\d{4}/)[0];
		item.complete();
	}

function invokeRISTranslator(doc, url) {
	let doi = url.match(/\/doi\/(.+$)/)[1];
	risURL = "https://www.idunn.no/action/downloadCitation?doi=" + doi + "&format=ris"
	ZU.doGet(risURL, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			postProcess(item, doc);
		});
		translator.translate();
	});
}

function scrape(doc, url) {
	let content = doc.contentDocument;
	invokeRISTranslator(doc, url);
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else
		scrape(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.idunn.no/nordic_journal_of_religion_and_society/2020/02",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.idunn.no/doi/10.18261/issn.1890-7008-2020-02-01",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Who is Baptized? A Study of Socioeconomic, Regional and Gender Differences in Child Baptism in the Church of Sweden, 2005 and 2015",
				"creators": [
					{
						"firstName": "Pernilla",
						"lastName": "Jonsson",
						"creatorType": "author"
					},
					{
						"firstName": "Patrik",
						"lastName": "Svensson",
						"creatorType": "author"
					},
					{
						"firstName": "Andreas",
						"lastName": "Sandberg",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.18261/issn.1890-7008-2020-02-01",
				"ISSN": "1890-7008",
				"abstractNote": "In less than 15 years, child baptism has gone from being a mainstream tradition to a minority practice. This decline is a result of both high unaffiliation, especially with the Church of Sweden, and a more diversified religious society due to migration. Using microdata from parents of children born in 2005 and 2015, we were able to discern that differences in the practice of child baptism in the Church of Sweden are positively associated with the parents’ relation to the church, residence in rural areas, and income. Our LPM analysis shows that the probability of a child being baptized are mainly determined by the parents’ relation to the church when controlling for all the other variables. The most influential factors are the mother’s affiliation and an urban lifestyle. Parents’ marital status and socioeconomic circumstances have a strong effect on the decision to baptize a child, therefore affecting who becomes a future member of the church.",
				"issue": "2",
				"journalAbbreviation": "Nordic Journal of Religion and Society",
				"libraryCatalog": "ubtue_Idunn",
				"pages": "72-86",
				"publicationTitle": "Nordic Journal of Religion and Society",
				"shortTitle": "Who is Baptized?",
				"url": "https://doi.org/10.18261/issn.1890-7008-2020-02-01",
				"volume": "33",
				"attachments": [],
				"tags": [
					{
						"tag": "Baptism"
					},
					{
						"tag": "Sweden"
					},
					{
						"tag": "religious ceremonies"
					},
					{
						"tag": "religious practice"
					},
					{
						"tag": "secularization"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.idunn.no/nordic_journal_of_religion_and_society/2007/01",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.idunn.no/doi/10.18261/issn.1893-0271-2021-02-02",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Da Gud forlot Gud: Jesu vei til døden og dens betydning for oss",
				"creators": [
					{
						"firstName": "Knut",
						"lastName": "Alfsvåg",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.18261/issn.1893-0271-2021-02-02",
				"ISSN": "1893-0271",
				"abstractNote": "Ifølge NT er Faderen og Sønnen ett, samtidig som Faderen forlater Sønnen på korset. Hvordan blir vår gudsforståelse om vi antar at denne motsetningen uttrykker kjernen i Guds vesen? Ifølge Bibelen står mennesker under Guds vrede fordi de har gjort urett mot sitt medmenneske. Jesus identifiserer seg med denne plasseringen, men bæres likevel gjennom døden til oppstandelsen. Heller ikke under Guds vrede faller en ut av det frelsende gudsforhold. Dette betinger isolert sett en verdensrettferdiggjørelse, men tvetydigheten i gudsbildet fastholdes ved at frelse formidles i form av en utvelgelseslære som fastholder dommens to utganger.\\n4207 According to the NT, the Father and the Son are one, but still the Father leaves the Son on the cross. What are the implications of considering this as the essence of divinity? In the Bible, humans are placed under the wrath of God because they have sinned against their neighbours. Jesus accepts this as the truth even of his own life, but is still carried through death to the resurrection. This could lead to a doctrine of apocatastasis, but the ambiguity in the image of God is retained through the idea of an eternal judgment with two different outcomes.",
				"issue": "2",
				"journalAbbreviation": "Teologisk tidsskrift",
				"libraryCatalog": "ubtue_Idunn",
				"pages": "64-75",
				"publicationTitle": "Teologisk tidsskrift",
				"shortTitle": "Da Gud forlot Gud",
				"url": "https://doi.org/10.18261/issn.1893-0271-2021-02-02",
				"volume": "10",
				"attachments": [],
				"tags": [
					{
						"tag": "Atonement"
					},
					{
						"tag": "Soteriology"
					},
					{
						"tag": "The cross"
					},
					{
						"tag": "The understanding of God"
					},
					{
						"tag": "forsoning"
					},
					{
						"tag": "frelseslære"
					},
					{
						"tag": "gudsforståelse"
					},
					{
						"tag": "korset"
					}
				],
				"notes": [
					{
						"note": "Paralleltitel:When God left God: The significance of the death of Jesus"
					},
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
		"url": "https://www.idunn.no/doi/10.18261/issn.1893-0271-2021-02-03",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Endringsledelse i kirken krever nye teologiske modeller: Forhandlinger om ekklesiologi i ledelsen av prester",
				"creators": [
					{
						"firstName": "Angela",
						"lastName": "Timmann-Mjaaland",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.18261/issn.1893-0271-2021-02-03",
				"ISSN": "1893-0271",
				"abstractNote": "Omorganiseringer stiller store krav til refleksjon, ledelse og nytenkning. En ny kirkestruktur krever også ny teologi, en refleksjon rundt ekklesiologi og praksis. Hvis ikke kirkens ledelse kan gi endringene en god teologisk begrunnelse, skaper det støy og motvilje i organisasjonen. Men dette kan også være fruktbart dersom støyen utfordrer pastorale ledere til nytenkning og kritisk refleksjon: Skal det tenkes lokalt eller regionalt? Er «kirke» stedsavgrenset (menighet), eller anerkjennes også tidsbestemte møter med evangeliet? Intervjuene viser at biskoper, proster og sokneprester argumenterer ulikt: Prostene bidrar til realistisk nytenkning, mens sokneprester og biskoper ofte faller tilbake på kjente modeller. Hva kan dette skyldes?\\n4207 Reorganisation of the church requires critical reflection, leadership and innovation concerning theology and praxis. If church leaders are unable to give good theological reasons for structural changes, it causes disturbances and reluctance in the organisation. However, disturbance can be fruitful if it provokes critical reflection upon ecclesiology: Should they think locally or regionally? Is «church» limited to a specific place (parish) or also recognised as temporal encounters with the gospel throughout a lifetime? My interviews show that bishops, deans and ministers argue differently: The deans offer critical and innovative reflection, whereas ministers and bishops often return to well-established models. Why?",
				"issue": "2",
				"journalAbbreviation": "Teologisk tidsskrift",
				"libraryCatalog": "ubtue_Idunn",
				"pages": "76-91",
				"publicationTitle": "Teologisk tidsskrift",
				"shortTitle": "Endringsledelse i kirken krever nye teologiske modeller",
				"url": "https://doi.org/10.18261/issn.1893-0271-2021-02-03",
				"volume": "10",
				"attachments": [],
				"tags": [
					{
						"tag": "Church reform"
					},
					{
						"tag": "Ecclesiology"
					},
					{
						"tag": "Ekklesiologi"
					},
					{
						"tag": "Pastoral theology"
					},
					{
						"tag": "Reorganisation"
					},
					{
						"tag": "Transformative leadership"
					},
					{
						"tag": "endringsledelse"
					},
					{
						"tag": "kirkereform"
					},
					{
						"tag": "omorganisering"
					},
					{
						"tag": "pastoralteologi"
					}
				],
				"notes": [
					{
						"note": "Paralleltitel:Transformative leadership in church requires new theological models"
					},
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
		"url": "https://www.idunn.no/doi/10.18261/njrs.34.2.1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Muslim Attitudes Towards Islamic Finance in Sweden: The Case of Loans with Interest",
				"creators": [
					{
						"firstName": "Göran",
						"lastName": "Larsson",
						"creatorType": "author"
					},
					{
						"firstName": "Erika",
						"lastName": "Willander",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.18261/njrs.34.2.1",
				"ISSN": "1890-7008",
				"abstractNote": "Financial systems uphold sets of ideas and norms which individuals are expected to internalize and live by. This is what Aitken (2007) refers to as ‘economic citizenshipʼ. In this article, we depart from the framework of ‘economic citizenshipʼ to justify the subjective side of economic decisions rooted in Islamic principles. Specifically, we contrast the “Swedish financial system” based on values that promote loans based on interest with the “Islamic system”, which is based on religious values that, for instance, reject interest. While Islamic finance is often associated with Islamic banking, this article asks two questions: To what extent are mosque attendees in Sweden informed by Islamic norms and ethics when making financial decisions for themselves and their families? Do they take out a loan and own their flat or house? The analysis for this article is based on data collected by the FINEX project in 2018 (n = 339). Our findings suggest that a majority of mosque attendees refrain from taking bank loans with interest (76 percent of the sample). We also find associations between both time in Sweden and socioeconomic factors and refraining from having loans with interest. Thus, we stipulate that that this choice is practically and religiously motivated. We conclude that future research needs to broaden the scope, include a larger number of Muslims, and aim to sample in order to generalize findings to the Swedish population.",
				"issue": "2",
				"journalAbbreviation": "Nordic Journal of Religion and Society",
				"libraryCatalog": "ubtue_Idunn",
				"pages": "76-88",
				"publicationTitle": "Nordic Journal of Religion and Society",
				"shortTitle": "Muslim Attitudes Towards Islamic Finance in Sweden",
				"url": "https://doi.org/10.18261/njrs.34.2.1",
				"volume": "34",
				"attachments": [],
				"tags": [
					{
						"tag": "Islam"
					},
					{
						"tag": "Islamic finance"
					},
					{
						"tag": "Muslims"
					},
					{
						"tag": "Sweden"
					},
					{
						"tag": "financial behaviour"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
