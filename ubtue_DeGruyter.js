{
	"translatorID": "9ef1752e-bd32-49bb-9d9b-f06c039712ab",
	"label": "ubtue_DeGruyter",
	"creator": "Timotheus Kim",
	"target": "^https?://www\\.degruyter\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-01-20 10:22:32"
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

function detectWeb(doc, url) {
	if (url.match(/document/)) return "journalArticle";
		else if (url.match(/journal/) && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "issueContentsArticleLink", " " ))]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.text);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
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
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else
		invokeEMTranslator(doc, url);
}

function invokeEMTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (i.abstractNote != null) i.abstractNote = i.abstractNote.replace(/^Zusammenfassung\s+/, '');
		if (i.title.match(/ISBN/) || i.publicationTitle === 'Verkündigung und Forschung') i.tags.push('RezensionstagPica') && delete i.abstractNote;
		let transAbstract = ZU.xpathText(doc, '//*[(@id = "transAbstract")]//p');
		if (transAbstract == null) transAbstract = ZU.xpathText(doc, '//div[contains(@class,"abstract-")]/p');
		if (i.abstractNote && transAbstract) i.abstractNote += '\\n4207 ' + transAbstract;
		let pseudoabstract = i.title;
		if (ZU.xpathText(doc, '//span[contains(., "Open Access") and contains(@class, "OpenAccess")]')) i.notes.push('LF:');
		if (ZU.xpathText(doc, '//span[contains(@class, "accessAccessible") and (contains(., "Öffentlich zugänglich") or contains(., "Publicly Available"))]')) i.notes.push('LF:');
		
		if (i.abstractNote === undefined) i.abstractNote = '';
		
		let subtitle = text(doc, 'h2.subtitle');
		if (subtitle && !i.title.includes(': ')) {
			i.title = `${i.title.trim()}: ${subtitle}`;
		}
		if (i.abstractNote.includes(pseudoabstract) || i.abstractNote.match(/^Der Artikel/)) {
			delete i.abstractNote;
		}
		for (let keyWord of ZU.xpath(doc, '//div[contains(@class, "keywords")]/a')) {
			if (!i.tags.includes(keyWord.textContent)) i.tags.push(keyWord.textContent);
		}
		for (let authorTag of ZU.xpath(doc, '//span[contains(@class, "contributor")]')) {
			let orcidRegex = /\d+-\d+-\d+-\d+x?/i;
			if (authorTag != null && authorTag.innerHTML.match(orcidRegex)) {
				let authorname = ZU.xpath(authorTag, '//span[@class ="displayName linkAnimation"]')
				let name = (authorname != null && authorname.length) ? authorname[0].innerText : authorTag.innerText;
				let orcid = authorTag.innerHTML.match(orcidRegex);
				i.notes.push({note:'orcid:' + orcid + ' | '+ name +' | taken from website'});	
			}
		}
		if (!i.ISSN) i.ISSN = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "onlineissn", " " )) and contains(concat( " ", @class, " " ), concat( " ", "text-metadata-value", " " ))]');
		//delete lastPage if the value of firstPage is the same value as lastPage
		if (i.pages) {
			i.pages = i.pages.trim().replace(/^([^-]+)-\1$/, '$1');
		}
		if (i.ISSN == '2300-6579') {
			let match = url.match(/opth-(\d{4}-\d{4})/);
			if (match) {
				i.notes.push('artikelID:' + match[1].replace('-', ''));
			}
		}

		i.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.14315/arg-2019-1100103/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zwischen Tradition und Innovation: Lukas von Prag als liturgischer Theologe der Böhmischen Brüder",
				"creators": [
					{
						"firstName": "Tabita",
						"lastName": "Landová",
						"creatorType": "author"
					}
				],
				"date": "2019/12/01",
				"DOI": "10.14315/arg-2019-1100103",
				"ISSN": "2198-0489",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "23-48",
				"publicationTitle": "Archiv für Reformationsgeschichte - Archive for Reformation History",
				"shortTitle": "Zwischen Tradition und Innovation",
				"url": "https://www.degruyter.com/document/doi/10.14315/arg-2019-1100103/html",
				"volume": "110",
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
		"url": "https://www.degruyter.com/document/doi/10.14315/arg-2019-1100109/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Heinrich Bullinger, sein Diarium und der Beginn der Kleinen Eiszeit-Phase von 1570 bis 1630",
				"creators": [
					{
						"firstName": "Otto",
						"lastName": "Ulbricht",
						"creatorType": "author"
					}
				],
				"date": "2019/12/01",
				"DOI": "10.14315/arg-2019-1100109",
				"ISSN": "2198-0489",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "200-236",
				"publicationTitle": "Archiv für Reformationsgeschichte - Archive for Reformation History",
				"url": "https://www.degruyter.com/document/doi/10.14315/arg-2019-1100109/html",
				"volume": "110",
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
		"url": "https://www.degruyter.com/document/doi/10.14315/vf-2020-650205/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "New Testament and Digital Humanities",
				"creators": [
					{
						"firstName": "Claire",
						"lastName": "Clivaz",
						"creatorType": "author"
					}
				],
				"date": "2020/08/01",
				"DOI": "10.14315/vf-2020-650205",
				"ISSN": "2198-0454",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "98-104",
				"publicationTitle": "Verkündigung und Forschung",
				"url": "https://www.degruyter.com/document/doi/10.14315/vf-2020-650205/html",
				"volume": "65",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/nzsth-2022-0006/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Philosophical Optimism and Philosophy of Historical Progress in Slovak Lutheran Ethics in the First Half of the 19th Century",
				"creators": [
					{
						"firstName": "Vasil",
						"lastName": "Gluchman",
						"creatorType": "author"
					}
				],
				"date": "2022/05/01",
				"DOI": "10.1515/nzsth-2022-0006",
				"ISSN": "1612-9520",
				"abstractNote": "The author studies the form of philosophical optimism in Slovak Lutheran ethics in the first half of the 19 th century in the views of Ján Kollár and Ján Chalupka. Herder’s philosophy of history and his philosophy of historical progress significantly influenced Slovak Lutheran ethics of the given period. In the author’s view, Kollár and Chalupka mainly appreciated human history as progress in all parts of life and refused glorification of the past. However, they did not limit their assessment to a positive evaluation of the present; they used one’s own mistakes and faults to appeal to moral development of man and placed to the forefront the belief in a better future of mankind in the form of humanity.\\n4207 Der Autor untersucht die Form des philosophischen Optimismus in der slowakischen lutherischen Ethik in der ersten Hälfte des 19. Jahrhunderts nach den Ansichten von Ján Kollár und Ján Chalupka. Herders Geschichtsphilosophie und seine Philosophie des historischen Fortschritts haben die slowakisch-lutherische Ethik dieser Zeit maßgeblich beeinflusst. Nach Ansicht des Autors bewerten Kollár und Chalupka die Menschheitsgeschichte vor allem als Fortschritt in allen Lebensbereichen und lehnen eine Verherrlichung der Vergangenheit ab. Sie beschränkten ihre Einschätzung jedoch nicht auf eine positive Bewertung der Gegenwart; sie benutzten eigene und sonstige Fehler, um an die moralische Entwicklung des Menschen zu appellieren und stellen den Glauben an eine bessere Zukunft der Menschheit in Form von Humanität in den Vordergrund.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "124-138",
				"publicationTitle": "Neue Zeitschrift für Systematische Theologie und Religionsphilosophie",
				"url": "https://www.degruyter.com/document/doi/10.1515/nzsth-2022-0006/html",
				"volume": "64",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Chalupka"
					},
					{
						"tag": "Herder"
					},
					{
						"tag": "Kollár"
					},
					{
						"tag": "Philosophie des historischen Fortschritts"
					},
					{
						"tag": "Philosophischer Optimismus"
					},
					{
						"tag": "philosophical optimism"
					},
					{
						"tag": "philosophy of historical progress"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/nzsth-2022-0006/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Philosophical Optimism and Philosophy of Historical Progress in Slovak Lutheran Ethics in the First Half of the 19th Century",
				"creators": [
					{
						"firstName": "Vasil",
						"lastName": "Gluchman",
						"creatorType": "author"
					}
				],
				"date": "2022/05/01",
				"DOI": "10.1515/nzsth-2022-0006",
				"ISSN": "1612-9520",
				"abstractNote": "The author studies the form of philosophical optimism in Slovak Lutheran ethics in the first half of the 19 th century in the views of Ján Kollár and Ján Chalupka. Herder’s philosophy of history and his philosophy of historical progress significantly influenced Slovak Lutheran ethics of the given period. In the author’s view, Kollár and Chalupka mainly appreciated human history as progress in all parts of life and refused glorification of the past. However, they did not limit their assessment to a positive evaluation of the present; they used one’s own mistakes and faults to appeal to moral development of man and placed to the forefront the belief in a better future of mankind in the form of humanity.\\n4207 Der Autor untersucht die Form des philosophischen Optimismus in der slowakischen lutherischen Ethik in der ersten Hälfte des 19. Jahrhunderts nach den Ansichten von Ján Kollár und Ján Chalupka. Herders Geschichtsphilosophie und seine Philosophie des historischen Fortschritts haben die slowakisch-lutherische Ethik dieser Zeit maßgeblich beeinflusst. Nach Ansicht des Autors bewerten Kollár und Chalupka die Menschheitsgeschichte vor allem als Fortschritt in allen Lebensbereichen und lehnen eine Verherrlichung der Vergangenheit ab. Sie beschränkten ihre Einschätzung jedoch nicht auf eine positive Bewertung der Gegenwart; sie benutzten eigene und sonstige Fehler, um an die moralische Entwicklung des Menschen zu appellieren und stellen den Glauben an eine bessere Zukunft der Menschheit in Form von Humanität in den Vordergrund.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "124-138",
				"publicationTitle": "Neue Zeitschrift für Systematische Theologie und Religionsphilosophie",
				"url": "https://www.degruyter.com/document/doi/10.1515/nzsth-2022-0006/html",
				"volume": "64",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Chalupka"
					},
					{
						"tag": "Herder"
					},
					{
						"tag": "Kollár"
					},
					{
						"tag": "Philosophie des historischen Fortschritts"
					},
					{
						"tag": "Philosophischer Optimismus"
					},
					{
						"tag": "philosophical optimism"
					},
					{
						"tag": "philosophy of historical progress"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/zfr-2021-0015/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Allies in the Fullness of Theory",
				"creators": [
					{
						"firstName": "Mark Q.",
						"lastName": "Gardiner",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Engler",
						"creatorType": "author"
					}
				],
				"date": "2021/10/20",
				"DOI": "10.1515/zfr-2021-0015",
				"ISSN": "2194-508X",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "259-267",
				"publicationTitle": "Zeitschrift für Religionswissenschaft",
				"url": "https://www.degruyter.com/document/doi/10.1515/zfr-2021-0015/html",
				"volume": "29",
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
		"url": "https://www.degruyter.com/document/doi/10.1515/spircare-2021-0066/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Thomas Wild (2021) Seelsorge in Krisen. Zur Eigentümlichkeit pastoralpsychologischer Praxis. Göttingen: Vandenhoeck & Ruprecht. ISBN: 978-3-525-6245-4; 270 Seiten; Preis D 23,99 €",
				"creators": [
					{
						"firstName": "Ruth",
						"lastName": "Mächler",
						"creatorType": "author"
					}
				],
				"date": "2022/05/31",
				"DOI": "10.1515/spircare-2021-0066",
				"ISSN": "2365-8185",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "186-187",
				"publicationTitle": "Spiritual Care",
				"shortTitle": "Thomas Wild (2021) Seelsorge in Krisen. Zur Eigentümlichkeit pastoralpsychologischer Praxis. Göttingen",
				"url": "https://www.degruyter.com/document/doi/10.1515/spircare-2021-0066/html",
				"volume": "11",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [
					{
						"note": "Ruth Mächler   | orcid:0000-0002-8029-9633 | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/spircare-2021-0065/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hartmut Rosa über den Umgang mit Sterben, Tod und Trauer: Ein Gespräch mit dem Soziologen und Begründer der Resonanztheorie Prof. Dr. Hartmut Rosa, Friedrich-Schiller-Universität Jena",
				"creators": [
					{
						"firstName": "Heidi",
						"lastName": "Müller",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Berthold",
						"creatorType": "author"
					}
				],
				"date": "2022/05/31",
				"DOI": "10.1515/spircare-2021-0065",
				"ISSN": "2365-8185",
				"abstractNote": "Article Hartmut Rosa über den Umgang mit Sterben, Tod und Trauer was published on May 31, 2022 in the journal Spiritual Care (volume 11, issue 2).",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "114-118",
				"publicationTitle": "Spiritual Care",
				"shortTitle": "Hartmut Rosa über den Umgang mit Sterben, Tod und Trauer",
				"url": "https://www.degruyter.com/document/doi/10.1515/spircare-2021-0065/html",
				"volume": "11",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Daniel Berthold   | orcid:0000-0001-9816-8650 | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/spircare-2022-0057/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Psychiatrische Patientinnen und Patienten in Vukovar (Kroatien) und ihre Bedürfnisse nach Vergebung: Psychiatric patients in Vukovar (Croatia) and their needs for forgiveness",
				"creators": [
					{
						"firstName": "Andrijana",
						"lastName": "Glavas",
						"creatorType": "author"
					},
					{
						"firstName": "Arndt",
						"lastName": "Büssing",
						"creatorType": "author"
					},
					{
						"firstName": "Klaus",
						"lastName": "Baumann",
						"creatorType": "author"
					}
				],
				"date": "2022/11/01",
				"DOI": "10.1515/spircare-2022-0057",
				"ISSN": "2365-8185",
				"abstractNote": "27 Jahre nach dem Krieg in Kroatien ist der Prozess der Vergebung und Versöhnung zwischen den damaligen Kriegsparteien nicht abgeschlossen. Das Ziel dieser Studie war es zu untersuchen, welche Bedürfnisse bezüglich Vergebung Patientinnen und Patienten in Psychiatrie und Psychotherapie in Kroatien haben. Methode: Anonyme Querschnittserhebung mit standardisierten Fragebögen unter 200 Patientinnen und Patienten mit Traumafolgeerkrankungen (TFE) und anderen psychischen Erkrankungen, die im Allgemein- und Veteranenkrankenhaus in Vukovar behandelt wurden. Ergebnisse: Für eine große Anzahl der Patienten und Patientinnen spielen das Bedürfnis, jemandem zu vergeben, und das Bedürfnis, selbst Vergebung zu erlangen, eine wichtige Rolle. Signifikante Unterschiede in der Ausprägung der Stärke der Bedürfnisse gab es zwischen Patientengruppen: mit und ohne TFE, mit und ohne aktive Kriegsteilnahme. Fazit: Vergebung ist für die Patientinnen und Patienten in Kroatien weiterhin ein aktuelles, nicht abgeschlossenes Thema. Es erfordert interdisziplinäre Forschung und Arbeit im Sinne der Förderung eines dauerhaften Friedens, nicht nur in Kroatien oder auf dem Balkan, sondern europa- und weltweit, auch im Blick auf neue kriegerische Auseinandersetzungen.\\n4207 Even 27 years after the war in Croatia, the process of forgiveness and reconciliation between the warring parties is not completed. The aim of this study was to investigate the forgiveness needs of psychiatric patients in Croatia., Method: Anonym survey with standardized questionnaires among 200 patients with trauma sequelae and other mental disorders treated in the General Hospital and Veterinary Hospital in Vukovar., Results: For a large number of patients, the needs to forgive someone and to be forgiven play an important role. There were significant differences in the strength of these needs between the patient groups: with or without PTSD, with or without active participation in the war., Conclusion: Forgiveness is still a relevant topic and an unfinished issue for psychiatric patients in Croatia today. It requires interdisciplinary research and work in the sense of promoting lasting peace, not only in Croatia and the Balkans, but in Europe and worldwide, especially in view of new armed conflicts.",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "321-331",
				"publicationTitle": "Spiritual Care",
				"shortTitle": "Psychiatrische Patientinnen und Patienten in Vukovar (Kroatien) und ihre Bedürfnisse nach Vergebung",
				"url": "https://www.degruyter.com/document/doi/10.1515/spircare-2022-0057/html",
				"volume": "11",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Balkan war"
					},
					{
						"tag": "Balkan-Krieg"
					},
					{
						"tag": "Forgiveness"
					},
					{
						"tag": "ICD-10 F43.1"
					},
					{
						"tag": "ICD-10 F62.0"
					},
					{
						"tag": "ICD-10 F62.0 and other psychiatric\ndisorders"
					},
					{
						"tag": "PTBS"
					},
					{
						"tag": "PTSD"
					},
					{
						"tag": "Vergebung"
					},
					{
						"tag": "Versöhnung"
					},
					{
						"tag": "Vukovar"
					},
					{
						"tag": "reconciliation"
					},
					{
						"tag": "und andere psychische Erkrankungen"
					}
				],
				"notes": [
					{
						"note": "Arndt Büssing   | orcid:0000-0002-5025-7950 | taken from website"
					},
					{
						"note": "Klaus Baumann  | orcid:0000-0002-7998-0763 | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.14315/evth-2023-830306/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Was kann die Bibel zur aktuellen Schöpfungsethik beitragen?: Das Neue Testament im Kontext neuerer öko-hermeneutischer Ansätze der Schriftinterpretation",
				"creators": [
					{
						"firstName": "Mirjam",
						"lastName": "Jekel",
						"creatorType": "author"
					},
					{
						"firstName": "Zacharias",
						"lastName": "Shoukry",
						"creatorType": "author"
					},
					{
						"firstName": "Ruben",
						"lastName": "Zimmermann",
						"creatorType": "author"
					}
				],
				"date": "2023/05/01",
				"DOI": "10.14315/evth-2023-830306",
				"ISSN": "2198-0470",
				"abstractNote": "Article Was kann die Bibel zur aktuellen Schöpfungsethik beitragen? was published on May 1, 2023 in the journal Evangelische Theologie (volume 83, issue 3).",
				"issue": "3",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "194-210",
				"publicationTitle": "Evangelische Theologie",
				"shortTitle": "Was kann die Bibel zur aktuellen Schöpfungsethik beitragen?",
				"url": "https://www.degruyter.com/document/doi/10.14315/evth-2023-830306/html",
				"volume": "83",
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
		"url": "https://www.degruyter.com/document/doi/10.14315/evth-2023-830303/html",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zu diesem Heft",
				"creators": [
					{
						"firstName": "Bernd",
						"lastName": "Oberdorfer",
						"creatorType": "author"
					}
				],
				"date": "2023/05/01",
				"DOI": "10.14315/evth-2023-830303",
				"ISSN": "2198-0470",
				"issue": "3",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "163",
				"publicationTitle": "Evangelische Theologie",
				"url": "https://www.degruyter.com/document/doi/10.14315/evth-2023-830303/html",
				"volume": "83",
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
