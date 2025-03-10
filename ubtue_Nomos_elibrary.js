{
	"translatorID": "0bce3b83-2d27-40c0-98a2-9224244ed4bf",
	"label": "ubtue_Nomos_elibrary",
	"creator": "Mara Spieß",
	"target": "https://www.nomos-elibrary.de/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-10 09:55:04"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Universitätsbibliothek Tübingen

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
	if (url.includes('?page=')) {
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
	var rows = doc.querySelectorAll('a.pl-contents__link[href*="/de/10."]');
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
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {

		let abstracts = doc.querySelectorAll('div.abstract-container > p');
		abstracts.forEach((abstract, index) => {
			if (index === 0) {
				item.abstractNote = abstract.textContent;
				} else {
					item.notes.push("abs:" + abstract.textContent);
				}
		});

		item.complete();
	});

	let em = await translator.getTranslatorObject();

	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nomos-elibrary.de/de/10.5771/0010-3497-2023-4-471/realitaet-fiktionalitaet-virtualitaet-erkennbarkeit-als-journalistisches-problem-aus-historischer-sicht-jahrgang-56-2023-heft-4?page=1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Realität – Fiktionalität – Virtualität. Erkennbarkeit als journalistisches Problem aus historischer Sicht",
				"creators": [
					{
						"firstName": "Horst",
						"lastName": "Pöttker",
						"creatorType": "author"
					}
				],
				"date": "2024/01/14",
				"DOI": "10.5771/0010-3497-2023-4-471",
				"ISSN": "0010-3497, 2198-3852",
				"abstractNote": "Auf der erkenntnistheoretischen Grundlage eines prag- matisch-empirischen Realitätsbegriffs befasst sich der Beitrag mit der berufsethischen Norm, dass Fi…",
				"issue": "4",
				"language": "de",
				"libraryCatalog": "www.nomos-elibrary.de",
				"pages": "471-480",
				"publicationTitle": "Communicatio Socialis (ComSoc)",
				"url": "https://www.nomos-elibrary.de/de/10.5771/0010-3497-2023-4-471/realitaet-fiktionalitaet-virtualitaet-erkennbarkeit-als-journalistisches-problem-aus-historischer-sicht-jahrgang-56-2023-heft-4",
				"volume": "56",
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
				"notes": [
					"Auf der erkenntnistheoretischen Grundlage eines prag- matisch-empirischen Realitätsbegriffs befasst sich der Beitrag mit der berufsethischen Norm, dass Fiktionales im Journalismus als solches erkennbar sein muss. Neben einer Rekonstruktion ihrer Entwicklung wird analysiert, wie die Geltung dieser Norm dadurch gefährdet wird, dass mit fortschreitender Digitalisierung Virtualität als täuschende Schein-Realität auch im Journalismus attraktiver wird. Was ist in dieser Situation zu tun? ",
					"On the epistemological basis of a pragmatic-empirical concept of reality, the article deals with the professional ethical norm that fictional elements in journalism must be recogniz- able as such. In addition to a reconstruction of its development, the paper analyzes how the validity of this norm is endangered by the fact that, with advancing digitalization, virtuality is becoming more attractive as a deceptive illusory reality in journalism as well. What is to be done in this situation? "
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nomos-elibrary.de/de/10.5771/0588-9804-2024-3-5/gesundheit-und-heilung-ethische-theologische-und-seelsorgerische-perspektiven-jahrgang-60-2024-heft-3?page=1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Gesundheit und Heilung – Ethische, theologische und seelsorgerische Perspektiven",
				"creators": [
					{
						"firstName": "Susan",
						"lastName": "Abraham",
						"creatorType": "author"
					},
					{
						"firstName": "Stan Chu",
						"lastName": "Ilo",
						"creatorType": "author"
					}
				],
				"date": "2024/06/24",
				"DOI": "10.5771/0588-9804-2024-3-5",
				"ISSN": "0588-9804, 2943-0054",
				"issue": "3",
				"language": "de",
				"libraryCatalog": "www.nomos-elibrary.de",
				"pages": "5-8",
				"publicationTitle": "Concilium",
				"url": "https://www.nomos-elibrary.de/de/10.5771/0588-9804-2024-3-5/gesundheit-und-heilung-ethische-theologische-und-seelsorgerische-perspektiven-jahrgang-60-2024-heft-3",
				"volume": "60",
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
	}
]
/** END TEST CASES **/
