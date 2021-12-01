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
	"lastUpdated": "2021-12-01 13:55:38"
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
				if (i.title != item.title) {
					item.notes.push("Paralleltitel:" + item.title);
					item.title = i.title;
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
	if (url.indexOf("search.")!=-1 && getSearchResults(doc, true)){
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

	if (abstract || transAbstract) {
		item.abstractNote = abstract.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, "").replace(/[\n\t]/g, "");
		item.notes.push({note: "abs:" + transAbstract.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, "")});
	}
	if (abstractTwo || transAbstractTwo) {
		abstract = ZU.xpathText(doc, "//*[contains(text(),'Resumen')]//following::font[1]");
		item.abstractNote = abstract.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, "").replace(/[\n\t]/g, "");
		transAbstract = ZU.xpathText(doc, "//*[contains(text(),'Abstract')]//following::font[1]");
		item.notes.push({note: "abs:" + transAbstract.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, "")});
	} 
	
	let keywords = ZU.xpath(doc, '//b[contains(text(), "Keywords:") or contains(text(), "Keywords")]/.. | //*[contains(text(),"Key words")]//following::i');
	if (!keywords || keywords.length == 0) keywords = ZU.xpath(doc, '//strong[contains(text(), "Keywords:") or contains(text(), "Keywords")]/.. | /html/body/div[1]/div[2]/div[2]/p[5]');
	if (keywords && keywords.length > 0) {
		item.tags = keywords[0].textContent
					.trim()
					.replace(/\n/g, "")
					.replace(/keywords\s*:\s*/ig, "")
					.replace(/\.$/, "")
					.split(/;|,/)
					.map(function(x) { return x.trim(); })
					.map(function(y) { return y.charAt(0).toUpperCase() + y.slice(1); });
	}
	//keywords in other language
	let transKeywords = ZU.xpathText(doc, '//*[contains(text(),"Palabra claves")]//..');
	if (transKeywords) {
		for (let t of transKeywords.split(/;|,/)) {
			item.tags.push({tag : t
				.trim()
				.replace(/\.$|palabra\s?claves:/i, "")
				.replace(/^\w/gi,function(m){ return m.toUpperCase();})
			});
		}
	}
	//0718-9273 citation_issue = citation_volume
	let citationVolume = ZU.xpathText(doc, '//meta[@name="citation_volume"]/@content');
	if (item.ISSN == "0718-9273" && citationVolume.length == 0) {
		item.volume = item.issue;
		delete item.issue;
	}
		item.libraryCatalog = "SciELO"
		if (item.ISSN == "0718-9273") {
			getTitle(item);
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
						"tag": "Introdução"
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
						"tag": "Liturgy"
					},
					{
						"tag": "Performative"
					},
					{
						"tag": "Rituality"
					},
					{
						"tag": "Sacraments"
					},
					{
						"tag": "Semiotics"
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
						"tag": "Liturgy"
					},
					{
						"tag": "Performative"
					},
					{
						"tag": "Rituality"
					},
					{
						"tag": "Sacraments"
					},
					{
						"tag": "Semiotics"
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
						"tag": " Biblia"
					},
					{
						"tag": "Bible"
					},
					{
						"tag": "Divine interventions"
					},
					{
						"tag": "Historicidad del Nuevo Testamento"
					},
					{
						"tag": "Historicity of the New Testament"
					},
					{
						"tag": "Intervenciones divinas"
					},
					{
						"tag": "Milagros"
					},
					{
						"tag": "Miracles"
					},
					{
						"tag": "Profecías"
					},
					{
						"tag": "Prophecies"
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
	}
]
/** END TEST CASES **/
