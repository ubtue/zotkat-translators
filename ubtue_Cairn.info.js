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
	"lastUpdated": "2021-01-18 16:23:01"
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		
		// Subtitles could be in i or b
		if (doc.querySelector('.sous-titre-article i')) item.title = item.title + ': ' + doc.querySelector('.sous-titre-article i').textContent.trim();
		if (doc.querySelector('.sous-titre-article b')) item.title = item.title + ': ' + doc.querySelector('.sous-titre-article b').textContent.trim();
		// Correct volume and issue information
		if (item.volume) {
			if (item.volume.search(/^n°/i) != -1) {
				item.volume = item.volume.split(/n°/i)[1].trim();
			} else if (item.volume.search(/^Vol./i) != -1) {
				item.volume = item.volume.split(/Vol./i)[1].trim();
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
		let abstractEN = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "lang-en", " " ))]//p')
		if (item.abstractNote && abstractEN.length > 100) item.abstractNote = item.abstractNote + '\\n4207 ' + abstractEN;
		
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

		item.complete();
	});
		translator.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Que fait le genre à l’éthique théologique ?: Éléments d’histoire et problématiques: Éléments d’histoire et problématiques",
				"creators": [
					{
						"firstName": "Bruno",
						"lastName": "Saintôt",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "https://doi.org/10.3917/retm.311.0013",
				"ISSN": "1266-0078",
				"abstractNote": "Depuis la Quatri&#232;me conf&#233;rence mondiale sur les femmes de P&#233;kin, en 1995, le magist&#232;re catholique n&#8217;a cess&#233; de s&#8217;opposer &#224; l&#8217;usage du terme genre, accus&#233; de propager une id&#233;ologie cherchant &#224; d&#233;construire la sexualit&#233;, la procr&#233;ation, la famille. Une valorisation r&#233;cente du genre comme &#171;&#160;r&#244;le socioculturel du sexe&#160;&#187; continue &#224; souligner les dangers d&#8217;une dissociation entre sexe et genre. En adoptant une perspective historique, l&#8217;article analyse les significations et usages de la notion de genre. Il propose &#233;galement une &#233;valuation des changements th&#233;ologiques op&#233;r&#233;s (justification des r&#244;les et des pouvoirs, sexualit&#233;), des changements possibles (homosexualit&#233;), des impens&#233;s (transidentit&#233; et transsexualit&#233;), et des points fermes de r&#233;sistance &#233;thique (rapport au corps, procr&#233;ation, &#233;cologie).\\n4207 Since the Fourth World Conference on Women in Beijing in 1995, the Catholic Magisterium has consistently opposed the use of the term gender, accused of propagating an ideology seeking to deconstruct sexuality, procreation and the family. A recent valorization of gender as a “socio-cultural role of sex” continues to underline the dangers of a dissociation between sex and gender. By adopting a historical perspective, the article analyzes the meanings and uses of the notion of gender. It also proposes an assessment of the theological changes that have taken place (justification of roles and powers, sexuality), the possible changes (homosexuality), the unthought (transidentity and transsexuality), and the firm points of ethical resistance (relationship to the body, procreation, ecology).",
				"issue": "4",
				"language": "fr",
				"libraryCatalog": "www.cairn.info",
				"pages": "13-27",
				"publicationTitle": "Revue d'ethique et de theologie morale",
				"shortTitle": "Que fait le genre à l’éthique théologique ?",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
				"volume": "308",
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
				"title": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19 : un texte prémonitoire",
				"creators": [
					{
						"firstName": "Jean-Pierre",
						"lastName": "Sonnet",
						"creatorType": "author"
					}
				],
				"date": "2020-09-24",
				"DOI": "https://doi.org/10.3917/nrt.424.0529",
				"ISSN": "0029-4845",
				"abstractNote": "La crise du Covid-19 a &#233;t&#233; annonc&#233;e par des scientifiques clairvoyants. Bien avant eux, la Bible a fait entendre un avertissement qu&#8217;il s&#8217;agit d&#8217;entendre &#224; nouveau. En Gn&#160;1,28, le Dieu cr&#233;ateur institue Adam gardien des esp&#232;ces animales et fait de lui le garant de leur distinction. Loin d&#8217;&#234;tre une anthologie d&#8217;obscurantismes, la Bible est le pr&#233;cipit&#233; d&#8217;une sagesse imm&#233;moriale et proph&#233;tique&#160;; elle sait que le rapport de l&#8217;homme aux esp&#232;ces animales est un lieu redoutable, o&#249; se joue quelque chose du divin.\\n4207 The Covid-19 crisis was predicted by far-sighted scientists. Long before they did, the Bible sounded a warning that must be heard again. In Gen 1:28, the Creator God ordained Adam as the guardian of the animal species and made him the guarantor of their distinction. Far from being an anthology of obscurantism, the Bible is the precipitate of an immemorial and prophetic wisdom; it knows that man’s relationship with animal species is a awe-inspiring space, where something divine is at stake.",
				"issue": "4",
				"language": "fr",
				"libraryCatalog": "www.cairn.info",
				"pages": "529-541",
				"publicationTitle": "Nouvelle revue theologique",
				"shortTitle": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19",
				"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm?contenu=resume",
				"volume": "Tome 142",
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
		"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm?contenu=resume",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19 : un texte prémonitoire",
				"creators": [
					{
						"firstName": "Jean-Pierre",
						"lastName": "Sonnet",
						"creatorType": "author"
					}
				],
				"date": "2020-09-24",
				"DOI": "https://doi.org/10.3917/nrt.424.0529",
				"ISSN": "0029-4845",
				"abstractNote": "La crise du Covid-19 a &#233;t&#233; annonc&#233;e par des scientifiques clairvoyants. Bien avant eux, la Bible a fait entendre un avertissement qu&#8217;il s&#8217;agit d&#8217;entendre &#224; nouveau. En Gn&#160;1,28, le Dieu cr&#233;ateur institue Adam gardien des esp&#232;ces animales et fait de lui le garant de leur distinction. Loin d&#8217;&#234;tre une anthologie d&#8217;obscurantismes, la Bible est le pr&#233;cipit&#233; d&#8217;une sagesse imm&#233;moriale et proph&#233;tique&#160;; elle sait que le rapport de l&#8217;homme aux esp&#232;ces animales est un lieu redoutable, o&#249; se joue quelque chose du divin.\\n4207 The Covid-19 crisis was predicted by far-sighted scientists. Long before they did, the Bible sounded a warning that must be heard again. In Gen 1:28, the Creator God ordained Adam as the guardian of the animal species and made him the guarantor of their distinction. Far from being an anthology of obscurantism, the Bible is the precipitate of an immemorial and prophetic wisdom; it knows that man’s relationship with animal species is a awe-inspiring space, where something divine is at stake.",
				"issue": "4",
				"language": "fr",
				"libraryCatalog": "www.cairn.info",
				"pages": "529-541",
				"publicationTitle": "Nouvelle revue theologique",
				"shortTitle": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19",
				"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm?contenu=resume",
				"volume": "Tome 142",
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
						"tag": "Animal species"
					},
					{
						"tag": "Covid-19"
					},
					{
						"tag": "Covid-19"
					},
					{
						"tag": "Espèces animales"
					},
					{
						"tag": "Genesis 1"
					},
					{
						"tag": "Genèse 1"
					},
					{
						"tag": "Leviticus 11"
					},
					{
						"tag": "Lévitique 11"
					},
					{
						"tag": "Respect des distinctions"
					},
					{
						"tag": "Respecting distinctions"
					},
					{
						"tag": "Zoonose"
					},
					{
						"tag": "Zoonosis"
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
				"title": "Que fait le genre à l’éthique théologique ?: Éléments d’histoire et problématiques: Éléments d’histoire et problématiques",
				"creators": [
					{
						"firstName": "Bruno",
						"lastName": "Saintôt",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "https://doi.org/10.3917/retm.311.0013",
				"ISSN": "1266-0078",
				"abstractNote": "Depuis la Quatri&#232;me conf&#233;rence mondiale sur les femmes de P&#233;kin, en 1995, le magist&#232;re catholique n&#8217;a cess&#233; de s&#8217;opposer &#224; l&#8217;usage du terme genre, accus&#233; de propager une id&#233;ologie cherchant &#224; d&#233;construire la sexualit&#233;, la procr&#233;ation, la famille. Une valorisation r&#233;cente du genre comme &#171;&#160;r&#244;le socioculturel du sexe&#160;&#187; continue &#224; souligner les dangers d&#8217;une dissociation entre sexe et genre. En adoptant une perspective historique, l&#8217;article analyse les significations et usages de la notion de genre. Il propose &#233;galement une &#233;valuation des changements th&#233;ologiques op&#233;r&#233;s (justification des r&#244;les et des pouvoirs, sexualit&#233;), des changements possibles (homosexualit&#233;), des impens&#233;s (transidentit&#233; et transsexualit&#233;), et des points fermes de r&#233;sistance &#233;thique (rapport au corps, procr&#233;ation, &#233;cologie).\\n4207 Since the Fourth World Conference on Women in Beijing in 1995, the Catholic Magisterium has consistently opposed the use of the term gender, accused of propagating an ideology seeking to deconstruct sexuality, procreation and the family. A recent valorization of gender as a “socio-cultural role of sex” continues to underline the dangers of a dissociation between sex and gender. By adopting a historical perspective, the article analyzes the meanings and uses of the notion of gender. It also proposes an assessment of the theological changes that have taken place (justification of roles and powers, sexuality), the possible changes (homosexuality), the unthought (transidentity and transsexuality), and the firm points of ethical resistance (relationship to the body, procreation, ecology).",
				"issue": "4",
				"language": "fr",
				"libraryCatalog": "www.cairn.info",
				"pages": "13-27",
				"publicationTitle": "Revue d'ethique et de theologie morale",
				"shortTitle": "Que fait le genre à l’éthique théologique ?",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
				"volume": "308",
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
						"tag": "Catholicism"
					},
					{
						"tag": "Catholicisme"
					},
					{
						"tag": "Gender"
					},
					{
						"tag": "Gender theory"
					},
					{
						"tag": "Genre"
					},
					{
						"tag": "Sexual ethics"
					},
					{
						"tag": "Sexuality"
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
		"url": "https://www.cairn-int.info/journal-revue-d-ethique-et-de-theologie-morale-2020-3-page-11.htm#",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Between dreams and illusions… the Artificial Intelligence in question",
				"creators": [
					{
						"firstName": "Isabelle",
						"lastName": "Linden",
						"creatorType": "author"
					}
				],
				"date": "2020-10-16",
				"ISSN": "1266-0078",
				"abstractNote": "The intriguing presence of Artificial Intelligence (AI) in everyday life and in society can be a source of worry. As much as AI is ubiquitous, it at times appears to get out of hand. This article tries to take stock of what AI really is today and to identify some of the questions it raises from a computer scientist&#8217;s point of view. It opens with an introduction to the main AI techniques and an analysis of their technical characteristics. This is followed by a theoretical reflection on what intelligence is, and subsequently on the characteristics of artificial intelligence. Finally, some arguments question the ethics and the project of society integrating AI.\\n4207 \nThe intriguing presence of Artificial Intelligence (AI) in everyday life and in society can be a source of worry. As much as AI is ubiquitous, it at times appears to get out of hand. This article tries to take stock of what AI really is today and to identify some of the questions it raises from a computer scientist’s point of view. It opens with an introduction to the main AI techniques and an analysis of their technical characteristics. This is followed by a theoretical reflection on what intelligence is, and subsequently on the characteristics of artificial intelligence. Finally, some arguments question the ethics and the project of society integrating AI.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.cairn-int.info",
				"pages": "11-27",
				"publicationTitle": "Revue dethique et de theologie morale",
				"url": "https://www.cairn-int.info/journal-revue-d-ethique-et-de-theologie-morale-2020-3-page-11.htm",
				"volume": "No 307",
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
						"tag": "AI and responsibility"
					},
					{
						"tag": "AI integration"
					},
					{
						"tag": "Artificial intelligence techniques"
					},
					{
						"tag": "Calculability"
					},
					{
						"tag": "Ethics by design"
					},
					{
						"tag": "Society project"
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
				"title": "La philosophie morale d’Alasdair MacIntyre: Une défense historiciste de l’impératif catégorique ?",
				"creators": [
					{
						"firstName": "Marc",
						"lastName": "Boss",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "https://doi.org/10.3917/retm.306.0043",
				"ISSN": "1266-0078",
				"abstractNote": "La philosophie morale d&#8217;Alasdair MacIntyre repose sur une &#233;pist&#233;mologie ouvertement historiciste. L&#8217;historicisme est classiquement soup&#231;onn&#233; de se dissoudre en relativisme d&#232;s lors qu&#8217;il rejette toute pr&#233;tention &#224; un savoir absolu qui dirait le fin mot de l&#8217;histoire, mais la th&#232;se de MacIntyre maintient, en d&#233;pit d&#8217;un faillibilisme revendiqu&#233;, que les discours &#233;valuatifs peuvent &#234;tre soumis &#224; des normes de d&#233;cidabilit&#233; rationnellement justifiables. &#192; la lumi&#232;re des th&#232;ses corollaires de la rationalit&#233; des traditions et de l&#8217;ind&#233;termination constitutive des conceptions du bien, le pr&#233;sent article sugg&#232;re que l&#8217;historicisme de MacIntyre renouvelle, dans un cadre th&#233;orique alternatif &#224; celui de Kant, les principales caract&#233;ristiques d&#8217;une imp&#233;rativit&#233; morale cat&#233;gorique.",
				"issue": "4",
				"language": "fr",
				"libraryCatalog": "www.cairn.info",
				"pages": "43-58",
				"publicationTitle": "Revue d'ethique et de theologie morale",
				"shortTitle": "La philosophie morale d’Alasdair MacIntyre",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2019-4-page-43.htm",
				"volume": "304",
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
				"title": "Les Lettres nouvelles de Milan de Pierre Gringore : la propagande entre vers et prose",
				"creators": [
					{
						"firstName": "Ellen",
						"lastName": "Delvallée",
						"creatorType": "author"
					}
				],
				"date": "2020-11-30",
				"DOI": "https://doi.org/10.3917/rhren.091.0013",
				"ISSN": "1771-1347",
				"abstractNote": "Pierre Gringore compose les Lettres Nouvelles de Milan &#224; l&#8217;occasion de la capture de Ludovic Sforza en 1500. Le texte se pr&#233;sente comme un bulletin d&#8217;information, recueillant trois lettres en prose d&#233;taillant les &#233;v&#233;nements, puis des vers reprenant peu ou prou les m&#234;mes informations. Quelles valeurs rev&#234;tent prose et vers dans ce texte de propagande&#160;? Tandis que les lettres en prose offrent des t&#233;moignages de premi&#232;re main et garantissent une v&#233;rit&#233; factuelle, les vers fonctionnent comme une amplification encomiastique &#224; la gloire de la couronne de France mais aussi du po&#232;te qui cherche un m&#233;c&#232;ne. Par ailleurs, Gringore propose &#233;galement dans ses vers au style plus ou moins orn&#233; une r&#233;flexion sur le r&#244;le du po&#232;te pour &#233;tablir une v&#233;rit&#233; morale et la transmettre &#224; des publics vari&#233;s.\\n4207 Pierre Gringore writes the Lettres Nouvelles de Milan when Ludovico Sforza got caught in 1500. His text consists of a news report, gathering three prose letters explaining the events along with lines of verse giving more or less the same information. What are the values assumed by prose and verse in this work of propaganda? While prose letters provide with first-hand testimonies and guarantee factual truth, the lines of verse work as an encomiastic amplification, to the glory of the French crown but also of the poet himself, looking for a patron. Moreover, through his more or less ornated lines of verse, Gringore also offers a reflection upon the poet’s role to establish a moral truth and to transmit it to a diversified audience.",
				"issue": "2",
				"language": "fr",
				"libraryCatalog": "www.cairn.info",
				"pages": "13-30",
				"publicationTitle": "Reforme, Humanisme, Renaissance",
				"shortTitle": "Les Lettres nouvelles de Milan de Pierre Gringore",
				"url": "https://www.cairn.info/revue-reforme-humanisme-renaissance-2020-2-page-13.htm",
				"volume": "91",
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
				"title": "Éthiques animales : la double dissociation",
				"creators": [
					{
						"firstName": "Eric",
						"lastName": "Charmetant",
						"creatorType": "author"
					}
				],
				"date": "2020-10-02",
				"DOI": "https://doi.org/10.3917/retm.308.0011",
				"ISSN": "1266-0078",
				"abstractNote": "La constitution des &#233;thiques animales depuis le xixe&#160;si&#232;cle est marqu&#233;e par une double dissociation&#160;: premi&#232;rement, entre la militance contre la souffrance animale et la protection de la nature sauvage&#160;; deuxi&#232;mement, entre les diverses &#233;thiques animales acad&#233;miques et les &#233;thiques environnementales. Cette &#233;tude montrera comment cette dissociation s&#8217;est constitu&#233;e historiquement, quelles en sont les cons&#233;quences et comment la surmonter. Seul un d&#233;passement de la c&#233;sure radicale entre le sauvage et le domestique permet de fonder une &#233;thique qui soit animale et environnementale.",
				"issue": "2",
				"language": "fr",
				"libraryCatalog": "www.cairn.info",
				"pages": "11-22",
				"publicationTitle": "Revue d'ethique et de theologie morale",
				"shortTitle": "Éthiques animales",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-2-page-11.htm",
				"volume": "306",
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
				"title": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19 : un texte prémonitoire",
				"creators": [
					{
						"firstName": "Jean-Pierre",
						"lastName": "Sonnet",
						"creatorType": "author"
					}
				],
				"date": "2020-09-24",
				"DOI": "https://doi.org/10.3917/nrt.424.0529",
				"ISSN": "0029-4845",
				"abstractNote": "La crise du Covid-19 a &#233;t&#233; annonc&#233;e par des scientifiques clairvoyants. Bien avant eux, la Bible a fait entendre un avertissement qu&#8217;il s&#8217;agit d&#8217;entendre &#224; nouveau. En Gn&#160;1,28, le Dieu cr&#233;ateur institue Adam gardien des esp&#232;ces animales et fait de lui le garant de leur distinction. Loin d&#8217;&#234;tre une anthologie d&#8217;obscurantismes, la Bible est le pr&#233;cipit&#233; d&#8217;une sagesse imm&#233;moriale et proph&#233;tique&#160;; elle sait que le rapport de l&#8217;homme aux esp&#232;ces animales est un lieu redoutable, o&#249; se joue quelque chose du divin.\\n4207 The Covid-19 crisis was predicted by far-sighted scientists. Long before they did, the Bible sounded a warning that must be heard again. In Gen 1:28, the Creator God ordained Adam as the guardian of the animal species and made him the guarantor of their distinction. Far from being an anthology of obscurantism, the Bible is the precipitate of an immemorial and prophetic wisdom; it knows that man’s relationship with animal species is a awe-inspiring space, where something divine is at stake.",
				"issue": "4",
				"language": "fr",
				"libraryCatalog": "www.cairn.info",
				"pages": "529-541",
				"publicationTitle": "Nouvelle revue theologique",
				"shortTitle": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19",
				"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm?contenu=resume",
				"volume": "Tome 142",
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
						"tag": "Animal species"
					},
					{
						"tag": "Covid-19"
					},
					{
						"tag": "Covid-19"
					},
					{
						"tag": "Espèces animales"
					},
					{
						"tag": "Genesis 1"
					},
					{
						"tag": "Genèse 1"
					},
					{
						"tag": "Leviticus 11"
					},
					{
						"tag": "Lévitique 11"
					},
					{
						"tag": "Respect des distinctions"
					},
					{
						"tag": "Respecting distinctions"
					},
					{
						"tag": "Zoonose"
					},
					{
						"tag": "Zoonosis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
