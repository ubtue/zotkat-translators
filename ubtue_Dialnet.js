{
	"translatorID": "30617d79-1aad-44d5-adf1-b30fa52b6a54",
	"label": "ubtue_Dialnet",
	"creator": "Philipp Zumstein",
	"target": "^https?://dialnet\\.unirioja\\.es/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-02 14:01:59"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2016 Philipp Zumstein
	
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
	if (url.indexOf('/servlet/articulo')>-1) {
		return "journalArticle";
	} else if (url.indexOf('/servlet/libro')>-1) {
		return "book";
	} else if (url.indexOf('/servlet/tesis')>-1) {
		return "thesis";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//p/span[@class="titulo"]/a');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		if (!href.includes('libro')) {
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
		}

	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setHandler('itemDone', function (obj, item) {
		item.url = url;
		// Delete generic abstract as "Información del artículo <title>"
		if (item.abstractNote && item.abstractNote.includes(item.title) && item.abstractNote.length<item.title.length+30 || item.abstractNote.match(/Autoría|Localización/)) {
			delete item.abstractNote;
		}
		// scrape abstract
		let abstrctEntry = ZU.xpathText(doc, '//*[(@id = "resumen")]//p');
		if (abstrctEntry) item.abstractNote = abstrctEntry;
		// in case of double issue e.g. "3-4" wrong issue number in Embedded Metadata e,g. "3" 
		// clean issue number in case of multiple download
		var issue = ZU.xpathText(doc, '//*[@id="informacion"]//a[contains(text(), "Nº.")]');
		if (issue) {
			// e.g. Vol. 89, Nº. 3-4, 2012 or  Vol. 65, Nº. 1-2 (Enero-Junio)
			var issueEntry = issue.split('Nº.')[1].split(',')[0];//Z.debug(issueEntry)
			item.issue = issueEntry.split('\(')[0];
		}
		// variable for other split seperator 'Fasc.''
		var multiIssue = ZU.xpathText(doc, '//*[@id="informacion"]//a[contains(text(), "Fasc.")]');//Z.debug(multiIssue)
 		if (multiIssue) {
 			item.issue = multiIssue.split('Fasc.')[1].split(',')[0];
 		}
 		// replace issue number with volume number for certain journals e.g. 'Analecta calasanctiana: publicación semestral religioso cultural y de investigación histórica' 
 		if (item.ISSN && item.ISSN.match(/0569-9789|1594-344/)) item.volume = issueEntry.split('\(')[0];
 		if (item.issue === item.volume) delete item.issue;
 		if (item.title.match(/ISBN/ig)) item.tags.push("RezensionstagPica");
		if (item.tags) {
			for (let t of item.tags) {
			if (t.includes('RezensionstagPica')) {
				item.tags = item.tags.slice(-1);
				}
			}
		}
		if (!item.tags.includes('RezensionstagPica')) delete item.tags;
		item.complete();
	});
	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/libro?codigo=293780",
		"items": [
			{
				"itemType": "book",
				"title": "Libres, buenos y justos como miembros de un mismo cuerpo: lecciones de teoría del derecho y de derecho natural",
				"creators": [
					{
						"firstName": "Julián Vara",
						"lastName": "Martín",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"ISBN": "9788430945450",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"publisher": "Tecnos",
				"shortTitle": "Libres, buenos y justos como miembros de un mismo cuerpo",
				"url": "https://dialnet.unirioja.es/servlet/libro?codigo=293780",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=3661304",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Juicios, discursos y acción política en grupos de jóvenes estudiantes universitarios de Bogotá",
				"creators": [
					{
						"firstName": "Martha Cecilia Lozano",
						"lastName": "Ardila",
						"creatorType": "author"
					},
					{
						"firstName": "Sara Victoria Alvarado",
						"lastName": "Salgado",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISSN": "1692-715X",
				"abstractNote": "En este artículo se presentan los resultados de la investigación llevada a cabo entre 2006 y 2009 sobre discursos y acción política en siete grupos de jóvenes estudiantes universitarios de Bogotá., Teórica, epistemológica y metodológicamente, se sustentó la investigación en los planteamientos de Hannah Arendt (2001a, 2001b), se complementaron con las comprensiones de Kohn (2005), Brunet (2007), Sánchez (2003), Greppi (2006) y Fraser (1997, 2008)., El trabajo se desarrolló desde cuatro categorías fundamentales: concepciones de política, ciudadanía;, condicionantes de la política, democracia y la ciudadanía; detonantes de la acción política del los colectivos de jóvenes y las formas de acción política de los jóvenes y las jóvenes. Se Concluye con la necesidad de una educación para la participación política y la reconfiguración ética en Colombia., This article presents the outcome of research conducted between 2006 and 2009 on speeches and policy action in seven groups of young university students in Bogotá., Theoretical, epistemological and methodological research was supported by the approach of Hannah Arendt (2001a, 2001b), were supplemented by the insights of Kohn (2005), Brunet (2007), Sánchez (2003), Rosenthal (2006) and Fraser (1997, 2008)., The research was developed from four main categories: conceptions of political citizenship; constraints of politics, democracy and citizenship; trigger political action by young people and forms of political action by young people. It concludes with the need for education for political participation and ethics in Colombia reconfiguration., Este artigo apresenta os resultados de uma pesquisa realizada entre 2006 e 2009, em discursos e ação política em sete grupos de jovens universitários em Bogotá., Teóricas, epistemológicas e metodológicas de pesquisa foi suportada pela abordagem de Hannah Arendt (2001a, 2001b), foram complementadas com as idéias de Kohn (2005), Brunet (2007), Sánchez (2003), Rosenthal (2006) e Fraser (1997, 2008)., O trabalho foi desenvolvido a partir de quatro categorias principais: as concepções de cidadania política;, restrições da política, da democracia e da cidadania; desencadear uma ação política por parte dos jovens e das formas de ação política dos jovens. Conclui-se com a necessidade de educação para a participação política e ética na reconfiguração da Colômbia.",
				"issue": "1",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "101-113",
				"publicationTitle": "Revista Latinoamericana de Ciencias Sociales, Niñez y Juventud",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=3661304",
				"volume": "9",
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
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/buscar/documentos?querysDismax.DOCUMENTAL_TODO=politica",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/ejemplar/381860",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=4251373",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Secularisation as a challenge for a contemporary order theology International Theological Symposium as part of the research project \"Transmission of Faith in social and Religious Transformation Processes\".",
				"creators": [
					{
						"firstName": "Ulrich",
						"lastName": "Engel",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISSN": "1123-5772",
				"issue": "3-4",
				"language": "mul",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "659-666",
				"publicationTitle": "Angelicum",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=4251373",
				"volume": "89",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/revista/10829/V/53",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7003450",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "El Estado actual del Ecumenismo en América Latina y El Caribe",
				"creators": [
					{
						"firstName": "Juan D. Escobar",
						"lastName": "Soriano",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISSN": "0210-2870",
				"issue": "165",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "7-19",
				"publicationTitle": "Diálogo ecuménico",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7003450",
				"volume": "53",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7567487",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Antropología filosófica de Karol Jósef Wojtyla",
				"creators": [
					{
						"firstName": "Vicente González",
						"lastName": "Radío",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "0573-2018",
				"issue": "1-2",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "11-34",
				"publicationTitle": "Compostellanum: revista de la Archidiócesis de Santiago de Compostela",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7567487",
				"volume": "65",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=6401889",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "El significado del término euaggelion en los comienzos del cristianismo",
				"creators": [
					{
						"firstName": "Santiago Guijarro",
						"lastName": "Oporto",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISSN": "0425-340X, 2792-260X",
				"issue": "1-3",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "123-143",
				"publicationTitle": "Estudio agustiniano",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=6401889",
				"volume": "52",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7133018",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La utilización de san Pablo en los In Epistulam Iohannus ad Parthos Tractatus de san Agustín (II)",
				"creators": [
					{
						"firstName": "Pío de Luis",
						"lastName": "Vizcaíno",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "0425-340X, 2792-260X",
				"issue": "1-2",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "109-140",
				"publicationTitle": "Estudio agustiniano",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7133018",
				"volume": "54",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7558938",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Calasanz y Nikolsburg",
				"creators": [
					{
						"firstName": "Miguel Angel",
						"lastName": "Asiain",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "0569-9789",
				"abstractNote": "El artículo es un estudio documentado sobre la fundación primera escolapia fuera de Italia, en Nikolsburg (ahora Mikulov, en la República Checa y en los años que contempla este estudio en Moravia. Fue pedida a San José de Calasanz por el Cardenal Francisco Dietrichstein (1570-1636), gobernador de Moravia, que había nacido en España por ser hijo del embajador moravo en Madrid. La fundación se llevó a cabo y fue mantenida por el Cardenal que siempre manifestó su agradecimiento a Calasanz., El estudio se centra solamente en los años de la fundación y primera consolidación (1631 a 1648). La fuentes documentales son básicamente los epistolarios calasancios ya publicados: Epistolario de Calasanz, dos Epistolarios de Cartas a él dirigidas y Epistolario de correspondencia entre escolapios durante la vida de Calasanz. Destacan los escolapios que fueron enviados y crearon la escuela, el internado y varias congregaciones asociativas para los escolares. La presencia escolapia acabó en 1884, al reclamar derechos propios sobre toda la obra los herederos del Cardenal",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "11-231",
				"publicationTitle": "Analecta calasanctiana: publicación semestral religioso cultural y de investigación histórica",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7558938",
				"volume": "123",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7558938",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Calasanz y Nikolsburg",
				"creators": [
					{
						"firstName": "Miguel Angel",
						"lastName": "Asiain",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "0569-9789",
				"abstractNote": "El artículo es un estudio documentado sobre la fundación primera escolapia fuera de Italia, en Nikolsburg (ahora Mikulov, en la República Checa y en los años que contempla este estudio en Moravia. Fue pedida a San José de Calasanz por el Cardenal Francisco Dietrichstein (1570-1636), gobernador de Moravia, que había nacido en España por ser hijo del embajador moravo en Madrid. La fundación se llevó a cabo y fue mantenida por el Cardenal que siempre manifestó su agradecimiento a Calasanz., El estudio se centra solamente en los años de la fundación y primera consolidación (1631 a 1648). La fuentes documentales son básicamente los epistolarios calasancios ya publicados: Epistolario de Calasanz, dos Epistolarios de Cartas a él dirigidas y Epistolario de correspondencia entre escolapios durante la vida de Calasanz. Destacan los escolapios que fueron enviados y crearon la escuela, el internado y varias congregaciones asociativas para los escolares. La presencia escolapia acabó en 1884, al reclamar derechos propios sobre toda la obra los herederos del Cardenal",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "11-231",
				"publicationTitle": "Analecta calasanctiana: publicación semestral religioso cultural y de investigación histórica",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7558938",
				"volume": "123",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=6584233",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Filosemitismo e ecumenismo in P. Giovanni Semeria",
				"creators": [
					{
						"firstName": "Antonio M.",
						"lastName": "Gentili",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISSN": "1594-3445",
				"language": "ita",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "37-70",
				"publicationTitle": "Barnabiti Studi: Rivista di ricerche storiche dei Chierici Regolari di S. Paolo",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=6584233",
				"volume": "34",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8109506",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Fernando Rivas Rebaque, \" San Ignacio de Antioquía. Obispo y Mártir \". Editorial Ciudad Nueva ( Colección Conocer el Siglo II, 1 ), Madrid 2020, ISBN: 978-84-462-8, 459 páginas, 33 euros",
				"creators": [
					{
						"firstName": "Juan Sanjurjo",
						"lastName": "Arias",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISSN": "0573-2018",
				"issue": "1-2",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "341-344",
				"publicationTitle": "Compostellanum: revista de la Archidiócesis de Santiago de Compostela",
				"shortTitle": "Fernando Rivas Rebaque, \" San Ignacio de Antioquía. Obispo y Mártir \". Editorial Ciudad Nueva ( Colección Conocer el Siglo II, 1 ), Madrid 2020, ISBN",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8109506",
				"volume": "66",
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
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8109499",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Andrea Riccardi, \" La chiesa brucia. Crisi e futuro del cristianesimo \", Laterza, Roma, 2021 ( ISBN 978.88-581-441-4 )",
				"creators": [
					{
						"firstName": "Francisco Javier Buide del",
						"lastName": "Real",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISSN": "0573-2018",
				"issue": "1-2",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "309-314",
				"publicationTitle": "Compostellanum: revista de la Archidiócesis de Santiago de Compostela",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8109499",
				"volume": "66",
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
	}
]
/** END TEST CASES **/
