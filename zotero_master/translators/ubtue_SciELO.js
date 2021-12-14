{
	"translatorID": "3eabecf9-663a-4774-a3e6-0790d2732eed",
	"label": "ubtue_SciELO",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?(socialscience\\.|proceedings\\.|biodiversidade\\.|caribbean\\.|comciencia\\.|inovacao\\.|search\\.)?(scielo|scielosp)\\.",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-14 12:59:13"
}

/*
	Translator
   Copyright (C) 2013 Sebastian Karcher

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
*/

function getTitle(item) {
	if (item.DOI) {
		if (item.DOI.split('/').length > 1) {
			pid = item.DOI.split('/')[1];
		ZU.doGet('https://www.scielo.cl/scielo.php?download&format=RefMan&pid=' + pid,
		function (text) {
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, i) {
				if (i.title != undefined && i.title != item.title) {
					item.notes.push("Paralleltitel:" + ZU.trimInternal(item.title));
					item.title = ZU.trimInternal(i.title);
				}
			item.complete();
				
			});
			translator.translate(); 
		});
	}
	}
}

function detectWeb(doc,url) {
	if (ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content')) {
		return "journalArticle";
	}
	else if (url.indexOf("search.")!=-1 && getSearchResults(doc, true)){
		return "multiple";
	}
	else if (url.indexOf("script=sci_issuetoc")!=-1 && getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "results")]//div[contains(@class, "line")]/a[strong[contains(@class, "title")]]');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	if (rows.length == 0) {
		//http://www.scielo.cl/scielo.php?script=sci_arttext&amp;
		let tds = ZU.xpath(doc, '//td//td');
		for (let t = 0; t < tds.length; t++) {
			let rows = ZU.xpath(tds[t], './/a[contains(@href, "http://www.scielo.cl/scielo.php?script=sci_arttext")]');
			for (let i = 0; i < rows.length; i++) {
				if (items[rows[i].href] == undefined) {
				items[rows[i].href] = ZU.trimInternal(ZU.xpathText(tds[t], './/B'));
				if (checkOnly) return true;
				found = true;
				}
			}
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
	let abstract = ZU.xpathText(doc, '//div[@class="abstract"]/p[@class="sec"]/following-sibling::p[1]');
	let transAbstract = ZU.xpathText(doc, '//div[@class="trans-abstract"]/p[@class="sec"]/following-sibling::p[1]');
	// different xpath for abstractTwo
	let abstractTwo = ZU.xpathText(doc, "//*[contains(text(),'Resumen')]//following::font[1]");//Z.debug('abstractTwo' + abstractTwo)
	let transAbstractTwo = ZU.xpathText(doc, "//*[contains(text(),'Abstract')]//following::font[1]");//Z.debug('transAbstractTwo' + transAbstractTwo)
	let translator = Zotero.loadTranslator('web');
	//use Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler('itemDone', function(obj, item) {
	
	if (item.language == undefined) {
		item.language = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@language');
		//meta xmlns="" name="citation_pdf_url" language="en"
	}
	if (abstract != null && abstract || transAbstract) {
		item.abstractNote = abstract.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, "").replace(/[\n\t]/g, "");
		item.notes.push({note: "abs:" + ZU.trimInternal(transAbstract.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, ""))});
	}
	if (abstractTwo != null && abstractTwo) {
		item.abstractNote = abstractTwo.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, "").replace(/[\n\t]/g, "");
		item.notes.push({note: "abs:" + ZU.trimInternal(transAbstractTwo.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, ""))});
	}
	if (item.abstractNote != undefined) {
	item.abstractNote = ZU.trimInternal(item.abstractNote);
	}
	
	let keywords = ZU.xpath(doc, '//*[contains(text(), "Keywords:")  or contains(text(), "Keywords") or contains(text(), "Key words") or contains(text(), "Key Words") or contains(text(), "Kew words")]/..');
	if (keywords && keywords.length > 0) {
		item.tags = keywords[0].textContent
					.trim()
					.replace(/\n/g, "")
					.replace(/ke[y|w]\s?words\s*:\s*/ig, "")
					.replace(/\.$/, "")
					.split(/;|,/)
					.map(function(x) { return x.trim(); })
					.map(function(y) { return y.charAt(0).toUpperCase() + y.slice(1); });
	}
	//keywords in other language
	let transKeywords = ZU.xpathText(doc, '//*[contains(text(),"Palabra claves") or contains(text(), "Palabras clave")]//..');
	if (transKeywords) {
		for (let t of transKeywords.split(/;|,/)) {
			item.tags.push(t
				.trim()
				.replace(/\.$/, "")
				.replace(/\.$|palabras?\s?claves?\s*:?\s*/i, "")
				.replace(/^\w/gi,function(m){ return m.toUpperCase();})
			);
		}
	}
	
	//duduplicate all keywords
	item.tags = [...new Set(item.tags.map(x => x))];
	
	let citationVolume = ZU.xpathText(doc, '//meta[@name="citation_volume"]/@content');
	if (item.ISSN == "0718-9273" && citationVolume.length == 0) {
		item.volume = item.issue;
		delete item.issue;
	}
		item.libraryCatalog = "SciELO"
	if (item.ISSN == "0718-9273") {
			getTitle(item);
		}
	if (item.pages && item.pages.match(/^0/)) {
		item.pages = item.pages.replace(/^0/, '');
	}
	else item.complete();
	});
	translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Impressões sobre o teste rápido para o HIV entre usuários de drogas injetáveis no Brasil",
				"creators": [
					{
						"firstName": "P. R.",
						"lastName": "Telles-Dias",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Westman",
						"creatorType": "author"
					},
					{
						"firstName": "A. E.",
						"lastName": "Fernandez",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Sanchez",
						"creatorType": "author"
					}
				],
				"date": "2007-12",
				"DOI": "10.1590/S0034-89102007000900015",
				"ISSN": "0034-8910, 0034-8910, 1518-8787",
				"abstractNote": "OBJETIVO: Descrever as impressões, experiências, conhecimentos, crenças e a receptividade de usuários de drogas injetáveis para participar das estratégias de testagem rápida para HIV. MÉTODOS: Estudo qualitativo exploratório foi conduzido entre usuários de drogas injetáveis, de dezembro de 2003 a fevereiro de 2004, em cinco cidades brasileiras, localizadas em quatro regiões do País. Um roteiro de entrevista semi-estruturado contendo questões fechadas e abertas foi usado para avaliar percepções desses usuários sobre procedimentos e formas alternativas de acesso e testagem. Foram realizadas 106 entrevistas, aproximadamente 26 por região. RESULTADOS: Características da população estudada, opiniões sobre o teste rápido e preferências por usar amostras de sangue ou saliva foram apresentadas junto com as vantagens e desvantagens associadas a cada opção. Os resultados mostraram a viabilidade do uso de testes rápidos entre usuários de drogas injetáveis e o interesse deles quanto à utilização destes métodos, especialmente se puderem ser equacionadas questões relacionadas à confidencialidade e confiabilidade dos testes. CONCLUSÕES: Os resultados indicam que os testes rápidos para HIV seriam bem recebidos por essa população. Esses testes podem ser considerados uma ferramenta valiosa, ao permitir que mais usuários de drogas injetáveis conheçam sua sorologia para o HIV e possam ser referidos para tratamento, como subsidiar a melhoria das estratégias de testagem entre usuários de drogas injetáveis.",
				"journalAbbreviation": "Rev. Saúde Pública",
				"language": "pt",
				"libraryCatalog": "SciELO",
				"pages": "94-100",
				"publicationTitle": "Revista de Saúde Pública",
				"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/",
				"volume": "41",
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
						"tag": "Abuso de substâncias por via intravenosa"
					},
					{
						"tag": "Brasil"
					},
					{
						"tag": "Pesquisa qualitativa"
					},
					{
						"tag": "Serviços de diagnóstico"
					},
					{
						"tag": "Sorodiagnóstico da Aids"
					},
					{
						"tag": "Síndrome de imunodeficiência adquirida"
					},
					{
						"tag": "Técnicas de diagnóstico e procedimentos"
					},
					{
						"tag": "Vulnerabilidade em saúde"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.br/j/op/a/JNgwxBLSnHQnSJbzhkRbCBq/?lang=pt",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Como se escolhe um candidato a Presidente?: Regras e práticas nos partidos políticos da América Latina",
				"creators": [
					{
						"firstName": "Flavia",
						"lastName": "Freidenberg",
						"creatorType": "author"
					},
					{
						"firstName": "Francisco",
						"lastName": "Sánchez López",
						"creatorType": "author"
					}
				],
				"date": "2002-10",
				"DOI": "10.1590/S0104-62762002000200002",
				"ISSN": "0104-6276, 1807-0191",
				"abstractNote": "Este trabalho examina a maneira como os partidos políticos da América Latina selecionam seus candidatos às eleições presidenciais. A análise está baseada no estudo de 44 partidos de 16 países da América Latina, e mostra que apesar da crescente tendência para o emprego de processos mais inclusivos na seleção dos candidatos nas últimas décadas, predomina a centralização do processo de tomada de decisões dos partidos da região. O material empírico provém da pesquisa sobre Partidos Políticos e Governabilidade na América Latina da Universidad de Salamanca.",
				"journalAbbreviation": "Opin. Publica",
				"language": "pt",
				"libraryCatalog": "SciELO",
				"pages": "158-188",
				"publicationTitle": "Opinião Pública",
				"shortTitle": "Como se escolhe um candidato a Presidente?",
				"url": "http://www.scielo.br/j/op/a/JNgwxBLSnHQnSJbzhkRbCBq/?lang=pt",
				"volume": "8",
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
						"tag": "Internal elections"
					},
					{
						"tag": "Latin America"
					},
					{
						"tag": "Nomination of candidates"
					},
					{
						"tag": "Political parties"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://search.scielo.org/?q=&lang=pt&count=15&from=0&output=site&sort=&format=summary&fb=&page=1&q=zotero&lang=pt&page=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.scielo.br/j/rbfis/a/69tz8bYzpn36wcdTNSGWKyj/?lang=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Analysis of the user satisfaction level in a public physical therapy service",
				"creators": [
					{
						"firstName": "Renato S.",
						"lastName": "Almeida",
						"creatorType": "author"
					},
					{
						"firstName": "Leandro A. C.",
						"lastName": "Nogueira",
						"creatorType": "author"
					},
					{
						"firstName": "Stéphane",
						"lastName": "Bourliataux-Lajoine",
						"creatorType": "author"
					}
				],
				"date": "2013-08-01",
				"DOI": "10.1590/S1413-35552013005000097",
				"ISSN": "1413-3555, 1809-9246",
				"abstractNote": "BACKGROUND: The concepts of quality management have increasingly been introduced into the health sector. Methods to measure satisfaction and quality are examples of this trend. OBJECTIVE: This study aimed to identify the level of customer satisfaction in a physical therapy department involved in the public area and to analyze the key variables that impact the usersâ€(tm) perceived quality. METHOD: A cross-sectional observational study was conducted, and 95 patients from the physical therapy department of the Hospital Universitário Gaffrée e Guinle - Universidade Federal do Estado do Rio de Janeiro (HUGG/UNIRIO) - Rio de Janeiro, Brazil, were evaluated by the SERVQUAL questionnaire. A brief questionnaire to identify the sociocultural profile of the patients was also performed. RESULTS: Patients from this health service presented a satisfied status with the treatment, and the population final average value in the questionnaire was 0.057 (a positive value indicates satisfaction). There was an influence of the educational level on the satisfaction status (χ‡Â²=17,149; p=0.002). A correlation was found between satisfaction and the dimensions of tangibility (rho=0.56, p=0.05) and empathy (rho=0.46, p=0.01) for the Unsatisfied group. Among the Satisfied group, the dimension that was correlated with the final value of the SERVQUAL was responsiveness (rho=0.44, p=0.01). CONCLUSIONS: The final values of the GGUH physical therapy department showed that patients can be satisfied even in a public health service. Satisfaction measures must have a multidimensional approach, and we found that people with more years of study showed lower values of satisfaction.",
				"journalAbbreviation": "Braz. J. Phys. Ther.",
				"language": "en",
				"libraryCatalog": "SciELO",
				"pages": "328-335",
				"publicationTitle": "Brazilian Journal of Physical Therapy",
				"url": "http://www.scielo.br/j/rbfis/a/69tz8bYzpn36wcdTNSGWKyj/?lang=en",
				"volume": "17",
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
						"tag": "health management"
					},
					{
						"tag": "physical therapy"
					},
					{
						"tag": "user satisfaction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scielo.conicyt.cl/scielo.php?script=sci_arttext&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Re-pensar el ex opere operato II: Per signa sensibilia significantur (SC 7). Quid enim?",
				"creators": [
					{
						"firstName": "Gonzalo",
						"lastName": "Guzmán",
						"creatorType": "author"
					},
					{
						"firstName": "Gonzalo",
						"lastName": "Guzmán",
						"creatorType": "author"
					}
				],
				"date": "12/2019",
				"DOI": "10.4067/S0049-34492019000400457",
				"ISSN": "0049-3449",
				"abstractNote": "La aproximación antropológica de Sacrosanctum concilium a la sagrada liturgia exige adentrarse en el universo del lenguaje simbólico y su proceso semiótico. Este arroja una luz importante para re-pensar el ex opere operato desprendiéndose de una visión ontológica-estática para adentrarse en la dinámica de una acción re-presentada gracias a la acción del Espíritu Santo. La reflexión semiótica del siglo pasado, especialmente en los autores estadounidenses Charles Peirce y Charles Morris, ayuda seriamente para comprender cómo los ritus et preces de la celebración litúrgica son un lugar teológico de la acción del Espíritu que posibilita el encuentro de lo humano y lo divino.",
				"issue": "4",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "457-474",
				"publicationTitle": "Teología y vida",
				"shortTitle": "Re-pensar el ex opere operato II",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=en",
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
				"tags": [
					{
						"tag": "Ex opere operato"
					},
					{
						"tag": "Lenguaje simbólico"
					},
					{
						"tag": "Liturgia"
					},
					{
						"tag": "Liturgy"
					},
					{
						"tag": "Performative"
					},
					{
						"tag": "Performativo"
					},
					{
						"tag": "Ritualidad"
					},
					{
						"tag": "Rituality"
					},
					{
						"tag": "Sacramentos"
					},
					{
						"tag": "Sacraments"
					},
					{
						"tag": "Semiotics"
					},
					{
						"tag": "Semiótica"
					},
					{
						"tag": "Symbolic language"
					}
				],
				"notes": [
					{
						"note": "abs:The anthropological approach of Sacrosanctum concilium to the sacred liturgy requires entering into the universe of symbolic language and its semiotic process. It casts an important light to re-think the ex opere operato, detaching itself from an ontological-static vision to enter into the dynamics of an action re-presented thanks to the action of the Holy Spirit. The semiotic reflection of the last century, especially in American authors Charles Peirce and Charles Morris, helps seriously to understand how the ritus et preces of the liturgical celebration are a theological place of the action of the Spirit that makes possible the encounter of the human and the divine."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_arttext&pid=S0718-92732016000100006&lng=en&nrm=iso&tlng=es",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Metaphysical presuppositions for a sound critical historiography applied to the biblical text",
				"creators": [
					{
						"firstName": "Carlos",
						"lastName": "Casanova",
						"creatorType": "author"
					}
				],
				"date": "03/2016",
				"DOI": "10.4067/S0718-92732016000100006",
				"ISSN": "0718-9273",
				"abstractNote": "Trata sobre los presupuestos metafísicos de aceptar la Biblia como Palabra de Dios. En particular, trata sobre la posibilidad de las intervenciones divinas, de los milagros y profecías. Responde al argumento de Hobbes por el determinismo, al principio de la clausura causal del mundo, a la crítica de Hume a la posibilidad de probar un milagro y a la negación de las profecías.",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "117-143",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100006&lng=en&nrm=iso&tlng=es",
				"volume": "34",
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
						"tag": "Biblia"
					},
					{
						"tag": "Historicidad del Nuevo Testamento"
					},
					{
						"tag": "Intervenciones divinas"
					},
					{
						"tag": "Milagros"
					},
					{
						"tag": "Profecías"
					}
				],
				"notes": [
					{
						"note": "abs:This paper deals with the metaphysical presuppositions which underlie the acceptance of the Bible as the Word of God. In particular, it deals with the possibility of divine interventions, miracles and prophecies. It answers to the Hobbesian argument for determinism, to the principle of the causal closure of the world, to Hume’s criticism of the possibility to prove miracles and to the negation of prophecies."
					},
					"Paralleltitel:Metaphysical presuppositions for a sound critical historiography applied to the biblical text"
				],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Presupuestos metafísicos de una sana historiografía crítica aplicada al texto bíblico",
				"creators": [
					{
						"firstName": "Carlos",
						"lastName": "Casanova",
						"creatorType": "author"
					}
				],
				"date": "03/2016",
				"DOI": "10.4067/S0718-92732016000100006",
				"ISSN": "0718-9273",
				"abstractNote": "Trata sobre los presupuestos metafísicos de aceptar la Biblia como Palabra de Dios. En particular, trata sobre la posibilidad de las intervenciones divinas, de los milagros y profecías. Responde al argumento de Hobbes por el determinismo, al principio de la clausura causal del mundo, a la crítica de Hume a la posibilidad de probar un milagro y a la negación de las profecías.",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "117-143",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100006&lng=en&nrm=iso&tlng=es",
				"volume": "34",
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
						"tag": "Biblia"
					},
					{
						"tag": "Historicidad del Nuevo Testamento"
					},
					{
						"tag": "Intervenciones divinas"
					},
					{
						"tag": "Milagros"
					},
					{
						"tag": "Profecías"
					}
				],
				"notes": [
					{
						"note": "abs:This paper deals with the metaphysical presuppositions which underlie the acceptance of the Bible as the Word of God. In particular, it deals with the possibility of divine interventions, miracles and prophecies. It answers to the Hobbesian argument for determinism, to the principle of the causal closure of the world, to Hume’s criticism of the possibility to prove miracles and to the negation of prophecies."
					},
					"Paralleltitel:Metaphysical presuppositions for a sound critical historiography applied to the biblical text"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_arttext&pid=S0718-92732018000100137&lng=en&nrm=iso&tlng=fr",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Three Capuchin missionaries in the Kingdom of Congo at the end of the 17th century: Cavazzi, Merolla and Zucchelli. Strength and prose in the stories of punitive spectacles and exemplary punishments",
				"creators": [
					{
						"firstName": "José",
						"lastName": "Sarzi Amade",
						"creatorType": "author"
					},
					{
						"firstName": "José",
						"lastName": "Sarzi Amade",
						"creatorType": "author"
					}
				],
				"date": "04/2018",
				"DOI": "10.4067/S0718-92732018000100137",
				"ISSN": "0718-9273",
				"abstractNote": "L’article traite de littérature de voyage et plus particuliérement de récits de missionnaires italiens de l’ordre des Capucins, ayant ceuvré à 1’évangélisation du Royaume du Congo vers la fin du XVIIe siécle. Giovanm Antonio Cavazzi da Montecuccolo, Girolamo Merolla da Sorrento et Antonio Zucchelli da Gradisca ont un point commun, celuí d’avoir reporté dans leurs livres respectifs, des mamfestations d’aprionsmes, de violences à l’encontre des us et coutumes congolais. L’étude en offre les détails littéraires traduisant ees répressions et leurs surgissements. Sur le fond, elle marque une distinction entre une narration découlant d’une violence réelle, celle de spectacles pumtifs, et une autre, imagologico-morale, expnmée en chátiments exemplaires.",
				"language": "fr",
				"libraryCatalog": "SciELO",
				"pages": "137-160",
				"publicationTitle": "Veritas",
				"shortTitle": "Three Capuchin missionaries in the Kingdom of Congo at the end of the 17th century",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732018000100137&lng=en&nrm=iso&tlng=fr",
				"volume": "39",
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
						"tag": "Capuchinos"
					},
					{
						"tag": "Capuchins"
					},
					{
						"tag": "Cavazzi"
					},
					{
						"tag": "Congo"
					},
					{
						"tag": "Merolla"
					},
					{
						"tag": "Misioneros"
					},
					{
						"tag": "Missionaries"
					},
					{
						"tag": "Zucchelli"
					}
				],
				"notes": [
					{
						"note": "abs:The objective of this research is to investigate about travel literature, particularly on the travel accounts written by the Capuchin missionaries Giovanni Antonio Cavazzi da Montecuccolo, Girolamo Merolla da Sorrento and Antonio Zucchelli da Gradisca, who participated in the Evangelization of the Kingdom of Congo in the late seventeenth century. Their texts are characterized by the recurrence to apriorisms and the use of violence toward Congolese traditions and customs. This study examines precisely the literary motifs that represents the above mentioned characteristics and, simultaneously, establishes the causes of their origin, through the distinction between narrative as a result of the real violence represented in the punitive spectacles and a imagological-moral violence, expressed through exemplary punishments., El artículo trata de literatura de viajes y más particularmente de historias de misioneros italianos de la orden de los Capuchinos, quienes trabajaron para la evangelización del Reino del Congo a fines del siglo XVII. Giovanni Antonio Cavazzi da Montecuccolo, Girolamo Merolla da Sorrento y Antonio Zucchelli da Gradisca tienen un punto en común, el de haber expresado en sus respectivos libros, manifestaciones de apriorismos y violencia contra las costumbres congoleñas. El estudio ofrece detalles literarios que reflejan estas represiones y sus emergencias. En lo sustancial, se establece una distinción entre una narración resultante de la violencia real, la de los espectáculos punitivos, y otra, imagológica-moral, expresada en castigos ejemplares."
					},
					"Paralleltitel:Three Capuchin missionaries in the Kingdom of Congo at the end of the 17th century: Cavazzi, Merolla and Zucchelli. Strength and prose in the stories of punitive spectacles and exemplary punishments"
				],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Trois missionnaires capucins dans le Royaume de Congo de la fin du XVIIe siècle: Cavazzi, Merolla et Zucchelli. Force et prose dans les récits de spectacles punitifs et de châtiments exemplaires",
				"creators": [
					{
						"firstName": "José",
						"lastName": "Sarzi Amade",
						"creatorType": "author"
					},
					{
						"firstName": "José",
						"lastName": "Sarzi Amade",
						"creatorType": "author"
					}
				],
				"date": "04/2018",
				"DOI": "10.4067/S0718-92732018000100137",
				"ISSN": "0718-9273",
				"abstractNote": "L’article traite de littérature de voyage et plus particuliérement de récits de missionnaires italiens de l’ordre des Capucins, ayant ceuvré à 1’évangélisation du Royaume du Congo vers la fin du XVIIe siécle. Giovanm Antonio Cavazzi da Montecuccolo, Girolamo Merolla da Sorrento et Antonio Zucchelli da Gradisca ont un point commun, celuí d’avoir reporté dans leurs livres respectifs, des mamfestations d’aprionsmes, de violences à l’encontre des us et coutumes congolais. L’étude en offre les détails littéraires traduisant ees répressions et leurs surgissements. Sur le fond, elle marque une distinction entre une narration découlant d’une violence réelle, celle de spectacles pumtifs, et une autre, imagologico-morale, expnmée en chátiments exemplaires.",
				"language": "fr",
				"libraryCatalog": "SciELO",
				"pages": "137-160",
				"publicationTitle": "Veritas",
				"shortTitle": "Three Capuchin missionaries in the Kingdom of Congo at the end of the 17th century",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732018000100137&lng=en&nrm=iso&tlng=fr",
				"volume": "39",
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
						"tag": "Capuchinos"
					},
					{
						"tag": "Capuchins"
					},
					{
						"tag": "Cavazzi"
					},
					{
						"tag": "Congo"
					},
					{
						"tag": "Merolla"
					},
					{
						"tag": "Misioneros"
					},
					{
						"tag": "Missionaries"
					},
					{
						"tag": "Zucchelli"
					}
				],
				"notes": [
					{
						"note": "abs:The objective of this research is to investigate about travel literature, particularly on the travel accounts written by the Capuchin missionaries Giovanni Antonio Cavazzi da Montecuccolo, Girolamo Merolla da Sorrento and Antonio Zucchelli da Gradisca, who participated in the Evangelization of the Kingdom of Congo in the late seventeenth century. Their texts are characterized by the recurrence to apriorisms and the use of violence toward Congolese traditions and customs. This study examines precisely the literary motifs that represents the above mentioned characteristics and, simultaneously, establishes the causes of their origin, through the distinction between narrative as a result of the real violence represented in the punitive spectacles and a imagological-moral violence, expressed through exemplary punishments., El artículo trata de literatura de viajes y más particularmente de historias de misioneros italianos de la orden de los Capuchinos, quienes trabajaron para la evangelización del Reino del Congo a fines del siglo XVII. Giovanni Antonio Cavazzi da Montecuccolo, Girolamo Merolla da Sorrento y Antonio Zucchelli da Gradisca tienen un punto en común, el de haber expresado en sus respectivos libros, manifestaciones de apriorismos y violencia contra las costumbres congoleñas. El estudio ofrece detalles literarios que reflejan estas represiones y sus emergencias. En lo sustancial, se establece una distinción entre una narración resultante de la violencia real, la de los espectáculos punitivos, y otra, imagológica-moral, expresada en castigos ejemplares."
					},
					"Paralleltitel:Three Capuchin missionaries in the Kingdom of Congo at the end of the 17th century: Cavazzi, Merolla and Zucchelli. Strength and prose in the stories of punitive spectacles and exemplary punishments"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_arttext&pid=S0718-92732020000300151&lng=en&nrm=iso&tlng=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La cultura de la paz y la tolerancia religiosa desde una perspectiva islámica",
				"creators": [
					{
						"firstName": "Abbas",
						"lastName": "Yazdani",
						"creatorType": "author"
					},
					{
						"firstName": "Abbas",
						"lastName": "Yazdani",
						"creatorType": "author"
					}
				],
				"date": "12/2020",
				"DOI": "10.4067/S0718-92732020000300151",
				"ISSN": "0718-9273",
				"abstractNote": "The subject of the culture of peace and non-violent communication is extremely important, even more so today than in the past. The contention of this paper is that Islam is a religion of tolerance, peace, and reconciliation. I shall argue that there are many principles of the culture of peace in Islam. However, this doctrine may be misunderstood in some Islamic societies due to the poor knowledge of Islamic teachings or wrong education. Therefore, we strongly need to have a true interpretation of religious teachings as well as a true approach to religious diversity to provide the culture of peace.",
				"language": "en",
				"libraryCatalog": "SciELO",
				"pages": "151-168",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732020000300151&lng=en&nrm=iso&tlng=en",
				"volume": "47",
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
						"tag": "Diversidad religiosa"
					},
					{
						"tag": "Enseñanzas religiosas"
					},
					{
						"tag": "Islam"
					},
					{
						"tag": "Paz"
					},
					{
						"tag": "Peace"
					},
					{
						"tag": "Religious diversity"
					},
					{
						"tag": "Religious teachings"
					},
					{
						"tag": "Violence"
					},
					{
						"tag": "Violencia"
					}
				],
				"notes": [
					{
						"note": "abs:El tema de la cultura de paz y la comunicación no violenta es sumamente importante, especialmente en la actualidad. El argumento de este artículo es que el Islam es una religión de tolerancia, paz y reconciliación. Argumentaré que hay muchos principios de la cultura de paz en el Islam. Sin embargo, esta doctrina puede malinterpretarse en algunas sociedades islámicas debido al escaso conocimiento de las enseñanzas islámicas o la educación incorrecta. Por lo tanto, necesitamos tener una verdadera interpretación de las enseñanzas religiosas, así como un verdadero enfoque de la diversidad religiosa para difundir la cultura de la paz."
					}
				],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "La cultura de la paz y la tolerancia religiosa desde una perspectiva islámica",
				"creators": [
					{
						"firstName": "Abbas",
						"lastName": "Yazdani",
						"creatorType": "author"
					},
					{
						"firstName": "Abbas",
						"lastName": "Yazdani",
						"creatorType": "author"
					}
				],
				"date": "12/2020",
				"DOI": "10.4067/S0718-92732020000300151",
				"ISSN": "0718-9273",
				"abstractNote": "The subject of the culture of peace and non-violent communication is extremely important, even more so today than in the past. The contention of this paper is that Islam is a religion of tolerance, peace, and reconciliation. I shall argue that there are many principles of the culture of peace in Islam. However, this doctrine may be misunderstood in some Islamic societies due to the poor knowledge of Islamic teachings or wrong education. Therefore, we strongly need to have a true interpretation of religious teachings as well as a true approach to religious diversity to provide the culture of peace.",
				"language": "en",
				"libraryCatalog": "SciELO",
				"pages": "151-168",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732020000300151&lng=en&nrm=iso&tlng=en",
				"volume": "47",
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
						"tag": "Diversidad religiosa"
					},
					{
						"tag": "Enseñanzas religiosas"
					},
					{
						"tag": "Islam"
					},
					{
						"tag": "Paz"
					},
					{
						"tag": "Peace"
					},
					{
						"tag": "Religious diversity"
					},
					{
						"tag": "Religious teachings"
					},
					{
						"tag": "Violence"
					},
					{
						"tag": "Violencia"
					}
				],
				"notes": [
					{
						"note": "abs:El tema de la cultura de paz y la comunicación no violenta es sumamente importante, especialmente en la actualidad. El argumento de este artículo es que el Islam es una religión de tolerancia, paz y reconciliación. Argumentaré que hay muchos principios de la cultura de paz en el Islam. Sin embargo, esta doctrina puede malinterpretarse en algunas sociedades islámicas debido al escaso conocimiento de las enseñanzas islámicas o la educación incorrecta. Por lo tanto, necesitamos tener una verdadera interpretación de las enseñanzas religiosas, así como un verdadero enfoque de la diversidad religiosa para difundir la cultura de la paz."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_arttext&pid=S0718-92732016000100002&lng=en&nrm=iso&tlng=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The historical memory in the process of pastoral support to displaced persons",
				"creators": [
					{
						"firstName": "Olga Consuelo",
						"lastName": "Vélez",
						"creatorType": "author"
					},
					{
						"firstName": "Ángela María",
						"lastName": "Sierra",
						"creatorType": "author"
					},
					{
						"firstName": "Oar",
						"lastName": "Rodríguez",
						"creatorType": "author"
					},
					{
						"firstName": "Susana",
						"lastName": "Becerra",
						"creatorType": "author"
					}
				],
				"date": "03/2016",
				"DOI": "10.4067/S0718-92732016000100002",
				"ISSN": "0718-9273",
				"abstractNote": "En los procesos sociopolíticos de superación de los conflictos armados, la recuperación de la Memoria histórica está ocupando un lugar central debido al papel que está juega para una efectiva reconciliación donde la verdad, la reparación y el perdón forman parte de ese proceso. La experiencia cristiana, como comunidad de memoria tiene mucho que aportar en la medida que articule la reflexión crítica sobre qué memoria, desde dónde, desde quiénes; con el potencial liberador del Dios que se pone del lado de las víctimas y desde ellas no deja que se olvide su dolor sino que busca transformarlo. Además incorporar la perspectiva de género, permite reconocer las diferencias genéricas que influyen en la recuperación de la memoria histórica. Mostrar la relevancia de estas articulaciones, es el propósito de este artículo con la invitación a transformar la pastoral urbana que pretende acompañar a las personas en situación de desplazamiento.",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "33-60",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100002&lng=en&nrm=iso&tlng=en",
				"volume": "34",
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
						"tag": "Desplazamiento"
					},
					{
						"tag": "Displacement"
					},
					{
						"tag": "Gender"
					},
					{
						"tag": "Género"
					},
					{
						"tag": "Memoria"
					},
					{
						"tag": "Memory"
					},
					{
						"tag": "Pastoral urbana"
					},
					{
						"tag": "Urban pastoral"
					},
					{
						"tag": "Victims"
					},
					{
						"tag": "Víctimas"
					}
				],
				"notes": [
					{
						"note": "abs:In socio-political processes of overcoming armed conflict, the Historical Memory is taking a central point because of the role it plays for effective reconciliation where \"truth, reparation and forgiveness\" are part of that process. Christian experience, as memory community has much to contribute to articulate the critical reflection about what memory, from where, from whom; with the liberating potential of the God who takes the side of the victims and doesn’t allow to forget them neither their pain and seeks transformation. Besides, incorporate the gender perspective, allow to recognize the gender differences and their influences in the recovery of historical memory. Show the relevance of these articulations is the purpose of this article with an invitation to transform urban pastoral in order to support displaced people."
					},
					"Paralleltitel:The historical memory in the process of pastoral support to displaced persons"
				],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "La memoria histórica en los procesos de acompañamiento pastoral a personas en situación de desplazamiento",
				"creators": [
					{
						"firstName": "Olga Consuelo",
						"lastName": "Vélez",
						"creatorType": "author"
					},
					{
						"firstName": "Ángela María",
						"lastName": "Sierra",
						"creatorType": "author"
					},
					{
						"firstName": "Oar",
						"lastName": "Rodríguez",
						"creatorType": "author"
					},
					{
						"firstName": "Susana",
						"lastName": "Becerra",
						"creatorType": "author"
					}
				],
				"date": "03/2016",
				"DOI": "10.4067/S0718-92732016000100002",
				"ISSN": "0718-9273",
				"abstractNote": "En los procesos sociopolíticos de superación de los conflictos armados, la recuperación de la Memoria histórica está ocupando un lugar central debido al papel que está juega para una efectiva reconciliación donde la verdad, la reparación y el perdón forman parte de ese proceso. La experiencia cristiana, como comunidad de memoria tiene mucho que aportar en la medida que articule la reflexión crítica sobre qué memoria, desde dónde, desde quiénes; con el potencial liberador del Dios que se pone del lado de las víctimas y desde ellas no deja que se olvide su dolor sino que busca transformarlo. Además incorporar la perspectiva de género, permite reconocer las diferencias genéricas que influyen en la recuperación de la memoria histórica. Mostrar la relevancia de estas articulaciones, es el propósito de este artículo con la invitación a transformar la pastoral urbana que pretende acompañar a las personas en situación de desplazamiento.",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "33-60",
				"publicationTitle": "Veritas",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100002&lng=en&nrm=iso&tlng=en",
				"volume": "34",
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
						"tag": "Desplazamiento"
					},
					{
						"tag": "Displacement"
					},
					{
						"tag": "Gender"
					},
					{
						"tag": "Género"
					},
					{
						"tag": "Memoria"
					},
					{
						"tag": "Memory"
					},
					{
						"tag": "Pastoral urbana"
					},
					{
						"tag": "Urban pastoral"
					},
					{
						"tag": "Victims"
					},
					{
						"tag": "Víctimas"
					}
				],
				"notes": [
					{
						"note": "abs:In socio-political processes of overcoming armed conflict, the Historical Memory is taking a central point because of the role it plays for effective reconciliation where \"truth, reparation and forgiveness\" are part of that process. Christian experience, as memory community has much to contribute to articulate the critical reflection about what memory, from where, from whom; with the liberating potential of the God who takes the side of the victims and doesn’t allow to forget them neither their pain and seeks transformation. Besides, incorporate the gender perspective, allow to recognize the gender differences and their influences in the recovery of historical memory. Show the relevance of these articulations is the purpose of this article with an invitation to transform urban pastoral in order to support displaced people."
					},
					"Paralleltitel:The historical memory in the process of pastoral support to displaced persons"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100001&lng=en&nrm=iso&tlng=es",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Entre la oscuridad y el silencio: ciegos y sordomudos en el mundo de la Biblia",
				"creators": [
					{
						"firstName": "Casas",
						"lastName": "Ramírez",
						"creatorType": "author"
					},
					{
						"firstName": "Juan",
						"lastName": "Alberto",
						"creatorType": "author"
					}
				],
				"date": "03/2016",
				"DOI": "10.4067/S0718-92732016000100001",
				"ISSN": "0718-9273",
				"language": "es",
				"libraryCatalog": "SciELO",
				"pages": "9-32",
				"publicationTitle": "Veritas",
				"shortTitle": "Entre la oscuridad y el silencio",
				"url": "http://www.scielo.cl/scielo.php?script=sci_abstract&pid=S0718-92732016000100001&lng=en&nrm=iso&tlng=es",
				"volume": "34",
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
						"tag": "Antropología bíblica"
					},
					{
						"tag": "Ceguera en la Biblia"
					},
					{
						"tag": "Discapacidad en la Biblia"
					},
					{
						"tag": "Enfermedad en la Biblia"
					},
					{
						"tag": "Sordera en la Biblia curación en la Biblia"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
