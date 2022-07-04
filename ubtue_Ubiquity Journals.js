{
	"translatorID": "2b974bb4-e6a5-44b0-8a9e-730d57ab7115",
	"label": "ubtue_Ubiquity Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://[^/]+(/articles/10\\.\\d{4,9}/[-._;()/:a-z0-9A-Z]+|/articles/?$|/\\d+/volume/\\d+/issue/\\d+)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-04 15:19:12"
}

/*
	Ubiquiy Press Translator
	Copyright (C) 2015 Sebastian Karcher

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
*/
function detectWeb(doc, _url) {
	var ubiquitytest = doc.getElementsByClassName("press-logo");
	// this doesn't work always, so we're only using it on single items.
	// if the translator doesn't detect there, we still get good EM import
	// For multiples we check getSearchResults
	if (ubiquitytest[0] && ubiquitytest[0].href.includes("http://www.ubiquitypress.com")) {
		if (ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content')) {
			return "journalArticle";
		}
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	var itemType = detectWeb(doc, url);
	if (itemType === 'multiple') {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) return;
			var urls = [];
			for (var i in items) {
				urls.push(i);
			}
			ZU.processDocuments(urls, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function getSearchResults(doc, checkOnly) {
	var results = ZU.xpath(doc,
			'//div[@class="article-caption"]/div[@class="caption-text"]/a[contains(@href, "/articles/10.")]'
		),
		items = {},
		found = false;
	for (var i = 0; i < results.length; i++) {
		var title = results[i].textContent;
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		title = title.trim();
		items[results[i].href] = title;
	}
	return found ? items : false;
}

function scrape(doc, url) {
	var abstract = ZU.xpathText(doc, '//meta[@name="DC.Description"]/@content');
	var translator = Zotero.loadTranslator('web');
	// use the Embedded Metadata translator
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		if (abstract) {
			item.abstractNote = ZU.cleanTags(abstract.trim());
		}
		if (item.ISSN == "2053-6712") {
			item.notes.push("artikelID:" + item.pages);
			item.pages = "";
			item.issue = "";
		}
		for (let authorTag of ZU.xpath(doc, '//div[@class="author-block"]')) {
			if (ZU.xpathText(authorTag, './/a[@class="orcid"]') != null) {
				let orcid = ZU.xpathText(authorTag, './/a[@class="orcid"]/@href');
				let name = ZU.xpathText(authorTag, './/span[@class="author-hover"]');
				item.notes.push({note: name + ' | orcid:' + orcid.replace(/http:\/\/orcid.org\//, "") + ' | taken from website'});
			}
		}
		item.complete();
	});
	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ancient-asia-journal.com/articles/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.pediatricneurologybriefs.com/51/volume/29/issue/7/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://secularismandnonreligion.org/articles/10.5334/snr.151/#",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Advancing the Study of Nonreligion through Feminist Methods",
				"creators": [
					{
						"firstName": "Jordan C.",
						"lastName": "Reuter",
						"creatorType": "author"
					},
					{
						"firstName": "Colleen I.",
						"lastName": "Murray",
						"creatorType": "author"
					}
				],
				"date": "2022-02-04",
				"DOI": "10.5334/snr.151",
				"ISSN": "2053-6712",
				"abstractNote": "In the United States, nonreligious people face stigma, prejudice, and discrimination because they are viewed as immoral and distrustful. This is partly because of othering, by which nonreligious people are subjugated to a minority status. Othering also occurs in academic research and writing. Applying feminist principles can improve research about nonreligious populations. Grounded in results of a US-based online study, we recommend two feminist principles to facilitate the study of nonreligion: (1) rejecting othering of minority groups, and (2) intersectionality. As a result of applying these principles, the nuanced differences between nonreligious groups can be better understood and the complex identities of nonreligious people can be more accurately represented. Researchers benefit from increased accuracy and understanding of nonreligion via better informed theoretical and methodological decisions and nonreligious people benefit from their more accurate representation in academic research.",
				"language": "en",
				"libraryCatalog": "secularismandnonreligion.org",
				"publicationTitle": "Secularism and Nonreligion",
				"rights": "Authors who publish with this journal agree to the following terms:    Authors retain copyright and grant the journal right of first publication with the work simultaneously licensed under a  Creative Commons Attribution License  that allows others to share the work with an acknowledgement of the work's authorship and initial publication in this journal.  Authors are able to enter into separate, additional contractual arrangements for the non-exclusive distribution of the journal's published version of the work (e.g., post it to an institutional repository or publish it in a book), with an acknowledgement of its initial publication in this journal.  Authors are permitted and encouraged to post their work online (e.g., in institutional repositories or on their website) prior to and during the submission process, as it can lead to productive exchanges, as well as earlier and greater citation of published work (See  The Effect of Open Access ).  All third-party images reproduced on this journal are shared under Educational Fair Use. For more information on  Educational Fair Use , please see  this useful checklist prepared by Columbia University Libraries .   All copyright  of third-party content posted here for research purposes belongs to its original owners.  Unless otherwise stated all references to characters and comic art presented on this journal are ©, ® or ™ of their respective owners. No challenge to any owner’s rights is intended or should be inferred.",
				"url": "http://www.secularismandnonreligion.org/articles/10.5334/snr.151/",
				"volume": "11",
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
						"tag": "Nonreligion"
					},
					{
						"tag": "feminist methods"
					},
					{
						"tag": "intersectionality, epistemology"
					},
					{
						"tag": "mixed methods"
					}
				],
				"notes": [
					"artikelID:1",
					{
						"note": "Jordan C. Reuter | orcid:0000-0001-9405-5448 | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://secularismandnonreligion.org/10/volume/10/issue/1/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://secularismandnonreligion.org/11/volume/11/issue/1/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
