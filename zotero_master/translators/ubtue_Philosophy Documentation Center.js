{
	"translatorID": "5e3f67c9-f4e5-4dc6-ad9a-93bf263a585a",
	"label": "ubtue_Philosophy Documentation Center",
	"creator": "Madeesh Kannan",
	"target": "^https://www.pdcnet.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-05 13:29:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

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
  if (url.includes('/jrv/')) {
	return "JournalArticle";
  } else
  if (url.includes('/collection-anonymous/')) {
	return "multiple";
  }
  return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "purchase", " " ))]');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let titles = ZU.trimInternal(rows[i].outerHTML);
		let title = titles.match(/Item_Title=.*&/)[0].split(';')[0].replace(/Item_Title=/, ''); //Z.debug(title)
		if (!href || !title) continue;
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
  } else
  {
	scrape(doc, url);
  }
}

function scrape(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.itemType = "journalArticle";
		//scrape ISSN
		let issnEntry = ZU.xpathText(doc, '//script[@type="text/javascript"]');
		if(issnEntry && issnEntry.match(/Online_ISSN/i)) i.ISSN = issnEntry.match(/Online_ISSN=\d{4}-\d{3}(\d|x)/i)[0].match(/\d{4}-\d{3}(\d|x)/i)[0];
		if(issnEntry && issnEntry.match(/Book Review/i)) i.tags.push('RezensionstagPica');
		i.complete();
	});
	translator.translate();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.pdcnet.org/philotheos/content/philotheos_2019_0019_0002_0149_0165",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Investigating the terms of transition from a dialogue to dialectics in Plato’s Charmides",
				"creators": [
					{
						"firstName": "Christos",
						"lastName": "Terezis",
						"creatorType": "author"
					}
				],
				"date": "2019/10/01",
				"DOI": "10.5840/philotheos20191928",
				"ISSN": "2620-0163",
				"abstractNote": "In this article, following the introductory chapters of the Platonic dialogue Charmides (153a1-154b7), we attempt to investigate the terms of transition from a simple dialogue to dialectics. Interpreting the expressive means used, we attempt to explain how Plato goes from historicity to systematicity, in order to create the appropriate conditions to build a definition about a fundamental virtue as well as to set the criteria to be followed in a philosophical debate. Our study is divided in two sections, each of which is also divided in two subsections. In the first section, we investigate the historical context of the dialogue and the terms of transition from a single dialogue to dialectics. In the second section, we attempt to define according to Socrates’ judgments the mental and moral quality of the young men as well as the terms and conditions of the right interlocutor. At the end of each section, we present a table of concepts to bring to light the conceptual structures that Plato builds, which reveal the philosophical development in this dialogue.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.pdcnet.org",
				"pages": "149-165",
				"publicationTitle": "Philotheos",
				"url": "https://www.pdcnet.org/pdc/bvdb.nsf/purchase?openform&fp=philotheos&id=philotheos_2019_0019_0002_0149_0165",
				"volume": "19",
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
		"url": "https://www.pdcnet.org/acpq/content/acpq_2021_0095_0002_0165_0194",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Individuation, Identity, and Resurrection in Thomas Jackson and John Locke",
				"creators": [
					{
						"firstName": "Jon W.",
						"lastName": "Thompson",
						"creatorType": "author"
					}
				],
				"date": "2021/04/30",
				"DOI": "10.5840/acpq202147222",
				"ISSN": "2153-8441",
				"abstractNote": "This paper outlines the views of two 17th century thinkers (Thomas Jackson and John Locke) on the question of the metaphysics of resurrection. I show that Jackson and Locke each depart from central 17th century Scholastic convictions regarding resurrection and philosophical anthropology (convictions laid out in section II). Each holds that matter or material continuity is not a plausible principle of diachronic individuation for living bodies such as human beings. Despite their rejection of the traditional view, they each provide a defence of the possibility of a personal afterlife. I outline these (quite different) defences in sections III–IV. I then argue (section V) that it is likely either that Locke had read Jackson on the issue of resurrection or that the two were influenced by a common source. I argue that matter might provide a suitable principle of diachronic individuation in both everyday cases of living bodies and in the case of resurrection.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.pdcnet.org",
				"pages": "165-194",
				"publicationTitle": "American Catholic Philosophical Quarterly",
				"url": "https://www.pdcnet.org/pdc/bvdb.nsf/purchase?openform&fp=acpq&id=acpq_2021_0095_0002_0165_0194",
				"volume": "95",
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
		"url": "https://www.pdcnet.org/acpq/content/acpq_2021_0095_0001_0155_0160",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "John Henry Newman on Truth and its Counterfeits: A Guide For Our Times. By Reinhard Hütter",
				"creators": [
					{
						"firstName": "Philip",
						"lastName": "Rolnick",
						"creatorType": "author"
					}
				],
				"date": "2021/02/23",
				"DOI": "10.5840/acpq20219516",
				"ISSN": "2153-8441",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "www.pdcnet.org",
				"pages": "155-160",
				"publicationTitle": "American Catholic Philosophical Quarterly",
				"shortTitle": "John Henry Newman on Truth and its Counterfeits",
				"url": "https://www.pdcnet.org/pdc/bvdb.nsf/purchase?openform&fp=acpq&id=acpq_2021_0095_0001_0155_0160",
				"volume": "95",
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
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
