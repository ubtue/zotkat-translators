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
	"lastUpdated": "2022-03-17 11:19:18"
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
		var rows = doc.querySelectorAll('.hlFld-Abstract');
		for (let row of rows) {
			var abstractsEntry = row.innerText.replace(/^abstract/i, '');
			if (abstractsEntry) {
				var abstractsOneTwoThree = abstractsEntry.split(/\n\n/g);
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
		if (pagesEntry.match(/\s\d+\w?-\d+/) != null) i.pages = pagesEntry.match(/\s\d+\w?-\d+/)[0];
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
		let openAccessTag = doc.querySelector('.accessIconLocation[src]');
		if (openAccessTag && openAccessTag.src.match(/open\s?access/gi)) i.notes.push({note: 'LF:'});
		// mark articles as "LF" (MARC=856 |z|kostenfrei), that are free accessible e.g. conference report 10.30965/25890433-04902001 
		let freeAccess = text(doc, '.color-access-free');
		if (freeAccess && freeAccess.match(/(free|freier)\s+(access|zugang)/gi)) i.notes.push('LF:');
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
				"abstractNote": "\\n4207 Ambrosius, in psalm. 61 gilt als zwölfter und letzter Text seiner Explanatio in psalmos XII. Ihr gewissermaßen zweigeteilter Inhalt – einerseits christologische Psalmenexegese, andererseits Bezugnahmen auf politische Ereignisse – hat in der Überlieferung allerdings auch zu anderen Werkzusammenstellungen geführt. Der vorliegende Beitrag untersucht Probleme und Fragen, die sich im Rahmen der Editionsarbeit dieses Textes stellen. Es ist unklar, ob Ambrosius dem Werk einen Titel gab und ob der Text von Ambrosius selbst ‚veröffentlicht‘ wurde. Der Beitrag untersucht unterschiedliche Werkzusammenstellungen und geht der Frage nach, ob der Mailänder Kanoniker Martinus Corbo Urheber der Verbindung der Explanatio in psalmos XII war und ob ein Codex, den Corbo aus Verona erhielt (Milano, Bibl. Ambr. I 145 inf., s. xii), tatsächlich Vorlage für Corbos Text war.\\n4207 Ambrosius’ in psalm. 61 is known as twelfth and last part of his Explanatio in psalmos XII. The twofold content – on the one hand, Christological exegesis, on the other hand, political implications – led, however, also to combinations with other works. This contribution focuses on problems and questions that arise when preparing a new critical edition of the text. It is unclear whether Ambrose gave the work a title and whether the text was ‘published’ by Ambrose himself. The article examines how in psalm. 61 was transmitted and asks if it was Martinus Corbo who was the first to add in psalm. 61 to the Explanatio in psalmos XII and whether a manuscript that Corbo received from Verona (Milano, Bibl. Ambr. I 145 inf., s. xii) could indeed have been the exemplar of Corbo’s text.",
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
	},
	{
		"type": "web",
		"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.SE.5.119445",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“Alles habt ihr mit Grabmälern angefüllt …” Kaiser Julian und die Transformation spätantiker Funeralkultur",
				"creators": [
					{
						"firstName": "Thomas R.",
						"lastName": "Karmann",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.1484/J.SE.5.119445",
				"ISSN": "2295-9025",
				"abstractNote": "\\n4207 Mediterranean funeral culture underwent a fundamental metamorphosis in late antiquity. Despite a few scholarly objections it appears that this transformation can be explained by the gradual rise of Christianity. This article provides a sort of test of this theory by asking whether the attempt to restore pagan culture under Emperor Julian (361-363) had any effect on practices concerning death and burial. Of utmost interest are, on the one hand, Julian’s objections to the Christian martyr cults which led among other things to the removal of the Babylas relics from the Temple of Apollo in Daphne, and, on the other hand, his Burial Law with a particular interest in the often-overlooked Letter 136b. Also to be considered are the burial of Constantius II, the death of Julian himself, and various associated eschatological conceptions. One notices a culture-defining difference in the way in which late antique pagans such as Julian, Libanius, and Eunapius of Sardes assume a strict division between life and death, cult and burial, purity and impurity. With late antique Christianity this could slowly be overturned through faith in the resurrection.\\n4207 Die Sepulkralkultur der Mittelmeerwelt erlebte in der Spätantike eine grundlegende Metamorphose. Auch wenn es hierzu in der Forschung gewichtige Gegenstimmen gibt, so ist dieser Wandel doch mit dem sukzessiven Aufstieg des Christentums zu erklären. Der Beitrag führt hierzu eine Art Gegenprobe durch und setzt sich deshalb mit der Frage auseinander, ob der pagane Restaurationsversuch unter Kaiser Julian (361-363) Auswirkungen auf die Bereiche von Tod und Bestattung hatte. Im Mittelpunkt des Interesses stehen dabei zum einen Julians massive Vorbehalte gegen den christlichen Märtyrerkult, die u.a. in der Entfernung der Babylas-Reliquien aus dem Apoll-Heiligtum von Daphne sichtbar wurden. Zum anderen wird Julians Bestattungsgesetz in den Blick genommen, der Aufsatz kommentiert dazu ausführlich die bislang weitgehend vernachlässigte Epistola 136b. Daneben werden die Bestattung Konstantius’ II., Julians eigener Tod sowie dabei aufscheinende eschatologische Vorstellungen untersucht. Als kulturell prägende Grunddifferenz zeigt sich, dass spätantike Heiden wie Julian, aber auch Libanios oder Eunapios von Sardes von einer strikten Trennung zwischen Leben und Tod, Kult und Bestattung bzw. Reinheit und Befleckung ausgingen. Im spätantiken Christentum konnte diese hingegen nach und nach überwunden werden, der Grund dafür liegt vor allem im Osterglauben.",
				"archiveLocation": "Turnhout, Belgium",
				"language": "de",
				"libraryCatalog": "www.brepolsonline.net",
				"pages": "7-66",
				"publicationTitle": "Sacris Erudiri",
				"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.SE.5.119445",
				"volume": "58",
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
		"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.SE.5.119450",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "New Identifications Among the Sixth-Century Fragments of Augustine in Cambridge University Library",
				"creators": [
					{
						"firstName": "H. A. G.",
						"lastName": "Houghton",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.1484/J.SE.5.119450",
				"ISSN": "2295-9025",
				"abstractNote": "This article offers a re-examination of the palimpsest fragments from a sixth-century codex of Augustine which were found in the Cairo Genizah and are now held in Cambridge University Library. The three largest fragments, with the shelfmark MS Add. 4320a-c, have already been identified as containing the end of De sermone domini and the beginning of Sermo 118. More recently, a smaller fragment of this manuscript was discovered in the Taylor-Schechter collection, also with text from De sermone domini (T-S AS 139.1). A full transcription of this fragment is published here for the first time. In addition, this article identifies the undertext on the two remaining substantial fragments of this manuscript (MS Add. 4320d). These contain part of Sermo 225 auct. and Contra sermonem Arrianorum, which means that they provide the oldest surviving witness to these works by several centuries. In addition to the editio princeps and images of these fragments, the article offers a small correction to Mutzenbecher’s edition of De sermone domini and briefly considers the nature of the original codex as a compilation of multiple writings by Augustine.",
				"archiveLocation": "Turnhout, Belgium",
				"language": "en",
				"libraryCatalog": "www.brepolsonline.net",
				"pages": "171-180",
				"publicationTitle": "Sacris Erudiri",
				"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.SE.5.119450",
				"volume": "58",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "LF:"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
