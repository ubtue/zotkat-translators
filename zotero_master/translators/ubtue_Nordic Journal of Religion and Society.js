{
	"translatorID": "4b0cdfd0-2bb1-4cde-8535-939df5e93c92",
	"label": "ubtue_Nordic Journal of Religion and Society",
	"creator": "Helena Nebel",
	"target": "idunn\\.no",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-04 11:45:29"
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
	if (/\/\d{4}\/\d{2}\/.+/.test(url))
		return "journalArticle";
	else if (/\/\d{4}\/\d{2}/.test(url))
		return "multiple";
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, '//div[@class="artTitle"]/a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	let sections = ZU.xpath(doc, '//div[@class="block"][contains(./div[@class="sectionHeading"], "review")]');
	for (let i = 0; i < sections.length; i++) {
		let rows = ZU.xpath(sections[i], './div[@class="element"]/div[@class="artTitle"]/a');
		for (let i = 0; i < rows.length; i++) {
			reviewURLs.push(rows[i].href);
		}
		}
	return found ? items : false;
}

function postProcess(item, doc) {
 	//Paralleltitel --> 4002
 	let parallelTitel = ZU.xpathText(doc, '//div[@class="trans-title"]');
 	if (parallelTitel) {
 		item.notes.push({note: 'Paralleltitel:' + parallelTitel});
 	}
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
		item.abstractNote = ZU.xpathText(doc, '//p[@class="first"]');
			}
	if (item.publicationTitle == 'Nordic Journal of Religion and Society') {
	if (reviewURLs.includes(item.url)) {
		item.tags.push('RezensionstagPica');
		item.abstractNote = '';
			}
	//on the website, a note says "The journal only publishes articles in English"
	item.language = 'en';
	}
	if (item.issue[0] == '0') {
		item.issue = item.issue.substring(1, item.issue.length);
	}
	item.complete();
	}

function invokeEmbeddedMetadataTranslator(doc) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(i, doc);
	});
	translator.translate();
}

function scrape(doc, url) {
	let content = doc.contentDocument;
	invokeEmbeddedMetadataTranslator(doc);
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
		"url": "https://www.idunn.no/nordic_journal_of_religion_and_society/2020/02/who_is_baptized_a_study_of_socioeconomic_regional_and_gen",
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
				"ISSN": "1890-7008, 0809-7291",
				"abstractNote": "In less than 15 years, child baptism has gone from being a mainstream tradition to a minority practice. This decline is a result of both high unaffiliation, especially with the Church of Sweden, and a more diversified religious society due to migration. Using microdata from parents of children born in 2005 and 2015, we were able to discern that differences in the practice of child baptism in the Church of Sweden are positively associated with the parents’ relation to the church, residence in rural areas, and income. Our LPM analysis shows that the probability of a child being baptized are mainly determined by the parents’ relation to the church when controlling for all the other variables. The most influential factors are the mother’s affiliation and an urban lifestyle. Parents’ marital status and socioeconomic circumstances have a strong effect on the decision to baptize a child, therefore affecting who becomes a future member of the church., Number of baptized and not-baptized children born in Sweden 2005–2016, Baptism rate in the Nordic majority churches, in percent 2008–2018, Baptism rate in rural municipalities and big cities, in percent 1995–2017., Table 1. Definition of variables, Table 2. Output of linear probability model of child baptism with the full sample., Table 3. Output of linear probability model of child baptism with children where at least one parent is affiliated to the Church of Sweden.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.idunn.no",
				"pages": "72-86",
				"publicationTitle": "Nordic Journal of Religion and Society",
				"shortTitle": "Who is Baptized?",
				"url": "https://www.idunn.no/nordic_journal_of_religion_and_society/2020/02/who_is_baptized_a_study_of_socioeconomic_regional_and_gen",
				"volume": "33",
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
		"url": "https://www.idunn.no/tt/2021/02/da_gud_forlot_gud_jesu_vei_til_doeden_og_dens_betydning_for",
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
				"ISSN": "1893-0271, 1893-0263",
				"abstractNote": "Ifølge NT er Faderen og Sønnen ett, samtidig som Faderen forlater Sønnen på korset. Hvordan blir\nvår gudsforståelse om vi antar at denne motsetningen uttrykker kjernen i Guds vesen? Ifølge Bibelen\nstår mennesker under Guds vrede fordi de har gjort urett mot sitt medmenneske. Jesus identifiserer\nseg med denne plasseringen, men bæres likevel gjennom døden til oppstandelsen. Heller ikke under\nGuds vrede faller en ut av det frelsende gudsforhold. Dette betinger isolert sett en\nverdensrettferdiggjørelse, men tvetydigheten i gudsbildet fastholdes ved at frelse formidles i form\nav en utvelgelseslære som fastholder dommens to utganger., According to the NT, the Father and the Son are one, but still the Father leaves the Son on the\ncross. What are the implications of considering this as the essence of divinity? In the Bible,\nhumans are placed under the wrath of God because they have sinned against their neighbours. Jesus\naccepts this as the truth even of his own life, but is still carried through death to the\nresurrection. This could lead to a doctrine of apocatastasis, but the ambiguity in the image of God\nis retained through the idea of an eternal judgment with two different outcomes.",
				"issue": "2",
				"language": "no-NO",
				"libraryCatalog": "www.idunn.no",
				"pages": "64-75",
				"publicationTitle": "Teologisk tidsskrift",
				"shortTitle": "Da Gud forlot Gud",
				"url": "https://www.idunn.no/tt/2021/02/da_gud_forlot_gud_jesu_vei_til_doeden_og_dens_betydning_for",
				"volume": "10",
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
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
