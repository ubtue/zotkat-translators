{
	"translatorID": "c3686d57-7b15-45d2-9538-5a083e385c89",
	"label": "ubtue_Revue de Theologie et de Philosophie",
	"creator": "Timotheus Kim",
	"target": "https://revues.droz.org/RThPh",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-25 13:10:44"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Universitätsbibliothek Tübingen.  All rights reserved.
	
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
	if (url.includes('/article/')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.media-heading a');
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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await invokeDOI(await requestDocument(url));
		}
	}
	else {
		await invokeDOI(doc, url);
	}
}

async function invokeDOI(doc, url) {
	//check if DOI class exists
	if (ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "doi", " " ))]//a') != null) {
		let translator = Zotero.loadTranslator('web');
		translator.setTranslator('c159dcfe-8a53-4301-a499-30f6549c340d');
		translator.setDocument(doc);
		translator.setHandler('itemDone', (_obj, item) => {
			//check subtitle
			if (doc.querySelector('h1.page-header p.small')) item.title += ': ' + doc.querySelector('h1.page-header p.small').innerText;
			  item.complete();
		});
		await translator.translate();
	} //invoke DOI translator as subtranslator
	else {
		var item = new Zotero.Item('journalArticle');
		if (ZU.xpathText(doc, '//*[@class="authors"]/strong')) {
			for (author of ZU.xpathText(doc, '//*[@class="authors"]/strong').split(",")) {
				item.creators.push(ZU.cleanAuthor(author, "author"));	
			}
		}
		item.title = ZU.trimInternal(ZU.xpathText(doc, '//h1[@class="page-header"]'));
		let volumeIssueEntry = ZU.xpathText(doc, '//*[@class="breadcrumb"]').trim();
		if (volumeIssueEntry) {
			item.volume = volumeIssueEntry.match(/(?:vol\.)\s+(\d+)(?:.*(?:n°)\s+(\d+))(?:.*(?:\()(\d{4}))?/i)[1];
			item.issue = volumeIssueEntry.match(/(?:vol\.)\s+(\d+)(?:.*(?:n°)\s+(\d+))(?:.*(?:\()(\d{4}))?/i)[2];
			item.date = volumeIssueEntry.match(/(?:vol\.)\s+(\d+)(?:.*(?:n°)\s+(\d+))(?:.*(?:\()(\d{4}))?/i)[3];
		}
		item.ISSN = "2297-1254, 0035-1784"
		item.url = url;
		if (ZU.xpathText(doc, '//*[@class="breadcrumb"]//a[contains(@href, "#BIB")]')) {
			item.tags.push('RezensionstagPica');
		}
		item.complete();
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://revues.droz.org/RThPh/article/view/RThPh_155.1_41-58",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La maison comme lieu de réunion des premiers chrétiens: Nouvelles approches et leur réception critique",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Andreas",
						"lastName": "Dettwiler"
					}
				],
				"date": "2023-05-08",
				"DOI": "10.47421/rthph155_1_41-58",
				"ISSN": "2297-1254, 0035-1784",
				"abstractNote": "Un consensus avait établi depuis longtemps que les premiers chrétiens se seraient essentiellement réunis dans des maisons privées. Cela a été récemment mis en cause notamment par l’étude d’Edward Adams de 2016 (première édition 2013). Notre contribution vise à soumettre cette nouvelle hypothèse à une analyse critique, mettant notamment en évidence les multiples avantages qu’offraient les espaces d’habitations privés pour les premières communautés chrétiennes. On ne saurait pourtant en déduire que la pratique cultuelle aurait simplement transformé l’espace profane de la maison romaine en espace sacré. Il faut plutôt considérer que ces communautés se voyaient elles-mêmes comme un « espace sacré », transcendant ainsi tous les espaces socio-culturels préexistants.",
				"issue": "1",
				"journalAbbreviation": "RThPh",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "41-58",
				"publicationTitle": "Revue de Théologie et de Philosophie",
				"shortTitle": "La maison comme lieu de réunion des premiers chrétiens",
				"url": "https://revues.droz.org/RThPh/article/view/RThPh_155.1_41-58",
				"volume": "155",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revues.droz.org/RThPh/article/view/RThPh_155.1_73-91",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Remaniement de la « carte mentale » paulinienne dans les lettres à Timothée et Tite",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "K. Luc",
						"lastName": "Bulundwe"
					}
				],
				"date": "2023-05-08",
				"DOI": "10.47421/rthph155_1_73-91",
				"ISSN": "2297-1254, 0035-1784",
				"abstractNote": "La présente contribution propose un panorama des représentations géographiques des lettres à Timothée et Tite, aussi appelées les Pastorales. À l’aide du concept de « carte mentale », elle montre comment les trois lettres remanient la perception spatiale du champ d’action paulinien d’est vers l’ouest, au tournant du ier et du IIe siècle. Le déplacement spatial identifié correspond à la majorité des études historiques qui situent les trois lettres parmi les premières réceptions de Paul. Il met également en évidence les soubassements géographiques de la reconfiguration de la notion d’oikos dans ces premières réceptions, souvent occultés dans les études sur l’univers domestique des Pastorales. Cet article pave ainsi la voie à l’étude de la maison romaine dans les trois lettres proposée dans ce numéro par Michael Theobald.",
				"issue": "1",
				"journalAbbreviation": "RThPh",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "73-91",
				"publicationTitle": "Revue de Théologie et de Philosophie",
				"url": "https://revues.droz.org/RThPh/article/view/RThPh_155.1_73-91",
				"volume": "155",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revues.droz.org/RThPh/issue/current",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://revues.droz.org/RThPh/issue/view/RThPh_155.2",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://revues.droz.org/RThPh/article/view/RThPh_155.1_7-15",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Introduction au volume",
				"creators": [
					{
						"firstName": "K. Luc",
						"lastName": "Bulundwe",
						"creatorType": "author"
					},
					{
						"firstName": "Simon",
						"lastName": "Butticaz",
						"creatorType": "author"
					},
					{
						"firstName": "Andreas",
						"lastName": "Dettwiler",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"ISSN": "2297-1254, 0035-1784",
				"issue": "1",
				"libraryCatalog": "ubtue_Revue de Theologie et de Philosophie",
				"url": "https://revues.droz.org/RThPh/article/view/RThPh_155.1_7-15",
				"volume": "155",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revues.droz.org/RThPh/article/view/RThPh_155.2_165-167",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Christian Jacob, Faut-il prendre les Deipnosophistes au sérieux ? Paris, Les Belles Lettres, 2020, 300 p.",
				"creators": [
					{
						"firstName": "Stefan",
						"lastName": "Imhoof",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"ISSN": "2297-1254, 0035-1784",
				"issue": "2",
				"libraryCatalog": "ubtue_Revue de Theologie et de Philosophie",
				"shortTitle": "Christian Jacob, Faut-il prendre les Deipnosophistes au sérieux ?",
				"url": "https://revues.droz.org/RThPh/article/view/RThPh_155.2_165-167",
				"volume": "155",
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
