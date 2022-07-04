{
	"translatorID": "45c7c5b1-0aef-4728-8fda-c41c234993a4",
	"label": "ubtue_Cambridge Core",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.cambridge\\.org/core/(search\\?|journals/|books/|.+/listing?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-04 15:56:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016-2020 Sebastian Karcher

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
	let multiples = /\/search\?|\/listing\?|\/issue\//;
	if (multiples.test(url) && getSearchResults(doc, true)) {
		return "multiple";
	}
	if (url.includes('/article/')) {
		return "journalArticle";
	}
	if (url.includes('/books/')) {
		if (doc.getElementsByClassName('chapter-wrapper').length > 0) {
			return "bookSection";
		}
		else return "book";
	}

	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc,
		'//li[@class="title"]//a[contains(@href, "/article/") or contains(@href, "/product/") or contains(@href, "/books/")]'
	);
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function addOpenAccessTag (doc, item) {
	let tagEntry = ZU.xpathText(doc, '//span[@class="open-access"]');
	if (tagEntry && tagEntry.match(/Open Access/i)) {
		item.notes.push('LF:');
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	// Book metadata is much better using RIS
	if (detectWeb(doc, url) == "book" || detectWeb(doc, url) == "bookSection") {
		let productID = url.replace(/[#?].+/, "").match(/\/([^/]+)$/)[1];
		let risURL
			= "/core/services/aop-easybib/export?exportType=ris&productIds="
			+ productID + "&citationStyle=apa";
		// Z.debug(risURL);
		// the attribute sometimes has a space in it, so testing for contains
		var pdfURL = ZU.xpathText(doc,
			'//meta[contains(@name, "citation_pdf_url")]/@content'
		);
		// Z.debug("pdfURL: " + pdfURL);
		ZU.doGet(risURL, function (text) {
			var translator = Zotero.loadTranslator(
				"import");
			translator.setTranslator(
				"32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj,
				item) {
				if (pdfURL) {
					item.attachments.push({
						url: pdfURL,
						title: "Full Text PDF",
						mimeType: "application/pdf"
					});
				}
				item.attachments.push({
					title: "Snapshot",
					document: doc
				});
				// don't save Cambridge Core to archive
				item.archive = "";
				item.complete();
			});
			translator.translate();
		});
	}
	// Some elements of journal citations look better with EM
	else {
		var translator = Zotero.loadTranslator('web');
		// Embedded Metadata
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
		translator.setHandler('itemDone', function (obj, item) {
			item.url = url;
			var abstract = ZU.xpathText(doc,
				'//div[@class="abstract"]');
			if (abstract) {
				item.abstractNote = abstract;
			}
			//delete abstract e.g. //static.cambridge.org...
			if (item.abstractNote.includes('static.cambridge')) delete item.abstractNote;
			
			item.title = ZU.unescapeHTML(item.title);
			item.libraryCatalog = "Cambridge University Press";
			addOpenAccessTag(doc, item);
			let orcid_tags = ZU.xpath(doc, '//a[@class="app-link contributor-type__contributor__orcid app-link__icon app-link--"]');
			for (let o in orcid_tags) {
				let orcid = orcid_tags[o].href;
				if (orcid != null) {
					let author = ZU.xpathText(orcid_tags[o], './/@data-test-orcid');
					orcid = orcid.replace("https://orcid.org/", "");
					item.notes.push({note: "orcid:" + orcid + ' | ' + author});
				}
				
			}
			if (item.pages) {
				if (item.pages.split('-')[0] == item.pages.split('-')[1]) item.pages = item.pages.split('-')[0];
			}
			if (ZU.xpathText(doc, '//dd[@class="col content" and contains(., "Book Review")]') != null) {
				item.tags.push("RezensionstagPica");
			}
			item.complete();
		});

		translator.getTranslatorObject(function (trans) {
			if (url.includes("/books")) {
				trans.itemType = "book";
			}
			else {
				trans.itemType = "journalArticle";
			}
			trans.doWeb(doc, url);
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/journals/journal-of-american-studies/article/samo-as-an-escape-clause-jean-michel-basquiats-engagement-with-a-commodified-american-africanism/1E4368D610A957B84F6DA3A58B8BF164",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“SAMO© as an Escape Clause”: Jean-Michel Basquiat's Engagement with a Commodified American Africanism",
				"creators": [
					{
						"firstName": "Laurie A.",
						"lastName": "Rodrigues",
						"creatorType": "author"
					}
				],
				"date": "2011/05",
				"DOI": "10.1017/S0021875810001738",
				"ISSN": "1469-5154, 0021-8758",
				"abstractNote": "Heir to the racist configuration of the American art exchange and the delimiting appraisals of blackness in the American mainstream media, Jean-Michel Basquiat appeared on the late 1970s New York City street art scene – then he called himself “SAMO.” Not long thereafter, Basquiat grew into one of the most influential artists of an international movement that began around 1980, marked by a return to figurative painting. Given its rough, seemingly untrained and extreme, conceptual nature, Basquiat's high-art oeuvre might not look so sophisticated to the uninformed viewer. However, Basquiat's work reveals a powerful poetic and visual gift, “heady enough to confound academics and hip enough to capture the attention span of the hip hop nation,” as Greg Tate has remarked. As noted by Richard Marshall, Basquiat's aesthetic strength actually comes from his striving “to achieve a balance between the visual and intellectual attributes” of his artwork. Like Marshall, Tate, and others, I will connect with Basquiat's unique, self-reflexively experimental visual practices of signifying and examine anew Basquiat's active contribution to his self-alienation, as Hebdige has called it. Basquiat's aesthetic makes of his paintings economies of accumulation, building a productive play of contingency from the mainstream's constructions of race. This aesthetic move speaks to a need for escape from the perceived epistemic necessities of blackness. Through these economies of accumulation we see, as Tate has pointed out, Basquiat's “intellectual obsession” with issues such as ancestry/modernity, personhood/property and originality/origins of knowledge, driven by his tireless need to problematize mainstream media's discourses surrounding race – in other words, a commodified American Africanism.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "227-243",
				"publicationTitle": "Journal of American Studies",
				"shortTitle": "“SAMO© as an Escape Clause”",
				"url": "https://www.cambridge.org/core/journals/journal-of-american-studies/article/samo-as-an-escape-clause-jean-michel-basquiats-engagement-with-a-commodified-american-africanism/1E4368D610A957B84F6DA3A58B8BF164",
				"volume": "45",
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
		"url": "https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/high-resolution-simulations-of-cylindrical-density-currents/30D62864BDED84A6CC81F5823950767B",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "High-resolution simulations of cylindrical density currents",
				"creators": [
					{
						"firstName": "Mariano I.",
						"lastName": "Cantero",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Balachandar",
						"creatorType": "author"
					},
					{
						"firstName": "Marcelo H.",
						"lastName": "Garcia",
						"creatorType": "author"
					}
				],
				"date": "2007/11",
				"DOI": "10.1017/S0022112007008166",
				"ISSN": "1469-7645, 0022-1120",
				"abstractNote": "Three-dimensional highly resolved simulations are presented for cylindrical density currents using the Boussinesq approximation for small density difference. Three Reynolds numbers (Re) are investigated (895, 3450 and 8950, which correspond to values of the Grashof number of 105, 1.5 × 106 and 107, respectively) in order to identify differences in the flow structure and dynamics. The simulations are performed using a fully de-aliased pseudospectral code that captures the complete range of time and length scales of the flow. The simulated flows present the main features observed in experiments at large Re. As the current develops, it transitions through different phases of spreading, namely acceleration, slumping, inertial and viscous Soon after release the interface between light and heavy fluids rolls up forming Kelvin–Helmholtz vortices. The formation of the first vortex sets the transition between acceleration and slumping phases. Vortex formation continues only during the slumping phase and the formation of the last Kelvin–Helmholtz vortex signals the departure from the slumping phase. The coherent Kelvin–Helmholtz vortices undergo azimuthal instabilities and eventually break up into small-scale turbulence. In the case of planar currents this turbulent region extends over the entire body of the current, while in the cylindrical case it only extends to the regions of Kelvin–Helmholtz vortex breakup. The flow develops three-dimensionality right from the beginning with incipient lobes and clefts forming at the lower frontal region. These instabilities grow in size and extend to the upper part of the front. Lobes and clefts continuously merge and split and result in a complex pattern that evolves very dynamically. The wavelength of the lobes grows as the flow spreads, while the local Re of the flow decreases. However, the number of lobes is maintained over time. Owing to the high resolution of the simulations, we have been able to link the lobe and cleft structure to local flow patterns and vortical structures. In the near-front region and body of the current several hairpin vortices populate the flow. Laboratory experiments have been performed at the higher Re and compared to the simulation results showing good agreement. Movies are available with the online version of the paper.",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "437-469",
				"publicationTitle": "Journal of Fluid Mechanics",
				"url": "https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/high-resolution-simulations-of-cylindrical-density-currents/30D62864BDED84A6CC81F5823950767B",
				"volume": "590",
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
						"tag": "Gravity currents"
					},
					{
						"tag": "Vortex breakdown"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/journals/american-political-science-review/issue/F6F2E8238A6D139A91D343A62AB2CECC",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/making-a-difference-in-conservation-linking-science-and-policy/C8B7353BFDD77E0C1A16A61C07E44977",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Making a difference in conservation: linking science and policy",
				"creators": [
					{
						"lastName": "Vickery",
						"firstName": "Juliet A.",
						"creatorType": "editor"
					},
					{
						"lastName": "Ockendon",
						"firstName": "Nancy",
						"creatorType": "editor"
					},
					{
						"lastName": "Pettorelli",
						"firstName": "Nathalie",
						"creatorType": "editor"
					},
					{
						"lastName": "Brotherton",
						"firstName": "Peter N. M.",
						"creatorType": "editor"
					},
					{
						"lastName": "Sutherland",
						"firstName": "William J.",
						"creatorType": "editor"
					},
					{
						"lastName": "Davies",
						"firstName": "Zoe G.",
						"creatorType": "editor"
					},
					{
						"lastName": "Sutherland",
						"firstName": "William J.",
						"creatorType": "author"
					},
					{
						"lastName": "Brotherton",
						"firstName": "Peter N. M.",
						"creatorType": "author"
					},
					{
						"lastName": "Ockendon",
						"firstName": "Nancy",
						"creatorType": "author"
					},
					{
						"lastName": "Pettorelli",
						"firstName": "Nathalie",
						"creatorType": "author"
					},
					{
						"lastName": "Vickery",
						"firstName": "Juliet A.",
						"creatorType": "author"
					},
					{
						"lastName": "Davies",
						"firstName": "Zoe G.",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9781108714587",
				"abstractNote": "Jamie Gundry’s dramatic image of a white-tailed eagle (Haliaeetus albicilla) on the cover of this book reflects the twisting changes in fortune experienced by this species, with a revival that can be attributed to a successful interplay of science, policy and practice. White-tailed eagles were historically much more widely distributed than they are today (Yalden, 2007), once breeding across much of Europe, but by the early twentieth century the species was extinct across much of western and southern Europe. The main cause of its decline was persecution by farmers and shepherds, who considered the eagles a threat to their livestock, but, along with other raptors, white-tailed eagles were also seriously affected by DDT in the 1960s and 1970s, which had disastrous effects on the breeding success of remaining populations.",
				"bookTitle": "Conservation Research, Policy and Practice",
				"extra": "DOI: 10.1017/9781108638210.001",
				"libraryCatalog": "Cambridge University Press",
				"pages": "3-8",
				"place": "Cambridge",
				"publisher": "Cambridge University Press",
				"series": "Ecological Reviews",
				"shortTitle": "Making a difference in conservation",
				"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/making-a-difference-in-conservation-linking-science-and-policy/C8B7353BFDD77E0C1A16A61C07E44977",
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
		"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
		"items": [
			{
				"itemType": "book",
				"title": "Conservation Research, Policy and Practice",
				"creators": [
					{
						"lastName": "Sutherland",
						"firstName": "William J.",
						"creatorType": "editor"
					},
					{
						"lastName": "Brotherton",
						"firstName": "Peter N. M.",
						"creatorType": "editor"
					},
					{
						"lastName": "Davies",
						"firstName": "Zoe G.",
						"creatorType": "editor"
					},
					{
						"lastName": "Ockendon",
						"firstName": "Nancy",
						"creatorType": "editor"
					},
					{
						"lastName": "Pettorelli",
						"firstName": "Nathalie",
						"creatorType": "editor"
					},
					{
						"lastName": "Vickery",
						"firstName": "Juliet A.",
						"creatorType": "editor"
					}
				],
				"date": "2020",
				"ISBN": "9781108714587",
				"abstractNote": "Conservation research is essential for advancing knowledge but to make an impact scientific evidence must influence conservation policies, decision making and practice. This raises a multitude of challenges. How should evidence be collated and presented to policymakers to maximise its impact? How can effective collaboration between conservation scientists and decision-makers be established? How can the resulting messages be communicated to bring about change? Emerging from a successful international symposium organised by the British Ecological Society and the Cambridge Conservation Initiative, this is the first book to practically address these questions across a wide range of conservation topics. Well-renowned experts guide readers through global case studies and their own experiences. A must-read for practitioners, researchers, graduate students and policymakers wishing to enhance the prospect of their work 'making a difference'. This title is also available as Open Access on Cambridge Core.",
				"extra": "DOI: 10.1017/9781108638210",
				"libraryCatalog": "Cambridge University Press",
				"place": "Cambridge",
				"publisher": "Cambridge University Press",
				"series": "Ecological Reviews",
				"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
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
		"url": "https://www.cambridge.org/core/what-we-publish/books/listing?sort=canonical.date%3Adesc&aggs%5BonlyShowAvailable%5D%5Bfilters%5D=true&aggs%5BproductTypes%5D%5Bfilters%5D=BOOK%2CELEMENT&searchWithinIds=0C5182F27A492FDC81EDF8D3C53266B5",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/journals/journal-of-ecclesiastical-history/article/cashaway-psalmody-transatlantic-religion-and-music-in-colonial-carolina-by-stephen-a-marini-music-in-american-life-pp-xii-466-incl-42-ills-1-map-and-7-tables-chicago-university-of-illinois-press-2020-54-978-0-252-04284-3/4F35B5C0F70F6D5F6438883DB6B16A2A",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Cashaway psalmody. Transatlantic religion and music in colonial Carolina. By Stephen A. Marini. (Music in American Life.) Pp. xii + 466 incl. 42 ills, 1 map and 7 tables. Chicago: University of Illinois Press, 2020. £54. 978 0 252 04284 3",
				"creators": [
					{
						"firstName": "Tim",
						"lastName": "Duguid",
						"creatorType": "author"
					}
				],
				"date": "2021/07",
				"DOI": "10.1017/S0022046921000403",
				"ISSN": "0022-0469, 1469-7637",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "677-678",
				"publicationTitle": "The Journal of Ecclesiastical History",
				"shortTitle": "The Cashaway psalmody. Transatlantic religion and music in colonial Carolina. By Stephen A. Marini. (Music in American Life.) Pp. xii + 466 incl. 42 ills, 1 map and 7 tables. Chicago",
				"url": "https://www.cambridge.org/core/journals/journal-of-ecclesiastical-history/article/cashaway-psalmody-transatlantic-religion-and-music-in-colonial-carolina-by-stephen-a-marini-music-in-american-life-pp-xii-466-incl-42-ills-1-map-and-7-tables-chicago-university-of-illinois-press-2020-54-978-0-252-04284-3/4F35B5C0F70F6D5F6438883DB6B16A2A",
				"volume": "72",
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
		"url": "https://www.cambridge.org/core/journals/religious-studies/article/new-epistemological-case-for-theism/2DB0673A95B5D023B187B77071E7C93C",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A new epistemological case for theism",
				"creators": [
					{
						"firstName": "Christophe De",
						"lastName": "Ray",
						"creatorType": "author"
					}
				],
				"date": "2022/06",
				"DOI": "10.1017/S0034412520000529",
				"ISSN": "0034-4125, 1469-901X",
				"abstractNote": "Relying on inference to the best explanation (IBE) requires one to hold the intuition that the world is ‘intelligible’, that is, such that states of affairs at least generally have explanations for their obtaining. I argue that metaphysical naturalists are rationally required to withhold this intuition, unless they cease to be naturalists. This is because all plausible naturalistic aetiologies of the intuition entail that the intuition and the state of affairs which it represents are not causally connected in an epistemically appropriate way. Given that one ought to rely on IBE, naturalists are forced to pick the latter and change their world-view. Traditional theists, in contrast, do not face this predicament. This, I argue, is strong grounds for preferring traditional theism to naturalism.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "379-400",
				"publicationTitle": "Religious Studies",
				"url": "https://www.cambridge.org/core/journals/religious-studies/article/new-epistemological-case-for-theism/2DB0673A95B5D023B187B77071E7C93C",
				"volume": "58",
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
				"notes": [
					"LF:",
					{
						"note": "orcid:0000-0002-0540-8000 | CHRISTOPHE DE RAY"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/journals/church-history/article/literary-echoes-of-the-fourth-lateran-council-in-england-and-france-12151405-edited-by-maureen-b-m-boulton-papers-in-mediaeval-studies-31-toronto-pontifical-institute-of-mediaeval-studies-2019-x-322-pp-9500-cloth/B5484BE8F944D1042F200A91F4F1EBF1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Literary Echoes of the Fourth Lateran Council in England and France, 1215–1405. Edited by Maureen B. M. Boulton. Papers in Mediaeval Studies 31. Toronto: Pontifical Institute of Mediaeval Studies, 2019. x + 322 pp. $95.00 cloth.",
				"creators": [
					{
						"firstName": "Richard",
						"lastName": "Newhauser",
						"creatorType": "author"
					}
				],
				"date": "2021/09",
				"DOI": "10.1017/S0009640721002407",
				"ISSN": "0009-6407, 1755-2613",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "681",
				"publicationTitle": "Church History",
				"shortTitle": "Literary Echoes of the Fourth Lateran Council in England and France, 1215–1405. Edited by Maureen B. M. Boulton. Papers in Mediaeval Studies 31. Toronto",
				"url": "https://www.cambridge.org/core/journals/church-history/article/literary-echoes-of-the-fourth-lateran-council-in-england-and-france-12151405-edited-by-maureen-b-m-boulton-papers-in-mediaeval-studies-31-toronto-pontifical-institute-of-mediaeval-studies-2019-x-322-pp-9500-cloth/B5484BE8F944D1042F200A91F4F1EBF1",
				"volume": "90",
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
		"url": "https://www.cambridge.org/core/journals/church-history/article/when-the-canaanite-conquest-met-the-enlightenment-how-christian-apologists-of-the-english-enlightenment-harmonized-the-biblical-canaanite-conquest-with-the-moral-values-of-the-eighteenth-century/B6F5369FA32050606052C4F38C6380FF",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "When the Canaanite Conquest Met the Enlightenment: How Christian Apologists of the English Enlightenment Harmonized the Biblical Canaanite Conquest with the Moral Values of the Eighteenth Century",
				"creators": [
					{
						"firstName": "Daniel K.",
						"lastName": "Williams",
						"creatorType": "author"
					}
				],
				"date": "2021/09",
				"DOI": "10.1017/S0009640721002146",
				"ISSN": "0009-6407, 1755-2613",
				"abstractNote": "This article examines British and American Christian apologists’ reinterpretation of the biblical account of the Canaanite conquest in response to concerns about natural rights and ethical behavior that emerged from the English Enlightenment. Because of Enlightenment-era assumptions about universal rights, a new debate emerged in Britain and America in the eighteenth century about whether the divine order for the biblical Israelites to slaughter the Canaanites was morally right. The article argues that intellectually minded Christians’ appropriation of Enlightenment values to reframe their interpretation of the biblical narrative (often in response to skeptical attacks from writers classified as deists) demonstrates that in the English-speaking world, Enlightenment rationalism and Christian orthodoxy frequently reinforced each other and were not opposing forces. Though many orthodox Christians repudiated traditional Calvinist interpretations of the biblical Canaanite conquest, they defended the authority of the biblical narrative by drawing on Enlightenment-era assumptions about natural rights to provide justifications for what some skeptics considered morally objectionable divine orders in the Bible. By doing so, they set the framework for the continued synthesis of natural rights and rationality with a biblically centered Protestantism in the early nineteenth-century English-speaking world and especially in the United States.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "579-602",
				"publicationTitle": "Church History",
				"shortTitle": "When the Canaanite Conquest Met the Enlightenment",
				"url": "https://www.cambridge.org/core/journals/church-history/article/when-the-canaanite-conquest-met-the-enlightenment-how-christian-apologists-of-the-english-enlightenment-harmonized-the-biblical-canaanite-conquest-with-the-moral-values-of-the-eighteenth-century/B6F5369FA32050606052C4F38C6380FF",
				"volume": "90",
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
						"tag": "Christian Apologetics"
					},
					{
						"tag": "Deism"
					},
					{
						"tag": "History of biblical studies"
					},
					{
						"tag": "Religion in the Englightenment"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
