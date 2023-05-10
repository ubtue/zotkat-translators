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
	"lastUpdated": "2023-05-10 15:22:56"
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
		// abstracts from DC
		let abstractNr = 0;
		let abstracts = doc.querySelectorAll('meta[name="DC.description"]');
		if (abstracts) {
			for (let abstract of abstracts) {
			if (abstractNr == 0) item.abstractNote = abstract.content;
			else item.notes.push('abs:' + abstract.content);
			abstractNr += 1;
			}
		}
		// in case of double issue e.g. "3-4" wrong issue number in Embedded Metadata e,g. "3" 
		// clean issue number in case of multiple download
		var issue = ZU.xpathText(doc, '//*[@name="DC.source"]//a[contains(text(), "Nº.")]');
		if (issue) {
			// e.g. Vol. 89, Nº. 3-4, 2012 or  Vol. 65, Nº. 1-2 (Enero-Junio)
			var issueEntry = issue.split('Nº.')[1].split(',')[0];Z.debug(issueEntry)
			if (issueEntry) item.issue = issueEntry.split('\(')[0];
		}
		// variable for other split seperator 'Fasc.''
		var multiIssue = ZU.xpathText(doc, '//*[@id="informacion"]//a[contains(text(), "Fasc.")]');
 		if (multiIssue) {
 			item.issue = multiIssue.split('Fasc.')[1].split(',')[0];
 		}
 		// replace issue number with volume number for certain journals e.g. 'Analecta calasanctiana: publicación semestral religioso cultural y de investigación histórica' 
 		let volumeEntry = ZU.xpathText(doc, '//meta[@name="DC.source"]/@content');Z.debug(volumeEntry)
		if (['Vol'].includes(volumeEntry) && item.ISSN && ['0569-9789', '0392-2855', '1594-3445', '1124-1225'].includes(item.ISSN)) {
			item.volume = volumeEntry.split('Vol.')[1].split(',')[0].trim();
		}
		// replace issue by the volume number
		if (['1124-1225', '1122-5661', '0039-3258', '0212-1964', '1888-346X'].includes(item.ISSN)) {
			item.volume = volumeEntry.split('Nº.')[1].split(',')[0].trim();
		}
		// replace issue by the volume number and scrape issue number e.g.  Studia monastica, ISSN 0039-3258, Nº. 64, 2, 2022, S. 491-504
		if (['0039-3258'].includes(item.ISSN)) {
			item.volume = volumeEntry.split('Nº.')[1].split(',')[0].trim();
			item.issue = volumeEntry.split('Nº.')[1].split(',')[1].split(',')[0].trim();
		}
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
		item.attachments = [];
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
		"detectedItemType": "book",
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
				"attachments": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=3661304",
		"detectedItemType": "journalArticle",
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
				"abstractNote": "This article presents the outcome of research conducted between 2006 and 2009 on speeches\nand policy action in seven groups of young university students in Bogotá.\nTheoretical, epistemological and methodological research was supported by the approach of Hannah Arendt\n(2001a, 2001b), were supplemented by the insights of Kohn (2005), Brunet (2007), Sánchez (2003), Rosenthal\n(2006) and Fraser (1997, 2008).\nThe research was developed from four main categories: conceptions of political citizenship; constraints of\npolitics, democracy and citizenship; trigger political action by young people and forms of political action by\nyoung people. It concludes with the need for education for political participation and ethics in Colombia\nreconfiguration.",
				"issue": "1",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "101-113",
				"publicationTitle": "Revista Latinoamericana de Ciencias Sociales, Niñez y Juventud",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=3661304",
				"volume": "9",
				"attachments": [],
				"notes": [
					"abs:En este artículo se presentan los resultados de la investigación llevada a cabo entre 2006 y\n2009 sobre discursos y acción política en siete grupos de jóvenes estudiantes universitarios de Bogotá.\nTeórica, epistemológica y metodológicamente, se sustentó la investigación en los planteamientos de Hannah\nArendt (2001a, 2001b), se complementaron con las comprensiones de Kohn (2005), Brunet (2007), Sánchez\n(2003), Greppi (2006) y Fraser (1997, 2008).\nEl trabajo se desarrolló desde cuatro categorías fundamentales: concepciones de política, ciudadanía;\ncondicionantes de la política, democracia y la ciudadanía; detonantes de la acción política del los colectivos de\njóvenes y las formas de acción política de los jóvenes y las jóvenes. Se Concluye con la necesidad de una educación\npara la participación política y la reconfiguración ética en Colombia.",
					"abs:Este artigo apresenta os resultados de uma pesquisa realizada entre 2006 e 2009, em discursos\ne ação política em sete grupos de jovens universitários em Bogotá.\nTeóricas, epistemológicas e metodológicas de pesquisa foi suportada pela abordagem de Hannah Arendt\n(2001a, 2001b), foram complementadas com as idéias de Kohn (2005), Brunet (2007), Sánchez (2003),\nRosenthal (2006) e Fraser (1997, 2008).\nO trabalho foi desenvolvido a partir de quatro categorias principais: as concepções de cidadania política;\nrestrições da política, da democracia e da cidadania; desencadear uma ação política por parte dos jovens e das\nformas de ação política dos jovens. Conclui-se com a necessidade de educação para a participação política e ética\nna reconfiguração da Colômbia."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/buscar/documentos?querysDismax.DOCUMENTAL_TODO=politica",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/ejemplar/381860",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7567487",
		"detectedItemType": "journalArticle",
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
				"issue": "1",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "11-34",
				"publicationTitle": "Compostellanum: revista de la Archidiócesis de Santiago de Compostela",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7567487",
				"volume": "65",
				"attachments": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7558938",
		"detectedItemType": "journalArticle",
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
				"abstractNote": "El artículo es un estudio documentado sobre la fundación primera escolapia \nfuera de Italia, en Nikolsburg (ahora Mikulov, en la República Checa y en los años que \ncontempla este estudio en Moravia. Fue pedida a San José de Calasanz por el Cardenal Francisco Dietrichstein (1570-1636), gobernador de Moravia, que había nacido en \nEspaña por ser hijo del embajador moravo en Madrid. La fundación se llevó a cabo y \nfue mantenida por el Cardenal que siempre manifestó su agradecimiento a Calasanz. \nEl estudio se centra solamente en los años de la fundación y primera consolidación \n(1631 a 1648). La fuentes documentales son básicamente los epistolarios calasancios \nya publicados: Epistolario de Calasanz, dos Epistolarios de Cartas a él dirigidas y Epistolario de correspondencia entre escolapios durante la vida de Calasanz. Destacan los \nescolapios que fueron enviados y crearon la escuela, el internado y varias congregaciones asociativas para los escolares. La presencia escolapia acabó en 1884, al reclamar \nderechos propios sobre toda la obra los herederos del Cardenal",
				"issue": "123",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "11-231",
				"publicationTitle": "Analecta calasanctiana: publicación semestral religioso cultural y de investigación histórica",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=7558938",
				"attachments": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8362911",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La Retorica del silenzio nelle Confessioni di Agostino di Ippona",
				"creators": [
					{
						"firstName": "Giorgio",
						"lastName": "Gilioli",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISSN": "0569-9789",
				"abstractNote": "There were three main tasks of classical rhetoric: to instruct, delight and move \nthe soul to action. In the Confessions it is noted that these are overcome by an unconventional use of the instruments of the ars in which the rhetor Augustine was a master, \nin order to pursue a further philosophical purpose: to say the ineffable. It is the use \nof a rhetorical word that is intended to be circular, tautochronous, oblique, poetic, \noracular and paradoxical in its silent eloquence. Through a philosophical reading of the \nrhetorical fi gures we intend to highlight the circularity and tautochrony of this word \nwhich claims to invoke, praise and know the unknowable, but which cannot ignore faith \nand the intelligence of what it believes in. \nThere are two ways in which these rhetorical tools are highlighted: fi rstly, through \ntheir obliquity, typical of a language that ceaselessly tries to overcome its limits, fi nding \na sort of new path to “say with art”, second Quintilian’s defi nition of a fi gure of speech. \nSubsequently, through his unusual silence, precisely of a saying that says nothing in its \nclaim to express the inexpressible and that, in this not saying, says more than if he had \nsaid a lot. It is therefore a rhetoric of silence, which does not accept not to say the unspeakable, pretending to overcome the limits imposed by a reductive discourse, which \ndenies any possibility of saying what is considered ineffable par excellence, the Supreme Being. . A rhetoric that is the desperate voice of Augustine’s soul, and that does \nnot give up, even at the cost of being reduced to saying through a mirror, in a confused \nway (1 Cor 13:12).Therefore, in this work, a philosophical study of the rhetorical techniques used by the bishop of Hipona develops, with particular attention to the fi gures \nof locution, used as a tool to overcome the anguish of a strictly apophatic language, \nso that the Christian mission could be realized of proclamation of the Incarnate Word.",
				"issue": "126",
				"language": "ita",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "475-497",
				"publicationTitle": "Analecta calasanctiana: publicación semestral religioso cultural y de investigación histórica",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8362911",
				"attachments": [],
				"notes": [
					"abs:La retórica clásica habla de tres tareas principales: instruir, deleitar y mover el \nalma a la acción. En las Confesiones de San Agustín se advierte un uso poco convencional de los instrumentos del “ars” para perseguir un propósito filosófico ulterior: \ndecir lo inefable. Uso de una palabra retórica que pretende ser circular, tautocrónica, \noblicua, poética, oracular y paradójica en su elocuencia silenciosa. A través de una lectura filosófica de las fi guras retóricas pretendemos resaltar la circularidad y tautocronía \nde esta palabra que pretende invocar, alabar y conocer lo incognoscible, pero que no \npuede ignorar la fe y la inteligencia de aquello en lo que cree. \nHay formas retóricas que destacan en la antigüedad: en primer lugar, la oblicuidad, propia de un lenguaje que intenta incesantemente superar sus límites, encontrando una suerte de camino nuevo para “decir con arte; segundo, una fi gura del \ndiscurso, según Quintiliano. A través de su insólito silencio, de un dicho que nada dice \npero que pretende expresar lo inexpresable y que, en este no decir, dice más que si \nhubiera dicho mucho. Es La retórica del silencio, que no acepta el no decir lo indecible \ny, por ello, pretende superar los límites impuestos por un discurso reductivo, que niega \nla posibilidad de decir lo que se considera inefable por excelencia, el Ser Supremo. \nUna retórica que es la voz desesperada del alma de Agustín, y que no se rinde, aun \nviéndose obligado a decir a través de un espejo, de manera confusa (1 Cor 13,12). El \nartículo es un estudio filosófico de las técnicas retóricas empleadas por el obispo de \nHipona, con especial atención a las fi guras de locución, utilizadas como herramienta \npara superar lo angosto de un lenguaje apofático, de modo que la misión cristiana de \nproclamación del Verbo Encarnado pueda ser realizada."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8715726",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La Passione di Mario e Marta (BHL 5543): edizione e lettura critica",
				"creators": [
					{
						"firstName": "Laura",
						"lastName": "Vangone",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "1124-1225",
				"language": "ita",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "35-80",
				"publicationTitle": "Hagiographica",
				"shortTitle": "La Passione di Mario e Marta (BHL 5543)",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8715726",
				"volume": "29",
				"attachments": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8398920",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Cry of the Earth … Cry of the Poor",
				"creators": [
					{
						"firstName": "Jaazeal",
						"lastName": "Jakosalem",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISSN": "1122-5661",
				"abstractNote": "Nuestro oikos es la Tierra. Pero este hogar, \nademás, es también la morada de la Divinidad. Por ello, el plan de este Dios que ha \nquerido habitar en su creación preveía que \ntodas las criaturas vivientes existan en armonía las unas con las otras. La realidad, \npor el contrario, muestra que dicho plan no \nse está cumpliendo. Para hacer frente a esta \nrealidad, el papa Francisco nos ofrece, en la \nLaudato Si’, pistas que propicien otra mirada a la creación, de forma que se construya \nuna comunidad creacional. Esta propuesta \nacarrea serias repercusiones antropológicas, \ncomo son la de presentar al ser humano en \ncomunión con el resto de las criaturas y la de \napuntalar una acción político-ética de la inclusión, y no de la exclusión, dada la correspondencia existente entre la devastación de \nla tierra y la inequidad de la familia humana.",
				"language": "eng",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "49-81",
				"publicationTitle": "Recollectio: annuarium historicum augustinianum",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8398920",
				"volume": "44",
				"attachments": [],
				"notes": [
					"abs:Our oikos is the earth. But this home is \nalso the abode of the Divinity. Thus, the \nplan of this God who wanted to dwell in \nhis creation foresaw that all living creatures exist in harmony with one another. \nThe reality, on the contrary, shows that \nsuch plan is not being fulfilled. In order \nto face this reality, Pope Francis offers \nus in the Laudato Si’, ways that promote \nanother way of looking at creation, that \nbuilds a creational community. This proposal has anthropological repercussions, \nlike presenting the human being in communion with the rest of the creatures \nand supporting a politico-ethical action \nof inclusion, and not of exclusion, given \nthe existing correspondence between the \ndevastation of the earth and the iniquity \nof human family"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8749356",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La novedad de la pedagogía de la fe",
				"creators": [
					{
						"firstName": "Miguel Ángel",
						"lastName": "Medina",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "0212-1964",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "41-70",
				"publicationTitle": "Teología y catequesis",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8749356",
				"volume": "154",
				"attachments": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8855888",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Espacio público y simbología religiosa en el estado español",
				"creators": [
					{
						"firstName": "Fernando",
						"lastName": "Amérigo",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "1888-346X",
				"language": "spa",
				"libraryCatalog": "dialnet.unirioja.es",
				"pages": "9-28",
				"publicationTitle": "Bandue: revista de la Sociedad Española de Ciencias de las Religiones",
				"url": "https://dialnet.unirioja.es/servlet/articulo?codigo=8855888",
				"volume": "14",
				"attachments": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
