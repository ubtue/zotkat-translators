{
	"translatorID": "68643a57-3182-4e27-b34a-326347044d89",
	"label": "ubtue_Oxford Academic",
	"creator": "Madeesh Kannan",
	"target": "^https?://academic.oup.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-22 14:46:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

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
	if (url.match(/\/issue\/[0-9]+\/[0-9]+/))
		return "multiple";
	else if (url.match(/\/article\/[0-9]+\/[0-9]+/)) {
		// placeholder, actual type determined by the embedded metadata translator
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, "//div[contains(@class, 'al-article-items')]/h5[contains(@class, 'item-title')]/a")
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		// update abstract from the webpage as the embedded data is often incomplete
		var abstractText = ZU.xpathText(doc, '//section[@class="abstract"]');
		if (abstractText) i.abstractNote = abstractText;
		var tagreview = ZU.xpathText(doc, '//*[(@id = "ContentTab")]//a')
		if (tagreview.match(/Reviews|Book Reviews/i)) delete i.abstractNote;
		if (tagreview.match(/Reviews|Book Reviews/i)) i.tags.push('RezensionstagPica');
		if (ZU.xpathText(doc, '//i[@class="icon-availability_open"]/@title') != null) {
			if (ZU.xpathText(doc, '//i[@class="icon-availability_open"]/@title').match(/open access/i)) {
				i.notes.push("LF:");
			}
		}
		else if (ZU.xpathText(doc, '//i[@class="icon-availability_free"]/@title') != null) {
			if (ZU.xpathText(doc, '//i[@class="icon-availability_free"]/@title').match(/free/i)) {
				i.notes.push("LF:");
			}
		}
		let orcid = 'lala';
		let author_information_tags = ZU.xpath(doc, '//div[contains(@class,"authorInfo_OUP_ArticleTop_Info_Widget")]');
		for (let a = 0; a < author_information_tags.length; a++) {
			if (ZU.xpathText(author_information_tags[a], './/div[@class="info-card-location"]') != null) {
				let orcid = ZU.xpathText(author_information_tags[a], './/div[@class="info-card-location"]').trim();
				orcid = orcid.replace('https://orcid.org/', '');
				let author = ZU.xpathText(author_information_tags[a], './/div[@class="info-card-name"]').trim();
				i.notes.push({note: "orcid:" + orcid + ' | ' + author});
			}
		}
		if (ZU.xpathText(doc, '//div[contains(@class, "pub-date")]')) {
			if (ZU.xpathText(doc, '//div[contains(@class, "pub-date")]').match(/\d{4}/)) {
				i.date = ZU.xpathText(doc, '//div[contains(@class, "pub-date")]').match(/\d{4}/)[0];
			}
		}
		i.url = i.url.match(/dx.doi.org/) && i.DOI ? "" : i.url;
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
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
		"url": "https://academic.oup.com/jss/article/65/1/245/5738633",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nevada Levi Delapp, Theophanic “Type-Scenes” in the Pentateuch: Visions of YHWH",
				"creators": [
					{
						"firstName": "George",
						"lastName": "Savran",
						"creatorType": "author"
					}
				],
				"date": "2020/04/01",
				"DOI": "10.1093/jss/fgz049",
				"ISSN": "0022-4480",
				"issue": "1",
				"journalAbbreviation": "J Semit Stud",
				"language": "en",
				"libraryCatalog": "academic.oup.com",
				"pages": "245-246",
				"publicationTitle": "Journal of Semitic Studies",
				"shortTitle": "Nevada Levi Delapp, Theophanic “Type-Scenes” in the Pentateuch",
				"url": "https://academic.oup.com/jss/article/65/1/245/5738633",
				"volume": "65",
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
	},
	{
		"type": "web",
		"url": "https://academic.oup.com/bjc/article/64/2/275/7226326",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Rescuing women from the brinks of whiteness: Carceral restoration in a human trafficking court",
				"creators": [
					{
						"firstName": "Rashmee",
						"lastName": "Singh",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"DOI": "10.1093/bjc/azad030",
				"ISSN": "0007-0955",
				"abstractNote": "Research on gender-specific penal reform programs critique their failure to prioritize the socio-economic recovery of criminalized women. This paper draws on these insights to examine the Women’s Refuge Court (WRC), a human trafficking court for adult women criminalized for prostitution and drug offences in Ohio. Using ethnographic research, I illustrate the WRC’s rejection of bootstrapping and emphasis on material resourcing as a penal reform strategy. I argue that the WRC’s prioritization of socio-economic recovery derives from fears over the status decline of the impoverished white women who predominate as defendants. Court officials rely on evangelical Christian imaginings of prostitution as ‘modern day slavery’ to frame participants as ‘trafficking victims’. I identify the WRC’s response as a racially specific form of gender responsive programming called carceral restoration.",
				"issue": "2",
				"journalAbbreviation": "Br J Criminol",
				"language": "en",
				"libraryCatalog": "academic.oup.com",
				"pages": "275-291",
				"publicationTitle": "The British Journal of Criminology",
				"shortTitle": "Rescuing women from the brinks of whiteness",
				"volume": "64",
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
		"url": "https://academic.oup.com/ijtj/article/17/2/192/7174226",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Between Impunity and Justice? Exploring Stakeholders’ Perceptions of Colombia’s Special Sanctions (Sanciones Propias) for International Crimes",
				"creators": [
					{
						"firstName": "Beatriz E.",
						"lastName": "Mayans-Hermida",
						"creatorType": "author"
					},
					{
						"firstName": "Barbora",
						"lastName": "Holá",
						"creatorType": "author"
					},
					{
						"firstName": "Catrien",
						"lastName": "Bijleveld",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.1093/ijtj/ijad009",
				"ISSN": "1752-7716",
				"abstractNote": "The peace agreement signed by the Colombian government and the FARC has an innovative sanctioning regime which, based on a restorative approach, offers non-custodial sanctions as a less punitive form of punishment for international crimes. However, given their leniency, these ‘special sanctions’ have caused controversy. Based on qualitative interviews, this study explores the perceptions of different stakeholders concerning various issues related to the special sanctions’ nature, goals, processes, (envisioned) outcomes and challenges. Our findings reveal that most participants perceive these sanctions as a tool that can modestly help repair the damage done, reintegrate (certain) offenders into society, and promote coexistence. Only a limited number of respondents saw these sanctions as punishment. For several participants, the special sanctions may be an alternative accountability measure to prison. However, this seems to depend on meeting certain preconditions, victims’ participation, the type of crime and the offender’s rank and affiliation.",
				"issue": "2",
				"journalAbbreviation": "Int J Transit Justice",
				"language": "en",
				"libraryCatalog": "academic.oup.com",
				"pages": "192-211",
				"publicationTitle": "International Journal of Transitional Justice",
				"shortTitle": "Between Impunity and Justice?",
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
				"tags": [],
				"notes": [
					"LF:",
					{
						"note": "orcid:0000-0002-4241-0038 | Beatriz E Mayans-Hermida"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
