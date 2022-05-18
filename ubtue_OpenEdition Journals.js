{
	"translatorID": "55275811-58f4-4f5e-b711-a043f1fc50da",
	"label": "ubtue_OpenEdition Journals",
	"creator": "Madeesh Kannan",
	"target": "https?://journals.openedition.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-16 10:27:34"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen All rights reserved.

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
	if (getSearchResults(doc))
		return "multiple";
	else if (ZU.xpath(doc, '//h1[@id="docTitle"]').length === 1) {
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//li[contains(@class,"textes")]//div[@class="title"]//a')
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, item) {
		let abstracts = ZU.xpath(doc, '//p[@class="resume"]');
		if (abstracts) {
			abstracts = abstracts.map(x => x.textContent.trim());
			for (let i = 0; i < abstracts.length; ++i) {
				if (i == 0)
					item.abstractNote = abstracts[i];
				else
					item.notes.push({ note: "abs:" + abstracts[i] });
			}
		}

		item.tags = ZU.xpath(doc, '//div[@id="entries"]//div[@class="index ltr"]//a | //div[@id="entries"]//div[@class="index"]//a').map(x => x.textContent.trim());
		if (item.issue) {
			let issueAndVol = item.issue.match(/(\d+)\/(\d+)/);
			if (issueAndVol) {
				item.volume = issueAndVol[1];
				item.issue = issueAndVol[2];
			}
		}
		//issue number as volume
		if (item.issue && item.ISSN == '1972-2516') {
			item.volume = item.issue;
			delete item.issue;
		}
		
		if (['0335-5985'].includes(item.ISSN)) {
				item.abstractNote == '';
			let abstractTags = ZU.xpath(doc, '//meta[@name="description"]');
			for (let i in abstractTags) {
				if (i!=0) {
					item.abstractNote += "\\n4207 ";
				}
				item.abstractNote += abstractTags[i].content;
			}
			}
		let section = ZU.xpathText(doc, '//div[contains(@class, "souspartie")]//span[@class="title"]');
		if (section && section.match(/Recensions/))
			item.tags.push("Book Review");

		item.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else
		invokeEmbeddedMetadataTranslator(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://journals.openedition.org/assr/51741",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Du pain et du blé à crédit. Les monts-de-piété frumentaires dans les communautés rurales de la Sierra de Alcaraz (Nouvelle-Castille, xviie-xviiie siècles)",
				"creators": [
					{
						"firstName": "Marie-Lucie",
						"lastName": "Copete",
						"creatorType": "author"
					}
				],
				"date": "2020/10/22",
				"DOI": "10.4000/assr.51741",
				"ISSN": "0335-5985",
				"abstractNote": "Les monts-de-piété frumentaires sont des protobanques de l’époque moderne qui octroient des prêts en céréales, en semences et en pain aux paysans castillans contre un intérêt modéré de 3 à 4 %. Leurs comptabilités ont été conservées pour la région de la Sierra de Alcaraz en Nouvelle-Castille, espace qui se caractérise par une forte polarisation sociale et la présence massive de journaliers et de serviteurs agricoles en raison d’une répartition très inégalitaire de la terre. Les documents montrent que les monts fonctionnent comme des organismes collectifs dans le cadre d’une économie morale dans laquelle le microcrédit fait partie des multiples recours qui permettent de souder la communauté et de compenser les inégalités sociales et les liens de dépendance. Leurs patrons sont des curés de paroisse qui participent à leur gestion aux côtés de la bourgeoisie agraire qui monopolise les charges municipales. Les uns et les autres ne contrôlent pas seulement le crédit mais aussi le marché des céréales.Les monts-de-piété frumentaires sont des protobanques de l’époque moderne qui octroient des prêts en céréales, en semences et en pain aux paysans castillans contre un intérêt modéré de 3 à 4 %. Leurs comptabilités ont été conservées pour la région de la Sierra de Alcaraz en Nouvelle-Castille, espace qui se caractérise par une forte polarisation sociale et la présence massive de journaliers et de serviteurs agricoles en raison d’une répartition très inégalitaire de la terre. Les documents montrent que les monts fonctionnent comme des organismes collectifs dans le cadre d’une économie morale dans laquelle le microcrédit fait partie des multiples recours qui permettent de souder la communauté et de compenser les inégalités sociales et les liens de dépendance. Leurs patrons sont des curés de paroisse qui participent à leur gestion aux côtés de la bourgeoisie agraire qui monopolise les charges municipales. Les uns et les autres ne contrôlent pas seulement le crédit mais aussi le marché des céréales. \\n4207 In early modern Europe, food pawnshops were protobanks that lent cereals, seeds and bread to Castilian peasants for a moderate rate of interest of three or four per cent. The accounts of these institutions are available from the Sierra de Alcaraz, in New-Castile, a zone characterized by sharp social polarization and the massive presence of agricultural day-labourers and servants due to a very inegalitarian land distribution. These documents show that the pawnshops acted as collective organisms in the framework of a moral economy in which microcredit was one of various solutions meant to consolidate the community and compensate for social inequalities and ties of dependency. The pawnshops were in the hands of parish priests, who shared their management with the agrarian elite that monopolized the municipal administrations. Both controlled not only the credit but also the cereal market. \\n4207 Los montes de piedad frumentarios - pósitos o alhoríes - de la edad moderna son protobancos que prestaban cereales, simiente y pan a los campesinos castellanos a cambio de un interés moderado del 3 o 4 %. Se conservan las contabilidades de esos organismos para la región de la Sierra de Alcaraz en Castilla-La Nueva. Ese territorio se caracteriza por una fuerte polarización social y una gran cantidad de jornaleros y mozos sirvientes, lo que se explica por el reparto muy desigual de la tierra. Los documentos indican que esos pósitos funcionaban como órganos colectivos en el marco de una economía moral en la que el microcrédito era uno de los múltiples recursos que cohesionaban a la comunidad y compensaban las desigualdades sociales y la dependencia. Sus patronos eran los curas de las parroquias que gestionaban dichos pósitos junto a miembros de la burguesía agraria que también monopolizaba los cargos municipales. Unos y otros controlaban no sólo el mercado crediticio sino también el de cereales.",
				"issue": "191",
				"language": "fr",
				"libraryCatalog": "journals.openedition.org",
				"pages": "67-87",
				"publicationTitle": "Archives de sciences sociales des religions",
				"rights": "© Archives de sciences sociales des religions",
				"url": "http://journals.openedition.org/assr/51741",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Castilla-la-Nueva"
					},
					{
						"tag": "New Castile"
					},
					{
						"tag": "Nouvelle-Castille"
					},
					{
						"tag": "economía moral"
					},
					{
						"tag": "microcredit"
					},
					{
						"tag": "microcrédit"
					},
					{
						"tag": "microcrédito"
					},
					{
						"tag": "montes de piedad/pósitos"
					},
					{
						"tag": "monts-de-piété"
					},
					{
						"tag": "moral economy"
					},
					{
						"tag": "pauvreté"
					},
					{
						"tag": "pawnshop"
					},
					{
						"tag": "pobreza"
					},
					{
						"tag": "poverty"
					},
					{
						"tag": "économie morale"
					}
				],
				"notes": [
					{
						"note": "abs:In early modern Europe, food pawnshops were protobanks that lent cereals, seeds and bread to Castilian peasants for a moderate rate of interest of three or four per cent. The accounts of these institutions are available from the Sierra de Alcaraz, in New-Castile, a zone characterized by sharp social polarization and the massive presence of agricultural day-labourers and servants due to a very inegalitarian land distribution. These documents show that the pawnshops acted as collective organisms in the framework of a moral economy in which microcredit was one of various solutions meant to consolidate the community and compensate for social inequalities and ties of dependency. The pawnshops were in the hands of parish priests, who shared their management with the agrarian elite that monopolized the municipal administrations. Both controlled not only the credit but also the cereal market."
					},
					{
						"note": "abs:Los montes de piedad frumentarios - pósitos o alhoríes - de la edad moderna son protobancos que prestaban cereales, simiente y pan a los campesinos castellanos a cambio de un interés moderado del 3 o 4 %. Se conservan las contabilidades de esos organismos para la región de la Sierra de Alcaraz en Castilla-La Nueva. Ese territorio se caracteriza por una fuerte polarización social y una gran cantidad de jornaleros y mozos sirvientes, lo que se explica por el reparto muy desigual de la tierra. Los documentos indican que esos pósitos funcionaban como órganos colectivos en el marco de una economía moral en la que el microcrédito era uno de los múltiples recursos que cohesionaban a la comunidad y compensaban las desigualdades sociales y la dependencia. Sus patronos eran los curas de las parroquias que gestionaban dichos pósitos junto a miembros de la burguesía agraria que también monopolizaba los cargos municipales. Unos y otros controlaban no sólo el mercado crediticio sino también el de cereales."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.openedition.org/assr/51596",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journals.openedition.org/mythos/3818",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Immagini religiose nel mondo romano. Nove saggi",
				"creators": [
					{
						"firstName": "Claudia",
						"lastName": "Beltrão",
						"creatorType": "author"
					},
					{
						"firstName": "Federico",
						"lastName": "Santangelo",
						"creatorType": "author"
					}
				],
				"date": "2021/12/15",
				"ISSN": "1972-2516",
				"abstractNote": "Qual è il ruolo delle immagini nelle dinamiche religiose, e come occorre valutarne l’importanza? Creare l’immagine di una divinità o renderla visibile ha un impatto sulla prassi, sulla devozione religiosa e sulla più vasta riflessione che le accompagna e le sostiene; conferisce inoltre all’essere divino un grado di presenza nella dimensione materiale. Il linguaggio delle immagini, gli elementi iconografici, le concezioni spaziali e l’uso stesso dello spazio creano modalità di visibilità, di p...",
				"language": "it",
				"libraryCatalog": "journals.openedition.org",
				"publicationTitle": "Mythos. Rivista di Storia delle Religioni",
				"rights": "Mythos",
				"url": "http://journals.openedition.org/mythos/3818",
				"volume": "15",
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
	}
]
/** END TEST CASES **/
