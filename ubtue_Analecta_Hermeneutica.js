{
	"translatorID": "b439f8fa-df43-4aec-b36d-5e168276a69e",
	"label": "ubtue_Analecta_Hermeneutica",
	"creator": "",
	"target": "www[.]iih-hermeneutics[.]org",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-17 07:27:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Universitätsbibliothek Tübingen

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
  if (url.includes("/volume-")) return "multiple";
  return false;
}

function getSearchResults(doc, checkOnly) {
  const items = {};
  const links = doc.querySelectorAll('a[href$=".pdf"]');
  if (!links.length) return false;
  for (let link of links) {
	const title = ZU.trimInternal(link.textContent);
	if (!title || /Download the Complete Volume/i.test(title)) continue;
	if (checkOnly) return true;
	items[link.href] = {
	  title,
	  link
	};
  }
  return items;
}

function buildSectionMap(doc) {
	const map = {};
	let currentSection = "Uncategorized";
	const xpath = '//h2 | //h3 | //h4 | //a[contains(@href, ".pdf")]';
	const nodes = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
	for (let i = 0; i < nodes.snapshotLength; i++) {
		const node = nodes.snapshotItem(i);
		if (/^H[2-4]$/i.test(node.tagName)) {
			const headingText = ZU.trimInternal(node.textContent);
			if (headingText && headingText.length < 100) {
				currentSection = headingText;
			}
		}
		else if (node.tagName === "A" && node.href) {
			const cleanHref = node.href.split("?")[0].toLowerCase();
			if (cleanHref.endsWith(".pdf")) {
				map[node.href] = currentSection;
			}
		}
	}
	return map;
}


async function doWeb(doc, url) {
  if (detectWeb(doc, url) == 'multiple') {	
	const items = await Zotero.selectItems(
		Object.fromEntries(
			Object.entries(getSearchResults(doc, false))
			.map(([url, { title }]) => [url, title])
		)
	);
	if (!items) return;
	const sectionMap = buildSectionMap(doc);
	const volumeInfo = parseVolumeInfo(doc, url);
	const results = getSearchResults(doc, false);
	for (let pdfUrl of Object.keys(items)) {
	await scrape(doc, results[pdfUrl].link, { sectionMap, ...volumeInfo });
	}
  } else {
	const sectionMap = buildSectionMap(doc);
	const volumeInfo = parseVolumeInfo(doc, url);
	await scrape(doc, url, { sectionMap, ...volumeInfo });
  }
}

function parseVolumeInfo(doc, url) {
  const volumeMatch = url.match(/volume-(\d+)(?:-(\d+))?/);
  const volume = volumeMatch ? volumeMatch[1] : "";
  const issue = volumeMatch && volumeMatch[2] ? volumeMatch[2] : "";
  const heading = doc.querySelector("h1, h2, h3");
  const yearMatch = heading && heading.textContent.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : "";
  return { volume, issue, year };
}

function getAuthors(link) {
  const authors = new Set();
  link.querySelectorAll('span[style*="italic"], span[style*="font-style:italic;"]').forEach(span => {
	const name = ZU.trimInternal(span.textContent);
	if (name) authors.add(name);
  });
  let next = link.nextElementSibling;
  while (next && !(next.tagName === "A" && next.href.endsWith(".pdf"))) {
	if (next.querySelectorAll) {
	  next.querySelectorAll('span[style*="italic"]').forEach(span => {
		const name = ZU.trimInternal(span.textContent);
		if (name) authors.add(name);
	  });
	}
	if (next.tagName === "SPAN" && /italic/i.test(next.getAttribute("style") || "")) {
	  const name = ZU.trimInternal(next.textContent);
	  if (name) authors.add(name);
	}
	if (next.nodeType === Node.TEXT_NODE) {
	  const text = ZU.trimInternal(next.textContent || "");
	  if (text) authors.add(text);
	}
	next = next.nextElementSibling;
  }
  return Array.from(authors)
	.map(a => a.replace(/^by\s+/i, "").replace(/\s+$/, ""))
	.filter(Boolean);
}

function removeAuthorFromTitle(link) {
	let title = ZU.trimInternal(link.textContent);
	let cleaned_title = title;
	let italicSpans = [...link.querySelectorAll('span[style*="font-style:italic"]')];

	let lastItalic = italicSpans.length
		? italicSpans[italicSpans.length - 1]
		: null;

	let authorFromHTML = lastItalic
		? ZU.trimInternal(lastItalic.textContent)
		: "";
	if (authorFromHTML && title.endsWith(authorFromHTML)) {
		cleaned_title = title.slice(0, -authorFromHTML.length).trim();
	}
	return cleaned_title
}

async function scrape(doc, link, context = {}) {
  const pdfUrl = link.href;
  const item = new Zotero.Item("journalArticle");
  item.title = ZU.trimInternal(removeAuthorFromTitle(link));
  item.url = pdfUrl;
  item.attachments.push({ url: pdfUrl, title: "Full Text PDF", mimeType: "application/pdf" });

  item.publicationTitle = "Analecta Hermeneutica";
  item.ISSN = "1918-7351";
  item.lagnuage = "en"
  item.volume = context.volume || "";
  if (context.issue) item.issue = context.issue;
  if (context.year) item.date = context.year;

  const section = (context.sectionMap && context.sectionMap[pdfUrl]) || "Uncategorized";
  if (section.includes("Review")) item.tags.push("RezensionstagPica")
  if (section.includes("Obituary") || section.includes("Obituaries")) item.tags.push("Nachruf")

  // this requires the pdf-metadata-extractor to be running, see: https://github.com/ubtue/pdf-metadata-extractor
  let extracted = {};
  let site = 'analecta_hermeneutica';
  try {
	const params = new URLSearchParams();
	params.append('url', pdfUrl);
	params.append('site', site);
	extracted = await fetch(PYMUPDF_SERVER_ADDRESS, {
		'method': "POST",
		'headers' : { 'Content-Type': 'application/x-www-form-urlencoded' },
		'body': params.toString()
	}).then(response => response.json());

	} catch (e) {
		Zotero.debug("PDF extraction failed: " + e);
	}

	if (extracted.abstract)
		item.abstractNote = extracted.abstract;

	let tagsSet = new Set();
	if (extracted.keywords) {
		extracted.keywords.split(",").forEach(tag => tagsSet.add(tag.trim()));
	}
	item.tags.push(...Array.from(tagsSet));
	if (extracted.tags)
		item.tags.push(extracted.tags)

	if (extracted.pages)
		item.pages = extracted.pages;

	if (extracted.author) {
		for (entry in extracted.author) {
			if (item.title && item.title.includes(extracted.author[entry].name)) continue;
			item.creators.push(ZU.cleanAuthor(extracted.author[entry].name.replace(/\d/, ''), "author"));
			if (extracted.author[entry].orcid != "")
				extracted.author[entry].orcid? item.notes.push({note: "orcid:" + extracted.author[entry].orcid + ' | ' + extracted.author[entry].name + ' | taken from website'}) : item.notes.push({note: "orcid:" + extracted.author[entry].orcid + ' | '});
		}
	}

	if (!item.creators) {
		const authors = getAuthors(link);
		for (let name of authors) {
			item.creators.push(ZU.cleanAuthor(name, "author"));
		}
	}

  await item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
