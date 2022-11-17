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
	"lastUpdated": "2022-07-05 09:16:45"
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

function invokeEMTranslator(doc) {
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
		if (ZU.xpathText(doc, '//h2[@class="subtitle productSubtitleMainContent"]') != null) {
			if (ZU.xpathText(doc, '//h2[@class="subtitle productSubtitleMainContent"]') != "") {
				i.title += ': ' + ZU.xpathText(doc, '//h2[@class="subtitle productSubtitleMainContent"]');
			}
		} 
		if (i.abstractNote.match(pseudoabstract) || i.abstractNote.match(/^Der Artikel/)) delete i.abstractNote;
		for (let keyWord of ZU.xpath(doc, '//div[contains(@class, "keywords")]/a')) {
			if (!i.tags.includes(keyWord.textContent)) i.tags.push(keyWord.textContent);
		}
		for (let authorTag of ZU.xpath(doc, '//span[contains(@class, "metadataAndContributors")]')) {
			authorTag = authorTag.innerHTML.replace(/\n+|\s\s+/g, '');
			let orcidInfo = authorTag.match(/<span class="contributor".*?>([^<]+?)<\/span><span class="orcidLink"[^<]*?><a href="https:\/\/orcid.org\/(.+?)"/g);
			if (orcidInfo != null) {
				for (let singleOrcidInfo of orcidInfo) {
					singleOrcidInfo = singleOrcidInfo.match(/<span class="contributor".*?>([^<]+?)<\/span><span class="orcidLink"[^<]*?><a href="https:\/\/orcid.org\/(.+?)"/);
					let name = singleOrcidInfo[1];
					let orcid = singleOrcidInfo[2];
					i.notes.push({note: name + ' | orcid:' + orcid + ' | taken from website'});
				}
			}
		}
		if (!i.ISSN) i.ISSN = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "onlineissn", " " )) and contains(concat( " ", @class, " " ), concat( " ", "text-metadata-value", " " ))]');
		i.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.14315/arg-2019-1100103/html",
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
		"url": "https://www.degruyter.com/document/doi/10.14315/vf-2016-0206/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Überlappender Konsens? Neue Trends in der evangelischen Ethik",
				"creators": [
					{
						"firstName": "Klaas",
						"lastName": "Huizing",
						"creatorType": "author"
					}
				],
				"date": "2016/08/01",
				"DOI": "10.14315/vf-2016-0206",
				"ISSN": "2198-0454",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "www.degruyter.com",
				"pages": "127-134",
				"publicationTitle": "Verkündigung und Forschung",
				"shortTitle": "Überlappender Konsens?",
				"url": "https://www.degruyter.com/document/doi/10.14315/vf-2016-0206/html",
				"volume": "61",
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
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.14315/vf-2020-650205/html",
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
					},
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
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/nzsth-2022-0006/html",
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
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/spircare-2021-0066/html",
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
						"note": "Ruth Mächler | orcid:0000-0002-8029-9633 | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/abitech-2019-2004/html?lang=de",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Die Rolle der ORCID iD in der Wissenschaftskommunikation: Der Beitrag des ORCID-Deutschland-Konsortiums und das ORCID-DE-Projekt",
				"creators": [
					{
						"firstName": "Britta",
						"lastName": "Dreyer",
						"creatorType": "author"
					},
					{
						"firstName": "Stephanie",
						"lastName": "Hagemann-Wilholt",
						"creatorType": "author"
					},
					{
						"firstName": "Paul",
						"lastName": "Vierkant",
						"creatorType": "author"
					},
					{
						"firstName": "Dorothea",
						"lastName": "Strecker",
						"creatorType": "author"
					},
					{
						"firstName": "Stephanie",
						"lastName": "Glagla-Dietz",
						"creatorType": "author"
					},
					{
						"firstName": "Friedrich",
						"lastName": "Summann",
						"creatorType": "author"
					},
					{
						"firstName": "Heinz",
						"lastName": "Pampel",
						"creatorType": "author"
					},
					{
						"firstName": "Marleen",
						"lastName": "Burger",
						"creatorType": "author"
					}
				],
				"date": "2019/07/01",
				"DOI": "10.1515/abitech-2019-2004",
				"ISSN": "2191-4664",
				"abstractNote": "ORCID schafft mit Services wie der eindeutigen Verknüpfung von Forschenden und ihren Publikationen die Basis moderner Wissenschaftskommunikation. Das ORCID-Deutschland-Konsortium bietet eine kostenreduzierte ORCID-Premiummitgliedschaft an und unterstützt die Mitglieder bei der erfolgreichen ORCID-Integration. Diese umfasst neben einer Dialogplattform mit deutschsprachigen Informationsmaterialien weitere Supportleistungen. Ein wichtiger Erfolgsfaktor ist außerdem eine umfassende Kommunikationsstrategie der ORCID-Implementierung. Hier können die Mitglieder auf etablierte Kommunikationskanäle innerhalb ihrer Einrichtungen zurückgreifen. Gemeinsam leisten sie mit der Unterstützung des ORCID-DE-Projekts einen wesentlichen Beitrag zur erfolgreichen Verbreitung von ORCID in Deutschland.\\n4207 ORCID’s services such as the unambiguous linking of researchers and their research output form the basis of modern scholarly communication. The ORCID Germany Consortium offers a reduced ORCID premium membership fee and supports its members during ORCID integration. Services include a dialogue platform that provides German-language information and additional support services. Another major success factor is an all-encompassing communication strategy: members of the ORCID implementation can resort to established organizational communication channels. Together and with the support of the ORCID DE project they contribute significantly to the successful distribution of ORCID in Germany.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "112-121",
				"publicationTitle": "ABI Technik",
				"shortTitle": "Die Rolle der ORCID iD in der Wissenschaftskommunikation",
				"url": "https://www.degruyter.com/document/doi/10.1515/abitech-2019-2004/html?lang=de",
				"volume": "39",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Autorenidentifikation"
					},
					{
						"tag": "ORCID"
					},
					{
						"tag": "Persistent Identifier"
					},
					{
						"tag": "Persistenter Identifikator"
					},
					{
						"tag": "Researcher Identification"
					}
				],
				"notes": [
					"LF:",
					{
						"note": "Britta Dreyer | orcid:0000-0002-0687-5460 | taken from website"
					},
					{
						"note": "Stephanie Hagemann-Wilholt | orcid:0000-0002-0474-2410 | taken from website"
					},
					{
						"note": "Paul Vierkant | orcid:0000-0003-4448-3844 | taken from website"
					},
					{
						"note": "Dorothea Strecker | orcid:0000-0002-9754-3807 | taken from website"
					},
					{
						"note": "Stephanie Glagla-Dietz | orcid:0000-0001-8762-3005 | taken from website"
					},
					{
						"note": "Friedrich Summann | orcid:0000-0002-6297-3348 | taken from website"
					},
					{
						"note": "Heinz Pampel | orcid:0000-0003-3334-2771 | taken from website"
					},
					{
						"note": "Marleen Burger | orcid:0000-0001-6836-1193 | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/spircare-2021-0065/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hartmut Rosa über den Umgang mit Sterben, Tod und Trauer: Ein Gespräch mit dem Soziologen und Begründer der Resonanztheorie Prof. Dr. Hartmut Rosa, Friedrich-Schiller-Universität Jena",
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
						"note": "Heidi Müller</span> and <span class=\"contributor\" data-bs-toggle=\"tooltip\" data-placement=\"bottom\" title=\"Universitätsklinikum Gießen und Marburg, Standort Gießen Internistische Onkologie und Palliativmedizin Gießen Deutschland; daniel.berthold@innere.med.uni-giessen.de\">Daniel Berthold | orcid:0000-0001-9816-8650 | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
