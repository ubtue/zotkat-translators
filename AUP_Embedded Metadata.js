{
	"translatorID": "951c027d-74ac-47d4-a107-9c3069ab28ae",
	"label": "AUP_Embedded Metadata",
	"creator": "Mara Spieß",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 500,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-15 15:09:04"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011 Avram Lyon and the Center for History and New Media
					 George Mason University, Fairfax, Virginia, USA
					 http://zotero.org

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

	***** END LICENSE BLOCK *****
*/


// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


/* eslint-disable camelcase */
var HIGHWIRE_MAPPINGS = {
	citation_title: "title",
	citation_publication_date: "date",	// perhaps this is still used in some old implementations
	citation_cover_date: "date", // used e.g. by Springer http://link.springer.com/article/10.1023/A:1021669308832
	citation_date: "date",
	citation_journal_title: "publicationTitle",
	citation_journal_abbrev: "journalAbbreviation",
	citation_inbook_title: "publicationTitle", // used as bookTitle or proceedingTitle, e.g. http://pubs.rsc.org/en/content/chapter/bk9781849730518-00330/978-1-84973-051-8
	citation_book_title: "bookTitle",
	citation_volume: "volume",
	citation_issue: "issue",
	citation_series_title: "series",
	citation_conference_title: "conferenceName",
	citation_conference: "conferenceName",
	citation_dissertation_institution: "university",
	citation_technical_report_institution: "institution",
	citation_technical_report_number: "number",
	citation_publisher: "publisher",
	citation_isbn: "ISBN",
	citation_abstract: "abstractNote",
	citation_doi: "DOI",
	citation_public_url: "url",
	citation_language: "language"

/* the following are handled separately in addHighwireMetadata()
	"citation_author"
	"citation_authors"
	"citation_firstpage"
	"citation_lastpage"
	"citation_issn"
	"citation_eIssn"
	"citation_pdf_url"
	"citation_abstract_html_url"
	"citation_fulltext_html_url"
	"citation_pmid"
	"citation_online_date"
	"citation_year"
	"citation_keywords"
*/
};

/* eslint-enable */

// Maps actual prefix in use to URI
// The defaults are set to help out in case a namespace is not declared
// Copied from RDF translator
var _prefixes = {
	bib: "http://purl.org/net/biblio#",
	bibo: "http://purl.org/ontology/bibo/",
	dc: "http://purl.org/dc/elements/1.1/",
	dcterms: "http://purl.org/dc/terms/",
	prism: "http://prismstandard.org/namespaces/1.2/basic/",
	foaf: "http://xmlns.com/foaf/0.1/",
	vcard: "http://nwalsh.com/rdf/vCard#",
	link: "http://purl.org/rss/1.0/modules/link/",
	z: "http://www.zotero.org/namespaces/export#",
	eprint: "http://purl.org/eprint/terms/",
	eprints: "http://purl.org/eprint/terms/",
	og: "http://ogp.me/ns#",				// Used for Facebook's OpenGraph Protocol
	article: "http://ogp.me/ns/article#",
	book: "http://ogp.me/ns/book#",
	music: "http://ogp.me/ns/music#",
	video: "http://ogp.me/ns/video#",
	rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
};

var _prefixRemap = {
	// DC should be in lower case
	"http://purl.org/DC/elements/1.0/": "http://purl.org/dc/elements/1.0/",
	"http://purl.org/DC/elements/1.1/": "http://purl.org/dc/elements/1.1/"
};

var namespaces = {};

var _haveItem = false,
	_itemType;

var RDF;

var CUSTOM_FIELD_MAPPINGS;

function addCustomFields(customFields) {
	CUSTOM_FIELD_MAPPINGS = customFields;
}

function setPrefixRemap(map) {
	_prefixRemap = map;
}

function remapPrefix(uri) {
	if (_prefixRemap[uri]) return _prefixRemap[uri];
	return uri;
}

function getPrefixes(doc) {
	var links = doc.getElementsByTagName("link");
	for (let i = 0; i < links.length; i++) {
		let link = links[i];
		// Look for the schema's URI in our known schemata
		var rel = link.getAttribute("rel");
		if (rel) {
			var matches = rel.match(/^schema\.([a-zA-Z]+)/);
			if (matches) {
				let uri = remapPrefix(link.getAttribute("href"));
				// Zotero.debug("Prefix '" + matches[1].toLowerCase() +"' => '" + uri + "'");
				_prefixes[matches[1].toLowerCase()] = uri;
			}
		}
	}

	// also look in html and head elements
	var prefixes = (doc.documentElement.getAttribute('prefix') || '')
		+ (doc.head.getAttribute('prefix') || '');
	var prefixRE = /(\w+):\s+(\S+)/g;
	var m;
	while ((m = prefixRE.exec(prefixes))) {
		let uri = remapPrefix(m[2]);
		Z.debug("Prefix '" + m[1].toLowerCase() + "' => '" + uri + "'");
		_prefixes[m[1].toLowerCase()] = uri;
	}
}

// Boolean Parameters (default values false)
//   * strict = false: compare only ending substring, e.g. bepress
//   * strict = true: compare exactly
//   * all = false: return only first match
//   * all = true: concatenate all values
function getContentText(doc, name, strict, all) {
	let csspath = 'meta[name' + (strict ? '="' : '$="') + name + '"]';
	if (all) {
		return Array.from(doc.querySelectorAll(csspath)).map(obj => obj.content || obj.contents).join(', ');
	}
	else {
		return attr(doc, csspath, 'content') || attr(doc, csspath, 'contents');
	}
}

function getContent(doc, name, strict) {
	var xpath = '/x:html/x:head/x:meta['
		+ (strict ? '@name' : 'substring(@name, string-length(@name)-' + (name.length - 1) + ')')
		+ '="' + name + '"]/';
	return ZU.xpath(doc, xpath + '@content | ' + xpath + '@contents', namespaces);
}

function fixCase(authorName) {
	// fix case if all upper or all lower case
	if (authorName.toUpperCase() === authorName
		|| authorName.toLowerCase() === authorName) {
		return ZU.capitalizeTitle(authorName, true);
	}

	return authorName;
}

function processFields(doc, item, fieldMap, strict) {
	for (var metaName in fieldMap) {
		var zoteroName = fieldMap[metaName];
		// only concatenate values for ISSN and ISBN; otherwise take the first
		var allValues = (zoteroName == "ISSN" || zoteroName == "ISBN");
		var value = getContentText(doc, metaName, strict, allValues);
		if (value && value.trim()) {
			item[zoteroName] = ZU.trimInternal(value);
		}
	}
}

function completeItem(doc, newItem, hwType) {
	// Strip off potential junk from RDF
	newItem.seeAlso = [];

	addHighwireMetadata(doc, newItem, hwType);
	addOtherMetadata(doc, newItem);
	addLowQualityMetadata(doc, newItem);
	finalDataCleanup(doc, newItem);

	if (CUSTOM_FIELD_MAPPINGS) {
		processFields(doc, newItem, CUSTOM_FIELD_MAPPINGS, true);
	}

	newItem.complete();
}

// eslint-disable-next-line consistent-return
function detectWeb(doc, url) {
	// blacklist wordpress jetpack comment plugin so it doesn't override other metadata
	if (url.includes("jetpack.wordpress.com/jetpack-comment/")) return false;
	if (exports.itemType) return exports.itemType;
	init(doc, url, Zotero.done);
}

function init(doc, url, callback, forceLoadRDF) {
	getPrefixes(doc);

	var metaTags = doc.head.getElementsByTagName("meta");
	Z.debug("Embedded Metadata: found " + metaTags.length + " meta tags.");
	if (forceLoadRDF /* check if this is called from doWeb */ && !metaTags.length) {
		if (doc.head) {
			Z.debug(doc.head.innerHTML
				.replace(/<style[^<]+(?:<\/style>|\/>)/ig, '')
				.replace(/<link[^>]+>/ig, '')
				.replace(/(?:\s*[\r\n]\s*)+/g, '\n')
			);
		}
		else {
			Z.debug("Embedded Metadata: No head tag");
		}
	}

	var hwType, hwTypeGuess, generatorType, statements = [];

	for (let i = 0; i < metaTags.length; i++) {
		let metaTag = metaTags[i];
		// Two formats allowed:
		// 	<meta name="..." content="..." />
		//	<meta property="..." content="..." />
		// The first is more common; the second is recommended by Facebook
		// for their OpenGraph vocabulary
		var tags = metaTag.getAttribute("name");
		if (!tags) tags = metaTag.getAttribute("property");
		var value = metaTag.getAttribute("content");
		if (!tags || !value) continue;
		// Z.debug(tags + " -> " + value);

		tags = tags.split(/\s+/);
		for (var j = 0, m = tags.length; j < m; j++) {
			var tag = tags[j];
			// We allow three delimiters between the namespace and the property
			var delimIndex = tag.search(/[.:_]/);
			// if(delimIndex === -1) continue;

			var prefix = tag.substr(0, delimIndex).toLowerCase();
			if (_prefixes[prefix]) {
				var prop = tag.substr(delimIndex + 1, 1).toLowerCase() + tag.substr(delimIndex + 2);
				// bib and bibo types are special, they use rdf:type to define type
				var specialNS = [_prefixes.bib, _prefixes.bibo];
				if (prop == 'type' && specialNS.includes(_prefixes[prefix])) {
					value = _prefixes[prefix] + value;
					prefix = 'rdf';
				}

				// This debug is for seeing what is being sent to RDF
				// Zotero.debug(_prefixes[prefix]+prop +"=>"+value);
				statements.push([url, _prefixes[prefix] + prop, value]);
			}
			else if (tag.toLowerCase() == 'generator') {
				var lcValue = value.toLowerCase();
				if (lcValue.includes('blogger')
					|| lcValue.includes('wordpress')
					|| lcValue.includes('wooframework')
				) {
					generatorType = 'blogPost';
				}
			}
			else {
				var shortTag = tag.slice(tag.lastIndexOf('citation_'));
				switch (shortTag) {
					case "citation_journal_title":
						hwType = "journalArticle";
						break;
					case "citation_technical_report_institution":
						hwType = "report";
						break;
					case "citation_conference_title":
					case "citation_conference":
						hwType = "conferencePaper";
						break;
					case "citation_book_title":
						hwType = "bookSection";
						break;
					case "citation_dissertation_institution":
						hwType = "thesis";
						break;
					case "citation_title":		// fall back to journalArticle, since this is quite common
					case "citation_series_title":	// possibly journal article, though it could be book
						hwTypeGuess = hwTypeGuess || "journalArticle";
						break;
					case 'citation_isbn':
						hwTypeGuess = "book"; // Unlikely, but other item types may have ISBNs as well (e.g. Reports?)
						break;
				}
			}
		}
	}

	if (statements.length || forceLoadRDF) {
		// load RDF translator, so that we don't need to replicate import code
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
		translator.setHandler("itemDone", function (obj, newItem) {
			_haveItem = true;
			// Z.debug(newItem)
			completeItem(doc, newItem, hwType);
		});

		translator.getTranslatorObject(function (rdf) {
			for (var i = 0; i < statements.length; i++) {
				var statement = statements[i];
				rdf.Zotero.RDF.addStatement(statement[0], statement[1], statement[2], true);
			}
			var nodes = rdf.getNodes(true);
			rdf.defaultUnknownType = hwTypeGuess || generatorType
				// if we have RDF data, then default to webpage
				|| (nodes.length ? "webpage" : false);

			// if itemType is overridden, no reason to run RDF.detectWeb
			if (exports.itemType) {
				rdf.itemType = exports.itemType;
				_itemType = exports.itemType;
			}
			else if (hwType) _itemType = hwType; // hwTypes are generally most accurate
			else {
				_itemType = nodes.length ? rdf.detectType({}, nodes[0], {}) : rdf.defaultUnknownType;
			}

			RDF = rdf;
			callback(_itemType);
		});
	}
	else {
		callback(exports.itemType || hwType || hwTypeGuess || generatorType);
	}
}

function doWeb(doc, url) {
	// set default namespace
	namespaces.x = doc.documentElement.namespaceURI;
	// populate _rdfPresent, _itemType, and _prefixes
	// As of https://github.com/zotero/zotero/commit/0cd183613f5dacc85676109c3a5c6930e3632fae
	// globals do not seem to be isolated to individual translators, so
	// RDF object, importantly the "itemDone" handlers, can get overridden
	// by other translators, so we cannot reuse the RDF object from detectWeb
	RDF = false;
	if (!RDF) init(doc, url, function () {
		importRDF(doc, url);
	}, true);
	else importRDF(doc, url);
}

// perform RDF import
function importRDF(doc) {
	RDF.doImport();
	if (!_haveItem) {
		completeItem(doc, new Zotero.Item(_itemType));
	}
}

/**
 * Adds HighWire metadata and completes the item
 */
function addHighwireMetadata(doc, newItem, hwType) {
	// HighWire metadata
	processFields(doc, newItem, HIGHWIRE_MAPPINGS);
	var authorNodes = getContent(doc, 'citation_author');
	if (authorNodes.length == 0) {
		authorNodes = getContent(doc, 'citation_authors');
	}
	// save rdfCreators for later
	var rdfCreators = newItem.creators;
	newItem.creators = [];
	for (var i = 0, n = authorNodes.length; i < n; i++) {
		var authors = authorNodes[i].nodeValue.split(/\s*;\s*/);
		if (authors.length == 1 && authorNodes.length == 1) {
			var authorsByComma = authors[0].split(/\s*,\s*/);
			
			/* If there is only one author node and
			we get nothing when splitting by semicolon, and at least two words on
			either side of the comma when splitting by comma, we split by comma. */
			
			LAST_NAME_PREFIX = /^(van|de|von)/i;
			if (authorsByComma.length > 1
				&& authorsByComma[0].includes(" ")
				&& authorsByComma[1].includes(" ")
				&& !LAST_NAME_PREFIX.test(authorsByComma[0]))
				authors = authorsByComma;
		}
		for (var j = 0, m = authors.length; j < m; j++) {
			var author = authors[j].trim();

			// skip empty authors. Try to match something other than punctuation
			if (!author || !author.match(/[^\s,-.;]/)) continue;

			author = ZU.cleanAuthor(author, "author", author.includes(","));
			if (author.firstName) {
				// fix case for personal names
				author.firstName = fixCase(author.firstName);
				author.lastName = fixCase(author.lastName);
			}
			newItem.creators.push(author);
		}
	}

	if (!newItem.creators.length) {
		newItem.creators = rdfCreators;
	}
	else if (rdfCreators.length) {
		// try to use RDF creator roles to update the creators we have
		for (let i = 0, n = newItem.creators.length; i < n; i++) {
			var name = newItem.creators[i].firstName
				+ newItem.creators[i].lastName;
			for (let j = 0, m = rdfCreators.length; j < m; j++) {
				var creator = rdfCreators[j];
				if (name.toLowerCase() == (creator.firstName + creator.lastName).toLowerCase()) {
					// highwire should set all to author, so we only care about editor
					// contributor is not always a contributor
					if (creator.creatorType == 'editor') {
						newItem.creators[i].creatorType = creator.creatorType;
					}
					rdfCreators.splice(j, 1);
					break;
				}
			}
		}

		/* This may introduce duplicates
		//if there are leftover creators from RDF, we should use them
		if(rdfCreators.length) {
			for(var i=0, n=rdfCreators.length; i<n; i++) {
				newItem.creators.push(rdfCreators[i]);
			}
		}*/
	}

	// Deal with tags in a string
	// we might want to look at the citation_keyword metatag later
	if (!newItem.tags || !newItem.tags.length) {
		var tags = getContent(doc, 'citation_keywords');
		newItem.tags = [];
		for (let i = 0; i < tags.length; i++) {
			var tag = tags[i].textContent.trim();
			if (tag) {
				var splitTags = tag.split(';');
				for (let j = 0; j < splitTags.length; j++) {
					if (!splitTags[j].trim()) continue;
					newItem.tags.push(splitTags[j].trim());
				}
			}
		}
	}

	// sometimes RDF has more info, let's not drop it
	var rdfPages = (newItem.pages) ? newItem.pages.split(/\s*-\s*/) : [];
	var firstpage = getContentText(doc, 'citation_firstpage');
	var lastpage = getContentText(doc, 'citation_lastpage');
	if (firstpage && firstpage.includes("-")) {
		firstpage = firstpage.split(/\s*-\s*/)[0];
		lastpage = lastpage || firstpage.split(/\s*-\s*/)[1];
	}
	firstpage = firstpage || rdfPages[0];
	lastpage = lastpage || rdfPages[1];
	if (firstpage && (firstpage = firstpage.trim())) {
		newItem.pages = firstpage
			+ ((lastpage && (lastpage = lastpage.trim())) ? '-' + lastpage : '');
	}
	
	// swap in hwType for itemType
	if (hwType && hwType != newItem.itemType) {
		newItem.itemType = hwType;
	}
	
	
	// fall back to some other date options
	if (!newItem.date) {
		var onlineDate = getContentText(doc, 'citation_online_date');
		var citationYear = getContentText(doc, 'citation_year');
		
		if (onlineDate && citationYear) {
			onlineDate = ZU.strToISO(onlineDate);
			if (citationYear < onlineDate.substr(0, 4)) {
				// online date can be years after the citation year
				newItem.date = citationYear;
			}
			else {
				newItem.date = onlineDate;
			}
		}
		else {
			newItem.date = onlineDate || citationYear;
		}
	}

	// prefer ISSN over eISSN
	var issn = getContentText(doc, 'citation_issn', null, true)
			|| getContentText(doc, 'citation_ISSN', null, true)
			|| getContentText(doc, 'citation_eIssn', null, true);

	if (issn) newItem.ISSN = issn;

	// This may not always yield desired results
	// i.e. if there is more than one pdf attachment (not common)
	var pdfURL = getContent(doc, 'citation_pdf_url');
	if (pdfURL.length) {
		pdfURL = pdfURL[0].textContent;
		// delete any pdf attachments if present
		// would it be ok to just delete all attachments??
		for (let i = newItem.attachments.length - 1; i >= 0; i--) {
			if (newItem.attachments[i].mimeType == 'application/pdf') {
				newItem.attachments.splice(i, 1);
			}
		}

		newItem.attachments.push({ title: "Full Text PDF", url: pdfURL, mimeType: "application/pdf" });
	}

	// add snapshot
	newItem.attachments.push({ document: doc, title: "Snapshot" });

	// store PMID in Extra and as a link attachment
	// e.g. http://www.sciencemag.org/content/332/6032/977.full
	var PMID = getContentText(doc, 'citation_pmid');
	if (PMID) {
		if (newItem.extra) newItem.extra += '\n';
		else newItem.extra = '';

		newItem.extra += 'PMID: ' + PMID;

		newItem.attachments.push({
			title: "PubMed entry",
			url: "http://www.ncbi.nlm.nih.gov/pubmed/" + PMID,
			mimeType: "text/html",
			snapshot: false
		});
	}

	// Other last chances
	if (!newItem.url) {
		newItem.url = getContentText(doc, "citation_abstract_html_url")
			|| getContentText(doc, "citation_fulltext_html_url");
	}
}

function addOtherMetadata(doc, newItem) {
	// Scrape parsely metadata http://parsely.com/api/crawler.html
	var parselyJSON = ZU.xpathText(doc, '(//x:meta[@name="parsely-page"]/@content)[1]', namespaces);
	if (parselyJSON) {
		try {
			var parsely = JSON.parse(parselyJSON);
		}
		catch (e) {}

		if (parsely) {
			if (!newItem.title && parsely.title) {
				newItem.title = parsely.title;
			}

			if (!newItem.url && parsely.url) {
				newItem.url = parsely.url;
			}

			if (!newItem.date && parsely.pub_date) {
				var date = new Date(parsely.pub_date);
				if (!isNaN(date.getUTCFullYear())) {
					newItem.date = ZU.formatDate({
						year: date.getUTCFullYear(),
						month: date.getUTCMonth(),
						day: date.getUTCDate()
					}, true);
				}
			}

			if (!newItem.creators.length && parsely.author) {
				newItem.creators.push(ZU.cleanAuthor('' + parsely.author, 'author'));
			}

			if (!newItem.tags.length && parsely.tags && parsely.tags.length) {
				newItem.tags = parsely.tags;
			}
		}
	}
}

function addLowQualityMetadata(doc, newItem) {
	// if we don't have a creator, look for byline on the page
	// but first, we're desperate for a title
	if (!newItem.title) {
		Z.debug("Title was not found in meta tags. Using document title as title");
		newItem.title = doc.title;
	}

	if (newItem.title) {
		newItem.title = newItem.title.replace(/\s+/g, ' '); // make sure all spaces are \u0020

		if (newItem.publicationTitle) {
			// remove publication title from the end of title (see #604)
			// this can occur if we have to doc.title, og:title etc.
			// Make sure we escape all regex special chars in publication title
			var removePubTitleRegex = new RegExp('\\s*[-–—=_:|~#]\\s*'
				+ newItem.publicationTitle.replace(/([()[\]$^*+.?|])/g, '\\$1') + '\\s*$', 'i');
			newItem.title = newItem.title.replace(removePubTitleRegex, '');
		}
	}

	if (!newItem.creators.length) {
		// the authors in the standard W3 author tag are safer than byline guessing
		var w3authors = ZU.xpath(doc, '//meta[@name="author" or @property="author"]');
		if (w3authors.length > 0) {
			for (var i = 0; i < w3authors.length; i++) {
				// skip empty authors. Try to match something other than punctuation
				if (!w3authors[i].content || !w3authors[i].content.match(/[^\s,-.;]/)) continue;
				newItem.creators.push(ZU.cleanAuthor(w3authors[i].content, "author"));
			}
		}
		else if (tryOgAuthors(doc)) {
			newItem.creators = tryOgAuthors(doc);
		}
		else {
			getAuthorFromByline(doc, newItem);
		}
	}
	// fall back to "keywords"
	if (!newItem.tags.length) {
		newItem.tags = ZU.xpathText(doc, '//x:meta[@name="keywords"]/@content', namespaces);
	}

	// We can try getting abstract from 'description'
	if (!newItem.abstractNote) {
		newItem.abstractNote = ZU.trimInternal(
			ZU.xpathText(doc, '//x:meta[@name="description"]/@content', namespaces) || '');
	}

	if (!newItem.url) {
		newItem.url = ZU.xpathText(doc, '//head/link[@rel="canonical"]/@href') || doc.location.href;
	}
	
	if (!newItem.language) {
		newItem.language = ZU.xpathText(doc, '//x:meta[@name="language"]/@content', namespaces)
			|| ZU.xpathText(doc, '//x:meta[@name="lang"]/@content', namespaces)
			|| ZU.xpathText(doc, '//x:meta[@http-equiv="content-language"]/@content', namespaces)
			|| ZU.xpathText(doc, '//html/@lang')
			|| doc.documentElement.getAttribute('xml:lang');
	}


	newItem.libraryCatalog = doc.location.host;

	// add access date
	newItem.accessDate = 'CURRENT_TIMESTAMP';
}

/* returns an array of objects of Og authors, but only where they do not contain a URL to prevent getting facebook profiles
In a worst case scenario, where real authors and social media profiles are mixed, we might miss some, but that's still
preferable to garbage */
function tryOgAuthors(doc) {
	var authors = [];
	var ogAuthors = ZU.xpath(doc, '//meta[@property="article:author" or @property="video:director" or @property="music:musician"]');
	for (var i = 0; i < ogAuthors.length; i++) {
		if (ogAuthors[i].content && ogAuthors[i].content.search(/(https?:\/\/)?[\da-z.-]+\.[a-z.]{2,6}/) < 0 && ogAuthors[i].content !== "false") {
			authors.push(ZU.cleanAuthor(ogAuthors[i].content, "author"));
		}
	}
	return authors.length ? authors : null;
}

function getAuthorFromByline(doc, newItem) {
	var bylineClasses = ['byline', 'vcard', 'article-byline'];
	Z.debug("Looking for authors in " + bylineClasses.join(', '));
	var bylines = [], byline;
	for (var i = 0; i < bylineClasses.length; i++) {
		byline = doc.getElementsByClassName(bylineClasses[i]);
		Z.debug("Found " + byline.length + " elements with '" + bylineClasses[i] + "' class");
		for (var j = 0; j < byline.length; j++) {
			if (!byline[j].textContent.trim()) continue;

			bylines.push(byline[j]);
		}
	}

	var actualByline;
	if (!bylines.length) {
		Z.debug("No byline found.");
		return;
	}
	else if (bylines.length == 1) {
		actualByline = bylines[0];
	}
	else if (newItem.title) {
		Z.debug(bylines.length + " bylines found:");
		Z.debug(bylines.map(function (n) {
			return ZU.trimInternal(n.textContent);
		}).join('\n'));
		Z.debug("Locating the one closest to title.");

		// find the closest one to the title (in DOM)
		actualByline = false;
		var parentLevel = 1;
		var skipList = [];

		// Wrap title in quotes so we can use it in the xpath
		var xpathTitle = newItem.title.toLowerCase();
		if (xpathTitle.includes('"')) {
			if (!xpathTitle.includes("'")) {
				// We can just use single quotes then
				xpathTitle = "'" + xpathTitle + "'";
			}
			else {
				// Escaping double quotes in xpaths is really hard
				// Solution taken from http://kushalm.com/the-perils-of-xpath-expressions-specifically-escaping-quotes
				xpathTitle = 'concat("' + xpathTitle.replace(/"+/g, '",\'$&\', "') + '")';
			}
		}
		else {
			xpathTitle = '"' + xpathTitle + '"';
		}

		var titleXPath = './/*[normalize-space(translate(text(),"ABCDEFGHJIKLMNOPQRSTUVWXYZ\u00a0","abcdefghjiklmnopqrstuvwxyz "))='
			+ xpathTitle + ']';
		Z.debug("Looking for title using: " + titleXPath);
		while (!actualByline && bylines.length != skipList.length && parentLevel < 5) {
			Z.debug("Parent level " + parentLevel);
			for (let i = 0; i < bylines.length; i++) {
				if (skipList.includes(i)) continue;

				if (parentLevel == 1) {
					// skip bylines that contain bylines
					var containsBylines = false;
					for (let j = 0; !containsBylines && j < bylineClasses.length; j++) {
						containsBylines = bylines[i].getElementsByClassName(bylineClasses[j]).length;
					}
					if (containsBylines) {
						Z.debug("Skipping potential byline " + i + ". Contains other bylines");
						skipList.push(i);
						continue;
					}
				}

				var bylineParent = bylines[i];
				for (let j = 0; j < parentLevel; j++) {
					bylineParent = bylineParent.parentElement;
				}
				if (!bylineParent) {
					Z.debug("Skipping potential byline " + i + ". Nowhere near title");
					skipList.push(i);
					continue;
				}

				if (ZU.xpath(bylineParent, titleXPath).length) {
					if (actualByline) {
						// found more than one, bail
						Z.debug('More than one possible byline found. Will not proceed');
						return;
					}
					actualByline = bylines[i];
				}
			}

			parentLevel++;
		}
	}

	if (actualByline) {
		byline = ZU.trimInternal(actualByline.textContent);
		Z.debug("Extracting author(s) from byline: " + byline);
		var li = actualByline.getElementsByTagName('li');
		if (li.length) {
			for (let i = 0; i < li.length; i++) {
				var author = ZU.trimInternal(li[i].textContent).replace(/[,\s]+$/, "");
				newItem.creators.push(ZU.cleanAuthor(fixCase(author), 'author', author.includes(',')));
			}
		}
		else {
			byline = byline.split(/\bby[:\s]+/i);
			byline = byline[byline.length - 1].replace(/\s*[[(].+?[)\]]\s*/g, '');
			var authors = byline.split(/\s*(?:(?:,\s*)?and|,|&)\s*/i);
			if (authors.length == 2 && authors[0].split(' ').length == 1) {
				// this was probably last, first
				newItem.creators.push(ZU.cleanAuthor(fixCase(byline), 'author', true));
			}
			else {
				for (let i = 0, n = authors.length; i < n; i++) {
					if (!authors[i].length || authors[i].includes('@')) {
						// skip some odd splits and twitter handles
						continue;
					}

					if (authors[i].split(/\s/).length == 1) {
						// probably corporate author
						newItem.creators.push({
							lastName: authors[i],
							creatorType: 'author',
							fieldMode: 1
						});
					}
					else {
						newItem.creators.push(
							ZU.cleanAuthor(fixCase(authors[i]), 'author'));
					}
				}
			}
		}
	}
	else {
		Z.debug("No reliable byline found.");
	}
}


/** If we already have tags - run through them one by one,
 * split where necessary and concat them.
 * This will deal with multiple tags, some of them comma delimited,
 * some semicolon, some individual
 */
function finalDataCleanup(doc, newItem) {
	if (typeof newItem.tags == 'string') {
		newItem.tags = [newItem.tags];
	}
	if (newItem.tags && newItem.tags.length && Zotero.parentTranslator) {
		if (exports.splitTags) {
			var tags = [];
			for (let i in newItem.tags) {
				newItem.tags[i] = newItem.tags[i].trim();
				if (!newItem.tags[i].includes(';')) {
					// split by comma, since there are no semicolons
					tags = tags.concat(newItem.tags[i].split(/\s*,\s*/));
				}
				else {
					tags = tags.concat(newItem.tags[i].split(/\s*;\s*/));
				}
			}
			for (let i = 0; i < tags.length; i++) {
				if (tags[i] === "") tags.splice(i, 1);
			}
			newItem.tags = tags;
		}
	}
	else {
		// Unless called from another translator, don't include automatic tags,
		// because most of the time they are not right
		newItem.tags = [];
	}

	// Cleanup DOI
	if (newItem.DOI) {
		newItem.DOI = ZU.cleanDOI(newItem.DOI);
	}

	// Add DOI to non-supported item types
	if (newItem.DOI && !ZU.fieldIsValidForType("DOI", newItem.itemType)) {
		if (newItem.extra) {
			newItem.extra += "\nDOI: " + newItem.DOI;
		}
		else {
			newItem.extra = "DOI: " + newItem.DOI;
		}
	}


	// remove itemID - comes from RDF translator, doesn't make any sense for online data
	newItem.itemID = "";

	// worst case, if this is not called from another translator, use URL for title
	if (!newItem.title && !Zotero.parentTranslator) newItem.title = newItem.url;
}

var exports = {
	doWeb: doWeb,
	detectWeb: detectWeb,
	addCustomFields: addCustomFields,
	itemType: false,
	// activate/deactivate splitting tags in final data cleanup when they contain commas or semicolons
	splitTags: true,
	fixSchemaURI: setPrefixRemap
};


/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
