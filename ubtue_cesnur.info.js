{
	"translatorID": "09d633df-db68-4791-b557-6c9042d7f140",
	"label": "ubtue_cesnur.info",
	"creator": "Helena Nebel",
	"target": "cesnur\\.net\\/(archives|supplements)\\/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-30 15:35:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Simon Kornblith

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

// builds a list of DOIs
var identifiers = {};
var dois = [];
function getDOIs(doc) {
	// TODO Detect DOIs more correctly.
	// The actual rules for DOIs are very lax-- but we're more strict.
	// Specifically, we should allow space characters, and all Unicode
	// characters except for control characters. Here, we're cheating
	// by not allowing ampersands, to fix an issue with getting DOIs
	// out of URLs.
	// Additionally, all content inside <noscript> is picked up as text()
	// by the xpath, which we don't necessarily want to exclude, but
	// that means that we can get DOIs inside node attributes and we should
	// exclude quotes in this case.
	// DOI should never end with a period or a comma (we hope)
	// Description at: http://www.doi.org/handbook_2000/appendix_1.html#A1-4
	const DOIre = /\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/g;
	var rows = ZU.xpath(doc, '//p');
	for (var i = 0; i < rows.length; i++) {
		var href = ZU.xpathText(rows[i], './descendant::a/@href');
		var title = ZU.trimInternal(rows[i].textContent.split('DOI: ')[0]);
		let doi = rows[i].textContent.match(DOIre);
		if (!href || !title || !doi) continue;
		if (doi[0]) doi = doi[0].replace(/[^\d]+$/g, '');
		let issue = "";
		if (href.match(/tjoc_\d+_\d+/)) issue = href.match(/tjoc_(\d+_\d+)/)[1];
		else continue;
		if (title.match(/View full issue/i)) continue;
		identifiers[doi] = 'Issue: ' + issue + '::::';
		dois.push(doi);
		if (i >= 50) break;
	}
	return dois;
}

function detectWeb(doc, url) {
	// Blacklist the advertising iframe in ScienceDirect guest mode:
	// http://www.sciencedirect.com/science/advertisement/options/num/264322/mainCat/general/cat/general/acct/...
	// This can be removed from blacklist when 5c324134c636a3a3e0432f1d2f277a6bc2717c2a hits all clients (Z 3.0+)
	const blacklistRe = /^https?:\/\/[^/]*(?:google\.com|sciencedirect\.com\/science\/advertisement\/)/i;
	
	if (!blacklistRe.test(url)) {
		var DOIs = getDOIs(doc);
		if (DOIs.length) {
			return "multiple";
		}
	}
	return false;
}

function retrieveDOIs(dois) {
	let items = {};
	let numDOIs = dois.length;

	for (const doi of dois) {
		items[doi] = null;
		
		const translate = Zotero.loadTranslator("search");
		translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
		translate.setSearch({ itemType: "journalArticle", DOI: doi });
	
		// don't save when item is done
		translate.setHandler("itemDone", function (_translate, item) {
			if (!item.title) {
				Zotero.debug("No title available for " + item.DOI);
				item.title = "[No Title]";
			}
			item.title = identifiers[item.DOI] + item.title;
			items[item.DOI] = item;
		});
		/* eslint-disable no-loop-func */
		translate.setHandler("done", function () {
			numDOIs--;
			
			// All DOIs retrieved
			if (numDOIs <= 0) {
				// Check to see if there's at least one DOI
				if (!Object.keys(items).length) {
					throw new Error("DOI Translator: could not find DOI");
				}
				
				// Only show items that resolved successfully
				let select = {};
				for (let doi in items) {
					let item = items[doi];
					if (item) {
						select[doi] = item.title || "[" + item.DOI + "]";
					}
				}
				Zotero.selectItems(select, function (selectedDOIs) {
					if (!selectedDOIs) return;
					for (let selectedDOI in selectedDOIs) {
						let item = items[selectedDOI];
						item.title = item.title.split('::::')[1];
						item.date = item.date.match(/\d{4}/)[0];
						if (item.url.match('.supp.')) {
							item.notes.push('SonderHeft:Supplement');
							}
						if (item.issue) {
							if (item.issue.match(/Vol(?:ume|\.)\s+\d+,\s+Issue\s+\d+/i)) {
							item.volume = item.issue.match(/Vol(?:ume|\.)\s+(\d+),\s+Issue\s+\d+/i)[1];
							item.issue = item.issue.match(/Vol(?:ume|\.)\s+\d+,\s+Issue\s+(\d+)/i)[1];
							}
						}
						else {
							if (identifiers[doi].match(/\d+_\d+::::/)) {
								item.volume = identifiers[doi].match(/(\d+)_\d+::::/)[1];
								item.issue = identifiers[doi].match(/\d+_(\d+)::::/)[1];
							}
						}
						item.libraryCatalog = "ubtue_cesnur.info";
						item.complete();
					}
				});
			}
		});
	
		// Don't throw on error
		translate.setHandler("error", function () {});
	
		translate.translate();
	}
}

function doWeb(doc) {
	var dois = getDOIs(doc);
	retrieveDOIs(dois);
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
				"ISSN": "9782204138093",
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
						"tag": "Éthique sexuelle"
					}
				],
				"notes": [],
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
					}
				],
				"notes": [],
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
				"ISSN": "9782204138093",
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
						"tag": "Éthique sexuelle"
					}
				],
				"notes": [],
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
				"title": "La philosophie morale d’Alasdair MacIntyre. Une défense historiciste de l’impératif catégorique ?: Une défense historiciste de l’impératif catégorique ?",
				"creators": [
					{
						"lastName": "Boss",
						"firstName": "Marc",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.3917/retm.306.0043",
				"ISSN": "9782204132473",
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
						"tag": "Émotivisme"
					}
				],
				"notes": [],
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
				"abstractNote": "Pierre Gringore compose les Lettres Nouvelles de Milan à l’occasion de la capture de Ludovic Sforza en 1500. Le texte se présente comme un bulletin d’information, recueillant trois lettres en prose détaillant les événements, puis des vers reprenant peu ou prou les mêmes informations. Quelles valeurs revêtent prose et vers dans ce texte de propagande ? Tandis que les lettres en prose offrent des témoignages de première main et garantissent une vérité factuelle, les vers fonctionnent comme une amplification encomiastique à la gloire de la couronne de France mais aussi du poète qui cherche un mécène. Par ailleurs, Gringore propose également dans ses vers au style plus ou moins orné une réflexion sur le rôle du poète pour établir une vérité morale et la transmettre à des publics variés.\\n4207 Pierre Gringore writes the Lettres Nouvelles de Milan when Ludovico Sforza got caught in 1500. His text consists of a news report, gathering three prose letters explaining the events along with lines of verse giving more or less the same information. What are the values assumed by prose and verse in this work of propaganda? While prose letters provide with first-hand testimonies and guarantee factual truth, the lines of verse work as an encomiastic amplification, to the glory of the French crown but also of the poet himself, looking for a patron. Moreover, through his more or less ornated lines of verse, Gringore also offers a reflection upon the poet’s role to establish a moral truth and to transmit it to a diversified audience.",
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
				"notes": [],
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
				"ISSN": "9782204138062",
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
						"tag": "Écologie"
					},
					{
						"tag": "Éthique animale"
					},
					{
						"tag": "Éthique environnementale"
					}
				],
				"notes": [],
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
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
