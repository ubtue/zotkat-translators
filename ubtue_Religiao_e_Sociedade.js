{
	"translatorID": "0744c01e-afda-4485-9c7a-2f1221d793d2",
	"label": "ubtue_Religiao_e_Sociedade",
	"creator": "",
	"target": "^https?://(www\\.)?scielo\\.br/j/rs",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-26 14:36:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Universitätsbibliothek Tübingen

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
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	if (ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content')) {
		return "journalArticle";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//tbody/tr');
	for (let row of rows) {
		let title = ZU.trimInternal(
			ZU.xpathText(row, './/strong[contains(@class, "d-block")]')
		);
		if (!title) continue;
		let textLinks = ZU.xpath(
			row,
			'.//li[strong[contains(., "Texto")]]//a[@href]'
		);
		for (let link of textLinks) {
			let href = link.href;
			if (href.includes('format=pdf')) continue;
			if (href.includes('abstract')) continue;
			if (checkOnly) return true;
			found = true;
			let lang = link.textContent.trim();
			items[href] = `${title} [${lang}]`;
		}
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), async function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			await ZU.processDocuments(articles, scrape);
		});
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	let translator = Zotero.loadTranslator('web');
	// this requires the pdf-metadata-extractor to be running, see: https://github.com/ubtue/pdf-metadata-extractor
	let extracted = {};
	let site = 'philippiniana_sacra';
	try {
		const params = new URLSearchParams();
		let pdfMeta = doc.querySelector('meta[name="citation_pdf_url"]');
		let pdfLink = pdfMeta ? pdfMeta.content : null;
		params.append('url', pdfLink);
		params.append('site', site);
		extracted = await fetch(PYMUPDF_SERVER_ADDRESS, {
								'method': "POST",
								'headers' : { 'Content-Type': 'application/x-www-form-urlencoded' },
								'body': params.toString()
		}).then(response => response.json());

	} catch (e) {
		Zotero.debug("PDF extraction failed: " + e);
	}

	// Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler('itemDone', function(obj, item) {

	let additionalTitles = ZU.xpath(doc, '//h2[@class="article-title"]')
		.map(node => ZU.trimInternal(node.textContent));
	if (additionalTitles.length) {
		for (let additionalTitle of additionalTitles) {
			if (additionalTitle != item.title) item.notes.push({note:'Paralleltitel:' + ZU.trimInternal(additionalTitle)});
		}
	}

	let abstracts = [
		ZU.xpathText(doc, '//div[contains(@data-anchor, "Abstract")]/p[1]'),
		ZU.xpathText(doc, '//div[contains(@data-anchor, "Resumo")]/p[1]'),
		ZU.xpathText(doc, '//div[contains(@data-anchor, "Resumen")]/p[1]')
	].filter(Boolean);

	let keywordBlocks = [
		ZU.xpathText(doc, '//div[contains(@data-anchor, "Abstract")]/p[2]'),
		ZU.xpathText(doc, '//div[contains(@data-anchor, "Resumo")]/p[2]'),
		ZU.xpathText(doc, '//div[contains(@data-anchor, "Resumen")]/p[2]')
	].filter(Boolean);

	if (abstracts.length) {
		item.abstractNote = abstracts[0].replace(/^(Abstract:|Resumo:|Resumen:)\s*/i, '');
		if (abstracts[1]) item.notes.push({ note: 'abs: ' + abstracts[1].replace(/^(Abstract:|Resumo:|Resumen:)\s*/i, '') });
		if (abstracts[2]) item.notes.push({ note: 'abs1: ' + abstracts[2].replace(/^(Abstract:|Resumo:|Resumen:)\s*/i, '') });
	}

	if (keywordBlocks) item.tags = []
	const allTags = new Set();
	for (let block of keywordBlocks) {block = block.replace(/^(Keywords?:|Palavras-chaves?:|Palabras claves?:)\s*/i, '');
		for (let tag of block.split(';')) {
			tag = tag.trim().toLowerCase();
			if (tag) allTags.add(tag);
		}
	}
	for (const tag of allTags.values()) {
		item.tags.push({ tag });
	}

	//extract articleID, sometimes the pages metadata won't include the full articleID, thus we rely on the doi url
	let articleID;
	if (item.pages && item.pages.includes('e')) {
		articleID = item.pages;
		delete item.pages;
	}

	let fullDOI = ZU.xpathText(doc, '//span[@class="group-doi"]/a[contains(@href, "doi.org")]/@href');
	let match = fullDOI && fullDOI.match(/(e[^/]+)$/i);
	if (match) {
		articleID = match[1];
		let doi = fullDOI.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
		if (doi !== item.DOI) {
			item.DOI = doi;
		}
	}
	if (articleID) item.notes.push({note: "articleid:" + articleID});

	item.title = ZU.capitalizeTitle(item.title, true);

	//deduplicate all keywords
	item.tags = [...new Set(item.tags.map(x => x))];
	let citationIssue = ZU.xpathText(doc, '//meta[@name="citation_number"]/@content');
	if (!item.issue && citationIssue) item.issue = citationIssue;
	item.libraryCatalog = "SciELO"
	if (item.pages && item.pages.match(/^0/)) {
		item.pages = item.pages.replace(/^0/, '');
	}
	let trimmedCreators = [];
	for (let creator of item.creators) {
		let found = false;
		for (let cre of trimmedCreators) {
			if (creator.firstName == cre.firstName && creator.lastName == cre.lastName) found = true;
		}
		if (!found) trimmedCreators.push(creator);
	}
	item.creators = trimmedCreators;

	//ORCIDs
	function invertName(name) {
		let parts = name.split(',');
		if (parts.length === 2) {
			return parts[1].trim() + ' ' + parts[0].trim();
		}
		return name;
	}
	let metas = ZU.xpath(doc, '//meta[@name="citation_author" or @name="citation_author_orcid"]');
	let currentAuthor = null;
	for (let meta of metas) {
		let name = meta.getAttribute('name');
		let value = meta.getAttribute('content');
		if (name === 'citation_author') {
			currentAuthor = value;
		}
		else if (name === 'citation_author_orcid' && currentAuthor) {
			let orcid = value.replace(/^https?:\/\/orcid\.org\//, '');
			item.notes.push({note: `orcid: ${orcid} | ${invertName(currentAuthor)} | taken from website`});
		}
	}

	if (extracted.pages && !item.pages)
		item.pages = extracted.pages;
	
	item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
