{
	"translatorID": "58fd3287-b8e6-4b5d-8367-0ebbd4598991",
	"label": "ubtue_Cairn.info",
	"creator": "Timotheus Kim",
	"target": "https?://www.cairn(-int)?.info",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-07-07 10:53:23"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

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

	***** END LICENSE BLOCK *****
*/
function romanToInt(r) {
	if (r.match(/^[IVXLCM]+/)) {
	const sym = { 
		'I': 1,
		'V': 5,
		'X': 10,
		'L': 50,
		'C': 100,
		'D': 500,
		'M': 1000
	}
	let result = 0;
	for (i=0; i < r.length; i++){
		const cur = sym[r[i]];
		const next = sym[r[i+1]];
		if (cur < next){
			result += next - cur 
			i++
		} else {
			result += cur
		}
	}

	return result; 
	}
	else return r;
};



function detectWeb(doc, url) {
	if (url.includes('page')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.titre-article');
	for (let row of rows) {
		let href = row.innerHTML.split('"')[1].split('"')[0];//Z.debug(href)
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let risURL = ZU.xpathText(doc, '//a[contains(@href, "exports/export-zotero.php?")]/@href')
	ZU.doGet(risURL, function(text) {
		var translator = Zotero.loadTranslator("import");
		// Use RIS translator
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			var unescapeFields = ['title', 'publicationTitle', 'abstractNote'];
			for (var i=0; i<unescapeFields.length; i++) {
				if (item[unescapeFields[i]]) {
					item[unescapeFields[i]] = ZU.unescapeHTML(item[unescapeFields[i]]);
				}
			}

			// Subtitles could be in i or b
		if (doc.querySelector('.sous-titre-article i')){
			let addtitle = doc.querySelector('.sous-titre-article i').textContent.trim();
			if (item.title.match(/\..*/) && addtitle == item.title.substring(item.title.match(/\..*/).index+1).trim()) {
				item.title = item.title.substring(0,item.title.match(/\..*/).index);
			}
			item.title = item.title + ': ' + addtitle;
		} 
		if (doc.querySelector('.sous-titre-article b')){
			let addtitle = doc.querySelector('.sous-titre-article b').textContent.trim();
			if (item.title.match(/\..*/) && addtitle == item.title.substring(item.title.match(/\..*/).index+1).trim()) {
				item.title = item.title.substring(0,item.title.match(/\..*/).index);
			}
			item.title = item.title + ': ' + addtitle;
		}
		//if (doc.querySelector('.sous-titre-article i')) item.title = item.title + ': ' + doc.querySelector('.sous-titre-article i').textContent.trim();
		//if (doc.querySelector('.sous-titre-article b')) item.title = item.title + ': ' + doc.querySelector('.sous-titre-article b').textContent.trim();
		// Correct volume and issue information
		if (item.volume) {
			if (item.volume.search(/^n°/i) != -1) {
				item.volume = item.volume.split(/n°/i)[1].trim();
			} else if (item.volume.search(/^Vol./i) != -1) {
				item.volume = item.volume.split(/Vol./i)[1].trim();
			} else if (item.volume.search(/^Tome/i) != -1) {
				item.volume = item.volume.split(/Tome/i)[1].trim();
			}

			if (item.volume.search(/^\d+-\d+$/) != -1) {
				var volume = item.volume.split('-');
				item.volume = volume[0];
				item.issue = volume[1];
			}
		}
		
		if (!item.date || item.date == '0000-00-00') {
			item.date = ZU.xpathText(doc, '//meta[@name="DCSext.annee_tomaison"]/@content');
		}

		if (!item.pages) {
			item.pages = ZU.xpathText(doc, '//meta[@name="DCSext.doc_nb_pages"]/@content');
		}
		
		var doi = ZU.xpathText(doc, '//li[contains(., "DOI :")]');
		if (!item.DOI && doi) {
			item.DOI = doi.replace('DOI :', '');
		}
		
		let abstractFR = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "lang-fr", " " ))]//p');
		let abstractEN = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "lang-en", " " ))]//p');
		let abstractDE = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "lang-de", " " ))]//p');
		let abstractES = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "lang-es", " " ))]//p');
		
		if (item.abstractNote) item.abstractNote = item.abstractNote.replace(/\n/g, ' ');
		if (abstractEN && abstractEN.length > 100) {
			item.notes.push('abs:' + abstractEN.replace(/\n/g, ' '))
			if (abstractDE) item.notes.push('abs:' + abstractDE.replace(/\n/g, ' '))
			if (abstractES) item.notes.push('abs:' + abstractES.replace(/\n/g, ' '))
		}
		else if (ZU.xpathText(doc, '//meta[@name="citation_abstract" and @lang="en"]/@content') && ZU.xpathText(doc, '//meta[@name="citation_abstract" and @lang="en"]/@content').length > 100) {
			item.notes.push('abs:' + ZU.xpathText(doc, '//meta[@name="citation_abstract" and @lang="en"]/@content').replace(/\n/g, ' '));
			if (abstractDE) item.notes.push('abs:' + abstractDE.replace(/\n/g, ' '))
			if (abstractES) item.notes.push('abs:' + abstractES.replace(/\n/g, ' '))
		}
		let DOIentry = ZU.xpathText(doc, '//dd');
		if (!item.DOI && DOIentry) {
			let splitDOIentry = DOIentry.split('\n');//Z.debug(splitDOIentry)
			if (splitDOIentry) {
				item.DOI = splitDOIentry[1];
			}
		}
		
		// Cairn.info uses non-standard keywords:
		// we import them here, as the Embedded Metadata translator
		// cannot catch them.
		item.tags = [];
		var keywords = ZU.xpathText(doc, '//meta[@name="article-mot_cle"]/@content | //div[@class="grmotcle lang-en"]//li[@class="motcle"]');
		if (keywords) {
			keywords = keywords.split(/\s*[,;]\s*/);
			for (var i=0; i<keywords.length; i++) {
				if (keywords[i].trim()) {
					item.tags.push(keywords[i].replace(/^[a-zA-ZÀ-ÿ-. ]/, function($0) { return $0.toUpperCase(); }));
					}
				}
			}
		for (let tag of ZU.xpath(doc, '//li[@class="motcle"]')) {
		if (!item.tags.includes(tag.textContent)) item.tags.push(tag.textContent.replace(/\n/g, ' '));
		}
		if (item.volume) item.volume = romanToInt(item.volume).toString();

		item.ISSN = ZU.xpathText(doc, '//meta[@name="citation_issn"]/@content');

		if (["gratuit", "post barrière mobile"].includes(ZU.xpathText(doc, '//meta[@name="DCSext.comm_art"]/@content'))) item.notes.push('LF:');
		item.attachments = [];
		item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Que fait le genre à l’éthique théologique ?Éléments d’histoire et problématiques: Éléments d’histoire et problématiques: Éléments d’histoire et problématiques",
				"creators": [
					{
						"lastName": "Saintôt",
						"firstName": "Bruno",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/retm.311.0013",
				"ISSN": "1266-0078",
				"abstractNote": "Depuis la Quatrième conférence mondiale sur les femmes de Pékin, en 1995, le magistère catholique n’a cessé de s’opposer à l’usage du terme genre, accusé de propager une idéologie cherchant à déconstruire la sexualité, la procréation, la famille. Une valorisation récente du genre comme « rôle socioculturel du sexe » continue à souligner les dangers d’une dissociation entre sexe et genre. En adoptant une perspective historique, l’article analyse les significations et usages de la notion de genre. Il propose également une évaluation des changements théologiques opérés (justification des rôles et des pouvoirs, sexualité), des changements possibles (homosexualité), des impensés (transidentité et transsexualité), et des points fermes de résistance éthique (rapport au corps, procréation, écologie).",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Revue d'éthique et de théologie morale",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "13-27",
				"publicationTitle": "Revue d'éthique et de théologie morale",
				"shortTitle": "Que fait le genre à l’éthique théologique ?",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
				"volume": "308",
				"attachments": [],
				"tags": [
					{
						"tag": "Catholicisme"
					},
					{
						"tag": "Genre"
					},
					{
						"tag": "Sexualité"
					},
					{
						"tag": "Théorie du genre"
					},
					{
						"tag": "catholicisme"
					},
					{
						"tag": "genre"
					},
					{
						"tag": "sexualité"
					},
					{
						"tag": "théorie du genre"
					},
					{
						"tag": "Éthique sexuelle"
					},
					{
						"tag": "éthique sexuelle"
					}
				],
				"notes": [
					"abs:Since the Fourth World Conference on Women in Beijing in 1995, the Catholic Magisterium has consistently opposed the use of the term gender, accused of propagating an ideology seeking to deconstruct sexuality, procreation and the family. A recent valorization of gender as a &#8220;socio-cultural role of sex&#8221; continues to underline the dangers of a dissociation between sex and gender. By adopting a historical perspective, the article analyzes the meanings and uses of the notion of gender. It also proposes an assessment of the theological changes that have taken place (justification of roles and powers, sexuality), the possible changes (homosexuality), the unthought (transidentity and transsexuality), and the firm points of ethical resistance (relationship to the body, procreation, ecology)."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm?contenu=resume",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19 : un texte prémonitoire",
				"creators": [
					{
						"lastName": "Sonnet",
						"firstName": "Jean-Pierre",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/nrt.424.0529",
				"ISSN": "0029-4845",
				"abstractNote": "La crise du Covid-19 a été annoncée par des scientifiques clairvoyants. Bien avant eux, la Bible a fait entendre un avertissement qu’il s’agit d’entendre à nouveau. En Gn 1,28, le Dieu créateur institue Adam gardien des espèces animales et fait de lui le garant de leur distinction. Loin d’être une anthologie d’obscurantismes, la Bible est le précipité d’une sagesse immémoriale et prophétique ; elle sait que le rapport de l’homme aux espèces animales est un lieu redoutable, où se joue quelque chose du divin.",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Nouvelle revue théologique",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "529-541",
				"publicationTitle": "Nouvelle revue théologique",
				"shortTitle": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19",
				"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm",
				"volume": "142",
				"attachments": [],
				"tags": [
					{
						"tag": "Covid-19"
					},
					{
						"tag": "Espèces animales"
					},
					{
						"tag": "Genèse 1"
					},
					{
						"tag": "Lévitique 11"
					},
					{
						"tag": "Respect des distinctions"
					},
					{
						"tag": "Zoonose"
					},
					{
						"tag": "espèces animales"
					},
					{
						"tag": "respect des distinctions"
					},
					{
						"tag": "zoonose"
					}
				],
				"notes": [
					"abs:The Covid-19 crisis was predicted by far-sighted scientists. Long before they did, the Bible sounded a warning that must be heard again. In Gen&#160;1:28, the Creator God ordained Adam as the guardian of the animal species and made him the guarantor of their distinction. Far from being an anthology of obscurantism, the Bible is the precipitate of an immemorial and prophetic wisdom; it knows that man&#8217;s relationship with animal species is a awe-inspiring space, where something divine is at stake.",
					"abs:                     Resumen en español disponible en Cairn Mundo                 "
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Que fait le genre à l’éthique théologique ?Éléments d’histoire et problématiques: Éléments d’histoire et problématiques: Éléments d’histoire et problématiques",
				"creators": [
					{
						"lastName": "Saintôt",
						"firstName": "Bruno",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/retm.311.0013",
				"ISSN": "1266-0078",
				"abstractNote": "Depuis la Quatrième conférence mondiale sur les femmes de Pékin, en 1995, le magistère catholique n’a cessé de s’opposer à l’usage du terme genre, accusé de propager une idéologie cherchant à déconstruire la sexualité, la procréation, la famille. Une valorisation récente du genre comme « rôle socioculturel du sexe » continue à souligner les dangers d’une dissociation entre sexe et genre. En adoptant une perspective historique, l’article analyse les significations et usages de la notion de genre. Il propose également une évaluation des changements théologiques opérés (justification des rôles et des pouvoirs, sexualité), des changements possibles (homosexualité), des impensés (transidentité et transsexualité), et des points fermes de résistance éthique (rapport au corps, procréation, écologie).",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Revue d'éthique et de théologie morale",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "13-27",
				"publicationTitle": "Revue d'éthique et de théologie morale",
				"shortTitle": "Que fait le genre à l’éthique théologique ?",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
				"volume": "308",
				"attachments": [],
				"tags": [
					{
						"tag": "Catholicisme"
					},
					{
						"tag": "Genre"
					},
					{
						"tag": "Sexualité"
					},
					{
						"tag": "Théorie du genre"
					},
					{
						"tag": "catholicisme"
					},
					{
						"tag": "genre"
					},
					{
						"tag": "sexualité"
					},
					{
						"tag": "théorie du genre"
					},
					{
						"tag": "Éthique sexuelle"
					},
					{
						"tag": "éthique sexuelle"
					}
				],
				"notes": [
					"abs:Since the Fourth World Conference on Women in Beijing in 1995, the Catholic Magisterium has consistently opposed the use of the term gender, accused of propagating an ideology seeking to deconstruct sexuality, procreation and the family. A recent valorization of gender as a &#8220;socio-cultural role of sex&#8221; continues to underline the dangers of a dissociation between sex and gender. By adopting a historical perspective, the article analyzes the meanings and uses of the notion of gender. It also proposes an assessment of the theological changes that have taken place (justification of roles and powers, sexuality), the possible changes (homosexuality), the unthought (transidentity and transsexuality), and the firm points of ethical resistance (relationship to the body, procreation, ecology)."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2019-4-page-43.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La philosophie morale d’Alasdair MacIntyre: Une défense historiciste de l’impératif catégorique ?",
				"creators": [
					{
						"lastName": "Boss",
						"firstName": "Marc",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.3917/retm.306.0043",
				"ISSN": "1266-0078",
				"abstractNote": "La philosophie morale d’Alasdair MacIntyre repose sur une épistémologie ouvertement historiciste. L’historicisme est classiquement soupçonné de se dissoudre en relativisme dès lors qu’il rejette toute prétention à un savoir absolu qui dirait le fin mot de l’histoire, mais la thèse de MacIntyre maintient, en dépit d’un faillibilisme revendiqué, que les discours évaluatifs peuvent être soumis à des normes de décidabilité rationnellement justifiables. À la lumière des thèses corollaires de la rationalité des traditions et de l’indétermination constitutive des conceptions du bien, le présent article suggère que l’historicisme de MacIntyre renouvelle, dans un cadre théorique alternatif à celui de Kant, les principales caractéristiques d’une impérativité morale catégorique.",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Revue d'éthique et de théologie morale",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "43-58",
				"publicationTitle": "Revue d'éthique et de théologie morale",
				"shortTitle": "La philosophie morale d’Alasdair MacIntyre",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2019-4-page-43.htm",
				"volume": "304",
				"attachments": [],
				"tags": [
					{
						"tag": "Historicisme"
					},
					{
						"tag": "Kant"
					},
					{
						"tag": "MacIntyre"
					},
					{
						"tag": "Relativisme"
					},
					{
						"tag": "Vertus"
					},
					{
						"tag": "historicisme"
					},
					{
						"tag": "relativisme"
					},
					{
						"tag": "vertus"
					},
					{
						"tag": "Émotivisme"
					},
					{
						"tag": "émotivisme"
					}
				],
				"notes": [
					"abs:The moral philosophy of Alasdair MacIntyre is based on an openly historicist epistemology. Historicism is typically accused of dissolving into relativism since it rejects any claim to an absolute knowledge that could offer the final word in history, but MacIntyre&#8217;s thesis maintains, despite a claimed fallibility, that evaluative discourses can be subject to rationally justifiable norms of decidability. In light of the corollary theses of the rationality of traditions and the constitutive indeterminacy of conceptions of the good, this article suggests that MacIntyre&#8217;s historicism renews the main characteristics of a moral categorical imperative within a theoretical framework that provides an alternative to that of Kant.",
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-reforme-humanisme-renaissance-2020-2-page-13.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Les Lettres nouvelles de Milan de Pierre Gringore : la propagande entre vers et prose",
				"creators": [
					{
						"lastName": "Delvallée",
						"firstName": "Ellen",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/rhren.091.0013",
				"ISSN": "1771-1347",
				"abstractNote": "Pierre Gringore compose les Lettres Nouvelles de Milan à l’occasion de la capture de Ludovic Sforza en 1500. Le texte se présente comme un bulletin d’information, recueillant trois lettres en prose détaillant les événements, puis des vers reprenant peu ou prou les mêmes informations. Quelles valeurs revêtent prose et vers dans ce texte de propagande ? Tandis que les lettres en prose offrent des témoignages de première main et garantissent une vérité factuelle, les vers fonctionnent comme une amplification encomiastique à la gloire de la couronne de France mais aussi du poète qui cherche un mécène. Par ailleurs, Gringore propose également dans ses vers au style plus ou moins orné une réflexion sur le rôle du poète pour établir une vérité morale et la transmettre à des publics variés.",
				"archive": "Cairn.info",
				"issue": "2",
				"journalAbbreviation": "Réforme, Humanisme, Renaissance",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "13-30",
				"publicationTitle": "Réforme, Humanisme, Renaissance",
				"shortTitle": "Les Lettres nouvelles de Milan de Pierre Gringore",
				"url": "https://www.cairn.info/revue-reforme-humanisme-renaissance-2020-2-page-13.htm",
				"volume": "91",
				"attachments": [],
				"tags": [],
				"notes": [
					"abs:Pierre Gringore writes the Lettres Nouvelles de Milan when Ludovico Sforza got caught in 1500. His text consists of a news report, gathering three prose letters explaining the events along with lines of verse giving more or less the same information. What are the values assumed by prose and verse in this work of propaganda? While prose letters provide with first-hand testimonies and guarantee factual truth, the lines of verse work as an encomiastic amplification, to the glory of the French crown but also of the poet himself, looking for a patron. Moreover, through his more or less ornated lines of verse, Gringore also offers a reflection upon the poet’s role to establish a moral truth and to transmit it to a diversified audience."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-2-page-11.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Éthiques animales : la double dissociation",
				"creators": [
					{
						"lastName": "Charmetant",
						"firstName": "Eric",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/retm.308.0011",
				"ISSN": "1266-0078",
				"abstractNote": "La constitution des éthiques animales depuis le xixe siècle est marquée par une double dissociation : premièrement, entre la militance contre la souffrance animale et la protection de la nature sauvage ; deuxièmement, entre les diverses éthiques animales académiques et les éthiques environnementales. Cette étude montrera comment cette dissociation s’est constituée historiquement, quelles en sont les conséquences et comment la surmonter. Seul un dépassement de la césure radicale entre le sauvage et le domestique permet de fonder une éthique qui soit animale et environnementale.",
				"archive": "Cairn.info",
				"issue": "2",
				"journalAbbreviation": "Revue d'éthique et de théologie morale",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "11-22",
				"publicationTitle": "Revue d'éthique et de théologie morale",
				"shortTitle": "Éthiques animales",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-2-page-11.htm",
				"volume": "306",
				"attachments": [],
				"tags": [
					{
						"tag": "Domestication"
					},
					{
						"tag": "Sauvage"
					},
					{
						"tag": "domestication"
					},
					{
						"tag": "sauvage"
					},
					{
						"tag": "Écologie"
					},
					{
						"tag": "Éthique animale"
					},
					{
						"tag": "Éthique environnementale"
					},
					{
						"tag": "écologie"
					},
					{
						"tag": "éthique animale"
					},
					{
						"tag": "éthique environnementale"
					}
				],
				"notes": [
					"abs:The constitution of animal ethics since the 19th century is marked by a double dissociation: first, between militancy against animal suffering and the protection of the wilderness; second, between various academic animal ethics and environmental ethics. This study will show how this dissociation was historically constituted, what the consequences are and how it can be overcome. Only by overcoming the radical break between the wild and the domesticated can an animal and environmental ethic be founded."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm?contenu=resume",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19 : un texte prémonitoire",
				"creators": [
					{
						"lastName": "Sonnet",
						"firstName": "Jean-Pierre",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/nrt.424.0529",
				"ISSN": "0029-4845",
				"abstractNote": "La crise du Covid-19 a été annoncée par des scientifiques clairvoyants. Bien avant eux, la Bible a fait entendre un avertissement qu’il s’agit d’entendre à nouveau. En Gn 1,28, le Dieu créateur institue Adam gardien des espèces animales et fait de lui le garant de leur distinction. Loin d’être une anthologie d’obscurantismes, la Bible est le précipité d’une sagesse immémoriale et prophétique ; elle sait que le rapport de l’homme aux espèces animales est un lieu redoutable, où se joue quelque chose du divin.",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Nouvelle revue théologique",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "529-541",
				"publicationTitle": "Nouvelle revue théologique",
				"shortTitle": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19",
				"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm",
				"volume": "142",
				"attachments": [],
				"tags": [
					{
						"tag": "Covid-19"
					},
					{
						"tag": "Espèces animales"
					},
					{
						"tag": "Genèse 1"
					},
					{
						"tag": "Lévitique 11"
					},
					{
						"tag": "Respect des distinctions"
					},
					{
						"tag": "Zoonose"
					},
					{
						"tag": "espèces animales"
					},
					{
						"tag": "respect des distinctions"
					},
					{
						"tag": "zoonose"
					}
				],
				"notes": [
					"abs:The Covid-19 crisis was predicted by far-sighted scientists. Long before they did, the Bible sounded a warning that must be heard again. In Gen&#160;1:28, the Creator God ordained Adam as the guardian of the animal species and made him the guarantor of their distinction. Far from being an anthology of obscurantism, the Bible is the precipitate of an immemorial and prophetic wisdom; it knows that man&#8217;s relationship with animal species is a awe-inspiring space, where something divine is at stake.",
					"abs:                     Resumen en español disponible en Cairn Mundo                 "
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-etudes-theologiques-et-religieuses-2022-4.htm",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-etudes-theologiques-et-religieuses-2022-4-page-409.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Faire de la théologie aujourd’hui. Liminaire",
				"creators": [],
				"date": "2022",
				"DOI": "10.3917/etr.974.0409",
				"ISSN": "0014-2239",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Études théologiques et religieuses",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "409-410",
				"publicationTitle": "Études théologiques et religieuses",
				"url": "https://www.cairn.info/revue-etudes-theologiques-et-religieuses-2022-4-page-409.htm",
				"volume": "97",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-recherches-de-science-religieuse-2023-1-page-93.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le salut de l’Évangile et les saluts de l’Église",
				"creators": [
					{
						"lastName": "d’Aloisio",
						"firstName": "Christophe",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.3917/rsr.231.0093",
				"ISSN": "0034-1258",
				"abstractNote": "Dans une Église idéale, la sotériologie devrait pouvoir se confondre avec l’ecclésiologie. En effet, quelle autre réalisation du salut peut-on espérer que l’Église ? Autant cette affirmation ravira certains théologiens, autant elle choquera la plupart de nos contemporains, tellement le vécu ecclésial est éloigné, dans la pratique de toutes les communautés, d’une expérience de salut. Cette tension entre sotériologie et ecclésiologie est due au fait qu’une Église « idéale », cela n’existe pas dans l’histoire ; c’est bien l’histoire qui est l’élément déterminant pour distinguer salut et Église et qui pourrait inspirer le sursaut susceptible de mener à un renouveau.",
				"archive": "Cairn.info",
				"issue": "1",
				"journalAbbreviation": "Recherches de Science Religieuse",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "93-104",
				"publicationTitle": "Recherches de Science Religieuse",
				"url": "https://www.cairn.info/revue-recherches-de-science-religieuse-2023-1-page-93.htm",
				"volume": "111",
				"attachments": [],
				"tags": [
					{
						"tag": "Church"
					},
					{
						"tag": "Eucharist"
					},
					{
						"tag": "Eucharistie"
					},
					{
						"tag": "Histoire"
					},
					{
						"tag": "History"
					},
					{
						"tag": "Liturgie"
					},
					{
						"tag": "Liturgy"
					},
					{
						"tag": "People"
					},
					{
						"tag": "Peuple"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "Politique"
					},
					{
						"tag": "Testimony"
					},
					{
						"tag": "Témoignage"
					},
					{
						"tag": "eucharist"
					},
					{
						"tag": "eucharistie"
					},
					{
						"tag": "histoire"
					},
					{
						"tag": "history"
					},
					{
						"tag": "liturgie"
					},
					{
						"tag": "liturgy"
					},
					{
						"tag": "people"
					},
					{
						"tag": "peuple"
					},
					{
						"tag": "politics"
					},
					{
						"tag": "politique"
					},
					{
						"tag": "testimony"
					},
					{
						"tag": "témoignage"
					},
					{
						"tag": "Église"
					}
				],
				"notes": [
					"abs:In an ideal Church, soteriology should be able to fit closely with ecclesiology. In fact, what other outcome of salvation could one expect from the Church? While this statement may please some theologians, it will shock most of our contemporaries, seeing that the experience of the Church is so far from their experience of salvation in the everyday life in of all communities. This tension between soteriology and ecclesiology is due to the fact that an ‘ideal’ Church does not exist in history; history is clearly the decisive element to distinguish salvation and Church and it could inspire an awakening capable of leading to a renewal."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-des-sciences-philosophiques-et-theologiques-2022-3-page-465.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le destin de l’État-nation dans la mondialisation : une réalité paradoxale",
				"creators": [
					{
						"lastName": "Renaud-Boulesteix",
						"firstName": "Bénédicte",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.3917/rspt.1063.0465",
				"ISSN": "0035-2209",
				"abstractNote": "La question de la liberté politique effective des hommes dans un monde globalisé travaille la crise de l’État-nation. Cette crise ne renvoie nullement à un déclin mais à une double contradiction, celle d’être à la fois le lieu de naissance de la liberté du citoyen et celui d’une volonté collective contrainte, pour ne pas dire contrariée dans certains cas. Il ne s’agit pas de louer ou blâmer la dynamique de la mondialisation mais d’en comprendre l’ambivalence dès lors que l’on envisage l’alliance de la puissance et de la volonté comme facteur d’une liberté nationale plus effective au plan interne et dans l’ordre international. À la fois irréductible et dépassable, l’État-nation comme réalité critique surgit dans l’entre-deux-guerres dans les débats qui animent tous les milieux intellectuels, notamment catholiques comme en témoignent les positions clivées entre Joseph Delos et Gaston Fessard. Ce premier moment fonde les interrogations qui travaillent notre réflexion présente balancée entre la volonté de replacer les nations démocratiques au cœur de la marche globalisée du monde et la nécessité d’intégrations stratégiques régionales.",
				"archive": "Cairn.info",
				"issue": "3",
				"journalAbbreviation": "Revue des sciences philosophiques et théologiques",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "465-488",
				"publicationTitle": "Revue des sciences philosophiques et théologiques",
				"shortTitle": "Le destin de l’État-nation dans la mondialisation",
				"url": "https://www.cairn.info/revue-des-sciences-philosophiques-et-theologiques-2022-3-page-465.htm",
				"volume": "106",
				"attachments": [],
				"tags": [
					{
						"tag": "Coopération internationale"
					},
					{
						"tag": "Fédéralisme"
					},
					{
						"tag": "Liberté politique"
					},
					{
						"tag": "Mondialisation"
					},
					{
						"tag": "Puissance"
					},
					{
						"tag": "Souveraineté"
					},
					{
						"tag": "Tiers parti catholique"
					},
					{
						"tag": "coopération internationale"
					},
					{
						"tag": "fédéralisme"
					},
					{
						"tag": "liberté politique"
					},
					{
						"tag": "mondialisation"
					},
					{
						"tag": "puissance"
					},
					{
						"tag": "souveraineté"
					},
					{
						"tag": "tiers parti catholique"
					},
					{
						"tag": "État-nation"
					}
				],
				"notes": [
					"abs:The question of the effective political freedom of men in a globalized world affects the crisis of the nation-state. This crisis in no way refers to a decline but to a twofold contradiction, that of being both the birthplace of the freedom of the citizen and that of a constrained collective will, not to say thwarted in certain cases. It is not a question of praising or blaming the dynamics of globalization but of understanding its ambivalence when one considers the alliance of power and will as a factor in a more effective national freedom at the internal level as well as in the international order. At once irreducible and surpassable, the nation-state as a critical reality emerged in the interwar period in the debates that animated all intellectual circles, particularly Catholic ones, as evidenced by the divided positions of Joseph Delos and Gaston Fessard. This initial moment establishes the questions at work in our present reflection, balanced between the desire to put democratic nations back at the heart of the globalized world and the need for regional strategic integrations."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-des-sciences-philosophiques-et-theologiques-2022-3-page-465.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le destin de l’État-nation dans la mondialisation : une réalité paradoxale",
				"creators": [
					{
						"lastName": "Renaud-Boulesteix",
						"firstName": "Bénédicte",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.3917/rspt.1063.0465",
				"ISSN": "0035-2209",
				"abstractNote": "La question de la liberté politique effective des hommes dans un monde globalisé travaille la crise de l’État-nation. Cette crise ne renvoie nullement à un déclin mais à une double contradiction, celle d’être à la fois le lieu de naissance de la liberté du citoyen et celui d’une volonté collective contrainte, pour ne pas dire contrariée dans certains cas. Il ne s’agit pas de louer ou blâmer la dynamique de la mondialisation mais d’en comprendre l’ambivalence dès lors que l’on envisage l’alliance de la puissance et de la volonté comme facteur d’une liberté nationale plus effective au plan interne et dans l’ordre international. À la fois irréductible et dépassable, l’État-nation comme réalité critique surgit dans l’entre-deux-guerres dans les débats qui animent tous les milieux intellectuels, notamment catholiques comme en témoignent les positions clivées entre Joseph Delos et Gaston Fessard. Ce premier moment fonde les interrogations qui travaillent notre réflexion présente balancée entre la volonté de replacer les nations démocratiques au cœur de la marche globalisée du monde et la nécessité d’intégrations stratégiques régionales.",
				"archive": "Cairn.info",
				"issue": "3",
				"journalAbbreviation": "Revue des sciences philosophiques et théologiques",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "465-488",
				"publicationTitle": "Revue des sciences philosophiques et théologiques",
				"shortTitle": "Le destin de l’État-nation dans la mondialisation",
				"url": "https://www.cairn.info/revue-des-sciences-philosophiques-et-theologiques-2022-3-page-465.htm",
				"volume": "106",
				"attachments": [],
				"tags": [
					{
						"tag": "Coopération internationale"
					},
					{
						"tag": "Fédéralisme"
					},
					{
						"tag": "Liberté politique"
					},
					{
						"tag": "Mondialisation"
					},
					{
						"tag": "Puissance"
					},
					{
						"tag": "Souveraineté"
					},
					{
						"tag": "Tiers parti catholique"
					},
					{
						"tag": "coopération internationale"
					},
					{
						"tag": "fédéralisme"
					},
					{
						"tag": "liberté politique"
					},
					{
						"tag": "mondialisation"
					},
					{
						"tag": "puissance"
					},
					{
						"tag": "souveraineté"
					},
					{
						"tag": "tiers parti catholique"
					},
					{
						"tag": "État-nation"
					}
				],
				"notes": [
					"abs:The question of the effective political freedom of men in a globalized world affects the crisis of the nation-state. This crisis in no way refers to a decline but to a twofold contradiction, that of being both the birthplace of the freedom of the citizen and that of a constrained collective will, not to say thwarted in certain cases. It is not a question of praising or blaming the dynamics of globalization but of understanding its ambivalence when one considers the alliance of power and will as a factor in a more effective national freedom at the internal level as well as in the international order. At once irreducible and surpassable, the nation-state as a critical reality emerged in the interwar period in the debates that animated all intellectual circles, particularly Catholic ones, as evidenced by the divided positions of Joseph Delos and Gaston Fessard. This initial moment establishes the questions at work in our present reflection, balanced between the desire to put democratic nations back at the heart of the globalized world and the need for regional strategic integrations."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-deviance-et-societe-2023-1-page-35.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Une accessibilité bien ordonnée: Les politiques du handicap comme instrument de statu quo social",
				"creators": [
					{
						"lastName": "Bodin",
						"firstName": "Romuald",
						"creatorType": "author"
					},
					{
						"lastName": "Douat",
						"firstName": "Étienne",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.3917/ds.471.0037",
				"ISSN": "0378-7931",
				"abstractNote": "L’article s’intéresse au nouvel « ordre symbolique » que la loi française du 11 février 2005 (pour l’égalité des droits et des chances, la participation et la citoyenneté des personnes handicapées) et les débats publics qui l’entourent contribuent à constituer ainsi qu’à ses conséquences concrètes en termes d’organisation sociale. L’enjeu est de montrer qu’à l’encontre d’une lecture conventionnelle qui fait de cette loi un point de basculement vers un nouveau modèle du handicap, dont l’accessibilité et le « vivre ensemble » seraient devenus les mots d’ordre, l’ordre symbolique qui s’impose dans les années 2000 est en réalité un instrument de maintien du statu quo et de préservation de l’ordre public.",
				"archive": "Cairn.info",
				"issue": "1",
				"journalAbbreviation": "Déviance et Société",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "35-63",
				"publicationTitle": "Déviance et Société",
				"shortTitle": "Une accessibilité bien ordonnée",
				"url": "https://www.cairn.info/revue-deviance-et-societe-2023-1-page-35.htm",
				"volume": "47",
				"attachments": [],
				"tags": [
					{
						"tag": "Accesibilidad"
					},
					{
						"tag": "Accessibility"
					},
					{
						"tag": "Accessibilité"
					},
					{
						"tag": "Acción pública"
					},
					{
						"tag": "Action publique"
					},
					{
						"tag": "Barrierefreiheit"
					},
					{
						"tag": "Behinderung"
					},
					{
						"tag": "Disability"
					},
					{
						"tag": "Discapacidad"
					},
					{
						"tag": "Exclusion"
					},
					{
						"tag": "Exclusion"
					},
					{
						"tag": "Exclusión"
					},
					{
						"tag": "Exklusion"
					},
					{
						"tag": "Handicap"
					},
					{
						"tag": "Orden\npúblico"
					},
					{
						"tag": "Ordre\npublic"
					},
					{
						"tag": "Public\norder"
					},
					{
						"tag": "Public policy"
					},
					{
						"tag": "Öffentliche klage"
					},
					{
						"tag": "Öffentliche ordnung"
					}
				],
				"notes": [
					"abs:The article focuses on the new “symbolic order” the French law of 11 February 2005 (for equal rights and opportunities, participation and citizenship of people with disabilities) and the public debates that surround it contribute to constitute, as well as on its concrete consequences in terms of social organization. The challenge is to show that, contrary to a conventional reading that makes this law a tipping point towards a new model of disability, in which accessibility and “living together” would have become the watchwords, the symbolic order that was imposed in the 2000s is in fact an instrument for maintaining the status quo and preserving public order.",
					"abs:Der Artikel befasst sich mit der neuen „symbolischen Ordnung“ des französischen Gesetzes vom 11. Februar 2005 (für gleiche Rechte und Chancen, Teilhabe und Staatsbürgerschaft von Menschen mit Behinderungen) und den damit verbundenen öffentlichen Debatten, die dazu beitragen, es zu konstituieren, ebenso wie den konkreten Auswirkungen in Bezug auf die soziale Organisation. Die Herausforderung besteht darin, zu zeigen, dass entgegen einer konventionellen Lesart, welche dieses Gesetz zu einem Wendepunkt in Richtung eines neuen Behindertenmodells macht, in welchem Barrierefreiheit und „Zusammenleben“ zu Schlagworten geworden wären, die symbolische Ordnung, die sich in den 2000er Jahren durchgesetzt hat, in Wirklichkeit ein Instrument zur Aufrechterhaltung des Status Quo und zur Wahrung der öffentlichen Ordnung ist.",
					"abs:Este artículo analiza el nuevo “orden simbólico” que están contribuyendo a crear la ley francesa de 11 de febrero de 2005 (para la igualdad de derechos y oportunidades, la participación y la ciudadanía de las personas con discapacidad) y los debates públicos sobre ella ; así como las consecuencias concretas en términos de organización social. El reto consiste en demostrar que, contrariamente a la lectura más convencional que analiza esta ley como un punto de inflexión hacia un nuevo modelo de discapacidad, en el que la accesibilidad y la “convivencia” se habrían convertido en las consignas, el orden simbólico que se impuso en los años 2000 es en realidad un instrumento para mantener el statu quo y preservar el orden público.",
					"LF:"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
