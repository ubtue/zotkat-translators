{
	"translatorID": "ade18ffe-62a6-4392-9853-eb658faf36e4",
	"label": "ubtue_Brepols",
	"creator": "Timotheus Kim",
	"target": "https?://www\\.brepolsonline\\.net",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-05-04 15:50:07"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
	
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
// attr()/text() v2
function attr(docOrElem ,selector ,attr ,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.textContent:null; }

function detectWeb(doc, url) {
	if (url.match(/doi/)) return "journalArticle";
		else if (url.includes('toc') && getSearchResults(doc, true)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.ref.nowrap');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].text.replace(/pdf|abstract|references|first\s?page|\(\d+\s?kb\)/gi, ''));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	}
	else {
		invokeEMTranslator(doc, url);
	}
}

function invokeEMTranslator(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (t, i) {
		var rows = doc.querySelectorAll('.hlFld-Abstract');//Z.debug(rows)
		for (let row of rows) {
			var abstractsEntry = row.innerText;//Z.debug(abstractsEntry)
			if (abstractsEntry) {
				var abstractsOneTwoThree = abstractsEntry.split('\n\n');//Z.debug(abstractsOneTwoThree)
				if (abstractsOneTwoThree[2]) {
					i.abstractNote = abstractsOneTwoThree[0] + '\\n4207 ' + abstractsOneTwoThree[1] + '\\n4207 ' + abstractsOneTwoThree[2];
				}
				else if (abstractsOneTwoThree[1]) {
					i.abstractNote = abstractsOneTwoThree[0] + '\\n4207 ' + abstractsOneTwoThree[1];
				}
				else if (!abstractsOneTwoThree[1]) {
					i.abstractNote = abstractsOneTwoThree[0];
				}
				
			} else {
				i.abstractNote = '';
				}
			}
		
		if (i.reportType === "book-review") i.tags.push('RezensionstagPica') && delete i.abstractNote;	
		let pagesEntry = text(doc, '.publicationContentPages');
		i.pages = pagesEntry.match(/\s\d+\w?-\d+/)[0];
		let volumes = text(doc, '.breadcrumbs');
		if (volumes) i.volume = volumes.match(/Volume\s?\d+/)[0].replace('Volume', '');
		let issue = text(doc, '.breadcrumbs');
		let issueError = issue.toString();
		i.archive = i.issue;
		if (issueError) i.issue = issueError.split('>')[3].split('Issue')[1];
		let year = attr(doc, 'ul.breadcrumbs li:nth-child(4) a', 'href');
		if (year && year.match(/\w+\/\d+/)) i.date = year.split('/')[3];
		let issn = text(doc, '.serialDetailsEissn');
		if (issn) i.ISSN = issn.replace('Online ISSN:', '');
		i.itemType = "journalArticle";
		i.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.REA.5.122730",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zu Ambrosius, Explanatio in psalm. 61: Titel, Anfangsworte, ‚Veröffentlichung‘ und Corpus-Bildung",
				"creators": [
					{
						"firstName": "Victoria",
						"lastName": "Zimmerl-Panagl",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1484/J.REA.5.122730",
				"ISSN": "2428-3606",
				"abstractNote": "Ambrosius, in psalm. 61 gilt als zwölfter und letzter Text seiner Explanatio in psalmos XII. Ihr gewissermaßen zweigeteilter Inhalt – einerseits christologische Psalmenexegese, andererseits Bezugnahmen auf politische Ereignisse – hat in der Überlieferung allerdings auch zu anderen Werkzusammenstellungen geführt. Der vorliegende Beitrag untersucht Probleme und Fragen, die sich im Rahmen der Editionsarbeit dieses Textes stellen. Es ist unklar, ob Ambrosius dem Werk einen Titel gab und ob der Text von Ambrosius selbst ‚veröffentlicht‘ wurde. Der Beitrag untersucht unterschiedliche Werkzusammenstellungen und geht der Frage nach, ob der Mailänder Kanoniker Martinus Corbo Urheber der Verbindung der Explanatio in psalmos XII war und ob ein Codex, den Corbo aus Verona erhielt (Milano, Bibl. Ambr. I 145 inf., s. xii), tatsächlich Vorlage für Corbos Text war. /n4207 Ambrosius’ in psalm. 61 is known as twelfth and last part of his Explanatio in psalmos XII. The twofold content – on the one hand, Christological exegesis, on the other hand, political implications – led, however, also to combinations with other works. This contribution focuses on problems and questions that arise when preparing a new critical edition of the text. It is unclear whether Ambrose gave the work a title and whether the text was ‘published’ by Ambrose himself. The article examines how in psalm. 61 was transmitted and asks if it was Martinus Corbo who was the first to add in psalm. 61 to the Explanatio in psalmos XII and whether a manuscript that Corbo received from Verona (Milano, Bibl. Ambr. I 145 inf., s. xii) could indeed have been the exemplar of Corbo’s text. /n4207 L’In psalm. 61 d’Ambroise est connu comme la douzième et dernière partie de son Explanatio in psalmos XII. Son contenu en deux parties – d’une part, l’exégèse christologique des psaumes, d’autre part, les références aux événements politiques – a également suscité, dans la transmission, des combinaisons avec d’autres œuvres. Cet article examine les problèmes et les questions qui se posent lors de la préparation d’une nouvelle édition critique. Il n’est pas certain que ce soit Ambroise qui ait donné un titre à l’œuvre, ni même qu’il ait « publié » luimême le texte. L’article examine comment In psalm. 61 a été transmis et étudie l’hypothèse selon laquelle ce serait en fait Martinus Corbo qui aurait le premier ajouté In psalm. 61 à l’Explanatio in psalmos XII. En outre, est posée la question de savoir si un manuscrit de Vérone (Milano, Bibl. Ambr. I 145 inf., s. xii) était réellement le modèle de Corbo.",
				"archiveLocation": "Paris, France",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "www.brepolsonline.net",
				"pages": "17-52",
				"publicationTitle": "Revue d'Etudes Augustiniennes et Patristiques",
				"shortTitle": "Zu Ambrosius, Explanatio in psalm. 61",
				"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.REA.5.122730",
				"volume": "66",
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
	}
]
/** END TEST CASES **/
