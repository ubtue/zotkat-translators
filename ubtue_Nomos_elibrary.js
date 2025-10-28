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
	"lastUpdated": "2025-10-28 10:06:13"
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
	var rows = doc.querySelectorAll('li.pl-contents__item[data-doi*="10."]');
	for (let row of rows) {
		let hrefElement = row.querySelector('button.js-contents-details[data-route*="/de/document"]');
		let titleElement = row.querySelector('button.pl-contents__link');
		if (!hrefElement || !titleElement) continue;

		let href = hrefElement.getAttribute('data-route');
		let title = ZU.trimInternal(titleElement.textContent);
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
		"url": "https://www.nomos-elibrary.de/de/document/view/pdf/uuid/2de3435a-e37c-36b2-9435-99f4413f3f7b?page=1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Virtuelle Realität im Journalismus. Potenziale und Herausforderungen der partizipativ-immersiven Dimension der Berichterstattung",
				"creators": [
					{
						"firstName": "Aynur",
						"lastName": "Sarısakaloğlu",
						"creatorType": "author"
					}
				],
				"date": "2024/01/14",
				"DOI": "10.5771/0010-3497-2023-4-460",
				"ISSN": "0010-3497, 2198-3852",
				"abstractNote": "Die Einführung von virtueller Realität (VR) im Journalismus eröffnet eine partizipativ-immersive Dimension der Berichterstattung. Als eine interaktive Schnittstelle zwischen Mensch und Maschine ermöglichen VR-Technologien durch die Simulation menschlicher Sinneswahrnehmungen das Eintauchen der Rezipient:innen in synthetisch dargestellte journalistische Ereignisse. Der Beitrag bietet hierzu eine Einführung in den immersiven Journalismus, gefolgt von einer Analyse der Potenziale und Herausforderungen für die Nachrichtenproduktion und -rezeption. Es werden exemplarisch Denkanstöße zur Reflexion medienethi- scher Dimensionen der immersiven Berichterstattung angeregt und Schlussfolgerungen formuliert.",
				"issue": "4",
				"language": "de",
				"libraryCatalog": "www.nomos-elibrary.de",
				"pages": "460-470",
				"publicationTitle": "Communicatio Socialis (ComSoc)",
				"url": "https://www.nomos-elibrary.de/de/document/view/detail/uuid/2de3435a-e37c-36b2-9435-99f4413f3f7b",
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
					"abs:The introduction of virtual reality (VR) in journalism opens up a participatory-immer- sive dimension of reporting. As an interactive interface between human and machine, VR technologies enable the immersion of recipients in synthetically presented journalistic events by simulating human sensory perceptions. This article offers an introduction to immersive journalism, followed by an analysis of the potentials and challenges for news production and reception. It provides examples of thought-provoking impulses for reflect- ing on the media-ethical dimensions of immersive reporting and formulates conclusions. "
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nomos-elibrary.de/de/document/view/pdf/uuid/c20a1014-f6be-3357-8d2c-749535de162e?page=1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sakramentalität der Welt",
				"creators": [
					{
						"firstName": "Kimberly Hope",
						"lastName": "Belcher",
						"creatorType": "author"
					}
				],
				"date": "2025/04/21",
				"DOI": "10.5771/0588-9804-2025-2-117",
				"ISSN": "0588-9804, 2943-0054",
				"abstractNote": "Die Sakramente sind die göttliche Pädagogik, durch die der dreieinige Gott die Christen lehrt, die Welt zu lesen und in ihr die Gegenwart Gottes und ihre eigene Bestimmung zu finden. Diese Pädagogik geht in zwei Richtungen: Einerseits sind die Sakramente privilegierte Momente in der Heilsökonomie, die die Christen lehren, die Welt richtig zu lesen und Gottes Charakter in der geschaffenen Ordnung zu erkennen. Andererseits erhellen die Eigenschaften der Schöpfung und ihrer Beziehungen sowohl die Praxis als auch das Verständnis der Sakramente. In der wechselseitigen Dynamik, die durch die sakramentale Praxis entsteht, verkündet die Schöpfung ihren Ursprung und ihr Telos in Gott sowie ihre wechselseitige Abhängigkeit von den Menschen. Die pädagogische Bedeutung der Sakramente gab den Anstoß für die Entwicklung des Konzepts im Westen, dass sie »Zeichen der heiligen Dinge« sind, »Zeichen einer heiligen Sache, insofern es die Menschen heilig macht«, oder Symbole. Eine parallele Reihe von Traditionen betrifft die Sakramente als Pädagogik für die geistigen Sinne. Die sakramentalen Feiern der Kirche stellen eine Reihe von Beziehungen und Gegensätzen her, die den Christen dabei helfen, Gott in der Welt zu finden. Gleichzeitig ist ein Verständnis der Welt als sakramentale Natur wichtig, um zu verhindern, dass sakramentale Symbole flach und idiosynkratisch werden.",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "www.nomos-elibrary.de",
				"pages": "117-124",
				"publicationTitle": "Concilium",
				"url": "https://www.nomos-elibrary.de/de/document/view/detail/uuid/c20a1014-f6be-3357-8d2c-749535de162e",
				"volume": "61",
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
		"url": "https://www.nomos-elibrary.de/de/document/view/pdf/uuid/3f8137ce-539f-3ff2-ad50-5f43ce8625c0?page=1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Partizipative Forschung in der Forensischen Psychiatrie – Chancen und Herausforderungen aus Patientensicht",
				"creators": [
					{
						"firstName": "Eva",
						"lastName": "Drewelow",
						"creatorType": "author"
					},
					{
						"firstName": "Peggy",
						"lastName": "Walde",
						"creatorType": "author"
					},
					{
						"firstName": "Birgit",
						"lastName": "Völlm",
						"creatorType": "author"
					}
				],
				"date": "2025/08/10",
				"DOI": "10.1486/RP-2025-3_150",
				"ISSN": "0724-2247, 2942-4887",
				"issue": "3",
				"language": "de",
				"libraryCatalog": "www.nomos-elibrary.de",
				"pages": "150-158",
				"publicationTitle": "Recht & Psychiatrie",
				"url": "https://www.nomos-elibrary.de/de/document/view/detail/uuid/3f8137ce-539f-3ff2-ad50-5f43ce8625c0",
				"volume": "43",
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
		"url": "https://www.nomos-elibrary.de/de/document/view/detail/uuid/87864be1-6c18-3a6a-8801-8cb2c37afd6c",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nomos-elibrary.de/de/document/view/detail/uuid/3cab01dd-bdf1-3288-a557-49384ba27cd0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nomos-elibrary.de/de/document/view/detail/uuid/ebe14e62-2423-3313-8668-fa7db3f38eb5",
		"items": "multiple"
	}
]
/** END TEST CASES **/
