{
	"translatorID": "c216ae06-da95-4fd0-bce8-38de1f6cf17c",
	"label": "Peeters",
	"creator": "Timotheus Kim",
	"target": "^https?://(www\\.)?poj\\.peeters-leuven\\.be/content\\.php",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-12-10 08:45:32"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Timotheus Chang-Whae Kim, Johannes Ruscheinski, Philipp Zumstein
	
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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	if (url.includes('url=article')) {
		return "journalArticle";
	} else if (url.includes('url=issue') && getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('tr');
	for (let i=0; i<rows.length; i++) {
		let href = attr(rows[i], 'td a', 'href');
		let title = text(rows[i], 'td', 1);
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
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


function ALLCaps(name) {
	return name === name.toUpperCase();
}


// Concatenate the values of all nodes until a BR or B tag respecting the HTML formatting
function getValue(nodes) {
	var value = "";
	for (let part of nodes) {
		if (part.tagName=="BR" || part.tagName=="B") break;
		value += ' ';
		if (part.tagName) {
			value += part.outerHTML;
		} else {
			value += part.textContent.trim();
		}
	}
	return value;
}


function scrape(doc, url) {
	var item = new Z.Item('journalArticle');
	
	var titleNodes = ZU.xpath(doc, '//b[contains(text(), "Title:")]/following-sibling::node()');
	item.title = getValue(titleNodes);
	var subtitleNodes = ZU.xpath(doc, '//b[contains(text(), "Subtitle:")]/following-sibling::node()');
	var subtitle = getValue(subtitleNodes);
	if (subtitle) {
		item.title += ': ' + subtitle;
	}
	
	// e.g. Author(s): HANDAL, Boris , WATSON, Kevin , ..., VAN DER MERWE, W.L.
	// but sometimes the space before the comma is also missing
	var authors = ZU.xpathText(doc, '//b[contains(text(), "Author(s):")]/following-sibling::text()[1]');
	if (authors) {
		authors = authors.split(',');
	}
	var creator;
	for (let i=0; i<authors.length; i++) {
		let name = authors[i];
		if (ALLCaps(name)) name = ZU.capitalizeTitle(name, true);
		if (i%2===0) {// last name
			creator = {
				creatorType: 'author',
				lastName: ZU.capitalizeTitle(name, true)
			};
		} else {// first name
			creator.firstName = name;
			item.creators.push(creator); 
		}
	}

	item.publicationTitle = ZU.xpathText(doc, '//b[contains(text(), "Journal:")]/following-sibling::a[1]');
	item.volume = ZU.xpathText(doc, '//b[contains(text(), "Volume:")]/following-sibling::a[1]');
	item.issue = ZU.xpathText(doc, '//b[contains(text(), "Issue:")]/following-sibling::text()[1]');
	item.date = ZU.xpathText(doc, '//b[contains(text(), "Date:")]/following-sibling::text()[1]');
	item.pages = ZU.xpathText(doc, '//b[contains(text(), "Pages:")]/following-sibling::text()[1]');
	item.DOI = ZU.xpathText(doc, '//b[contains(text(), "DOI:")]/following-sibling::text()[1]');
	let urlLink = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "whitecell", " " ))]');
	if(urlLink[2]) item.url = urlLink[2].baseURI;
	let abstract = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "whitecell", " " ))]');
	if (abstract[2]) item.abstractNote = abstract[2].textContent.replace(/(\r\n|\n|\r)/gm,"").match(/Abstract.*/g).toString();
	//scrape e-issn from the journal site
	let lookupIssn = doc.querySelectorAll('.whitecell');
	if (lookupIssn && lookupIssn[0]) {
		let post = 'https://poj.peeters-leuven.be/content.php?url=journal.php&journal_code=' + lookupIssn[0].baseURI.split('&journal_code=')[1];
		ZU.processDocuments(post, function (scrapeEissn) {
			var eissn = ZU.xpathText(scrapeEissn, '//td[@class="b2"]');
			if (eissn && eissn.match(/e-issn\s+:?\s+\d{4}-?\d{4}/gi)) {
				item.ISSN = eissn.match(/e-issn\s+:?\s+\d{4}-?\d{4}/gi).toString().trim().replace(/e-issn\s+:?\s/i, '');
			}
			item.complete();
		});
	}

	item.attachments.push({
		url: url,
		title: "Snapshot",
		mimeType: "text/html"
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3269042&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Choosing to be Changed:  Revelation, Identity and the Ethics of Self-Transformation",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Mcqueen",
						"firstName": " Paddy"
					}
				],
				"date": "2017",
				"DOI": "10.2143/EP.24.4.3269042",
				"ISSN": "1783-1431",
				"abstractNote": "Abstract :How should one decide whether to undergo an experience that changes who one is? In her discussion of ‘transformative experiences’, L.A. Paul argues that to choose rationally when deliberating first-personally, one should base one’s decision on ‘revelation’, i.e. to discover out what the experience will be like. If this solution is taken as the sole means by which a transformative choice is made, then I argue it is problematic. This is because (i) it overlooks the role that one’s practical identity ought to play when making a major life decision; and (ii) it ignores morally relevant reasons for action. Even if we retain the revelation approach as only part of the means through which a transformative choice is made, I argue that revelation should frequently carry little weight in our decision-making. Rather than focusing on the subjective quality of future experiences, it is often preferable to reflect on who one is and what one’s endorsed practical identity commits one to.",
				"issue": "4",
				"libraryCatalog": "Peeters",
				"pages": "545-568",
				"publicationTitle": "Ethical Perspectives",
				"shortTitle": "Choosing to be Changed",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3269042&journal_code=EP",
				"volume": "24",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article.php&id=3269043&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Recognizing and Emulating Exemplars",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Compaijen",
						"firstName": " Rob"
					}
				],
				"date": "2017",
				"DOI": "10.2143/EP.24.4.3269043",
				"ISSN": "1783-1431",
				"abstractNote": "Abstract :In the present contribution I explore what is involved in recognizing and emulating exemplars, and I do so by critically engaging with the view – recently forwarded by Linda T. Zagzebski – that admiration is the key to understanding these issues. While I believe that recognizing exemplars typically involves admiration, I do not think it is sufficient. Instead, I suggest, understanding what is involved in the recognition and emulation of exemplars requires a richer account. I develop my argument in three steps. First, I engage with Zagzebski’s exemplarist moral theory and elaborate her understanding of the relationship between admiration and exemplarity on the basis of her recent work on the topic. Second, I argue why I believe that we cannot understand the recognition and emulation of exemplars by reference to admiration alone. Third, I elaborate my own account of what is involved in recognizing and emulating exemplars, which involves self-awareness, the possibility of identifying with the exemplar, and what I call ‘motivational continuity’.",
				"issue": "4",
				"libraryCatalog": "Peeters",
				"pages": "569-593",
				"publicationTitle": "Ethical Perspectives",
				"url": "https://poj.peeters-leuven.be/content.php?url=article.php&id=3269043&journal_code=EP",
				"volume": "24",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article.php&id=3269044&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Cognitivist Prescriptivism",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Alwood",
						"firstName": " Andrew H."
					}
				],
				"date": "2017",
				"DOI": "10.2143/EP.24.4.3269044",
				"ISSN": "1783-1431",
				"abstractNote": "Abstract :Metaethical cognitivism allegedly has trouble explaining how moral judgments are practical, because it claims that moral thoughts are beliefs that need not involve motivation. But motivation is not necessary to meet the practicality criterion on theories of moral thought and talk. A cognitivist about moral thought can adopt a prescriptivist account of moral talk, in a hybrid theory that supplements descriptive moral meanings in order to achieve interesting advantages over traditional descriptivist and expressivist theories as well as over other hybrid theories. This hybrid cognitivist-prescriptivist theory makes sense of amoralists who have moral judgments but no motivation, and offers a new diagnosis of why their use of moral language is infelicitous.",
				"issue": "4",
				"libraryCatalog": "Peeters",
				"pages": "595-623",
				"publicationTitle": "Ethical Perspectives",
				"url": "https://poj.peeters-leuven.be/content.php?url=article.php&id=3269044&journal_code=EP",
				"volume": "24",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3127266&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "'Thank God I Failed':  How Much Does a Failed Murder Attempt Transform the Agent?",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Cowley",
						"firstName": " Christopher"
					}
				],
				"date": "2015",
				"DOI": "10.2143/EP.22.4.3127266",
				"ISSN": "1783-1431",
				"abstractNote": "Abstract :Peter Winch writes: 'One who fails in his attempt to commit a murder and who undergoes a change of heart might subsequently come to thank God that he failed. It is pertinent for us to ask what precisely he has to thank God for' (1971, 144). The first answer to this question is that the thwarted attempter is relieved not to have become a murderer. In exploring the nature of this becoming, I consider and reject a ‘subjectivist’ account, according to which the attempter has already ‘become’ a murderer in virtue of his or her sincerely murderous intentions and plans. And yet clearly the attempter has lost something of the innocence that would make murder morally unthinkable. He or she thereby inhabits a curious kind of metaphysical limbo between innocence and guilt, between transformation and self-discovery, between ignorance and knowledge.",
				"issue": "4",
				"libraryCatalog": "Peeters",
				"pages": "523-545",
				"publicationTitle": "Ethical Perspectives",
				"shortTitle": "'Thank God I Failed'",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3127266&journal_code=EP",
				"volume": "22",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=630100&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "An Ethical Agenda for Europe:  Fundamental Problems on Practical Ethics in a Christian Perspective",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Verstraeten",
						"firstName": " Johan"
					}
				],
				"date": "March 1994",
				"DOI": "10.2143/EP.1.1.630100",
				"ISSN": "1783-1431",
				"abstractNote": "Abstract :Today, applied ethics confronts many problems: technological and biomedical innovations, crisis of the welfare state, rising unemployment, migration and xenophobia. These and the changes accompanying them are, in themselves, important objects of study. An investigation on the level of the differentiated disciplines of practical ethics is insufficient. In as far as practical ethics also serves to disclose reality, it shows that modern problems can only be understood in the light of the general cultural crisis of which they are, at the very least, symptoms. In the first part of this article, we will try to clarify this byanalyzing the crisis in the ethos of modern secularized society. The second part will try to show that Christian ethics can offer a meaningful answer to this cultural crisis, and how it can do so.",
				"issue": "1",
				"libraryCatalog": "Peeters",
				"pages": "3-12",
				"publicationTitle": "Ethical Perspectives",
				"shortTitle": "An Ethical Agenda for Europe",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=630100&journal_code=EP",
				"volume": "1",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3281475&journal_code=LV",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "De Medellín à nos jours:  Quelle place pour la catéchèse en Amérique latine?",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Jiménez Rodríguez",
						"firstName": " Manuel José"
					}
				],
				"date": "2018",
				"DOI": "10.2143/LV.73.1.3281475",
				"abstractNote": "Abstract :À Medellín, les raisons qui ont conduit à solliciter un renouveau de la catéchèse restent actuelles. Outre les profondes transformations sociales, culturelles et religieuses qui remettent en question le rôle du christianisme en Amérique latine, il existe la nécessité de ré-évangéliser les baptisés de tous les âges. Ceci demande un nouveau paradigme pour la catéchèse sur le continent qui doit être en rapport avec l’initiation chrétienne, le catéchuménat et l’inspiration catéchuménale de la catéchèse. La dimension sociale du kérygme et l’initiation chrétienne mettent bien en évidence la concordance entre Medellín, la Conférence d’Aparecida et le Magistère du pape François.",
				"issue": "1",
				"libraryCatalog": "Peeters",
				"pages": "33-41",
				"publicationTitle": "Lumen Vitae",
				"shortTitle": "De Medellín à nos jours",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3281475&journal_code=LV",
				"volume": "73",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3251316&journal_code=LV",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Laisser la Parole de Dieu faire son travail:  Un défi pour le lecteur des Écritures",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Raimbault",
						"firstName": " Christophe"
					}
				],
				"date": "2017",
				"DOI": "10.2143/LV.72.4.3251316",
				"abstractNote": "Abstract :Trop souvent, on parle indistinctement de Bible et de Parole de Dieu. Or, la Bible n’est pas spontanément Parole de Dieu: elle le devient. L’enjeu est important. Dieu se révèle comme Parole incarnée, comme Parole adressée, comme une Bonne Nouvelle qui nous concerne et nous implique. Mais hélas certains textes bibliques ne nous parlent pas. Ils sont trop difficiles, ou trop violents, ou trop rabâchés pour être relus, ou pas lus du tout… Et pourtant, ils font partie de la Bible, dont l’inerrance et la canonicité sont incontestables. Nous trouverons ici quelques pistes pour que, de ces textes, émerge une Parole quand même. En tout état de cause, quel que soit le passage biblique lu et étudié, le lecteur qui s’astreint à une lecture attentive et à un travail sur le texte est assuré que Dieu ne restera pas sans lui parler.",
				"issue": "4",
				"libraryCatalog": "Peeters",
				"pages": "371-382",
				"publicationTitle": "Lumen Vitae",
				"shortTitle": "Laisser la Parole de Dieu faire son travail",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3251316&journal_code=LV",
				"volume": "72",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3281483&journal_code=LV",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mission et œcuménisme: de la concurrence à la collaboration?:  9e Forum bilingue «Fribourg Église dans le monde», Université de Fribourg, les 12-13 octobre 2017",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Amherdt",
						"firstName": " François-Xavier"
					}
				],
				"date": "2018",
				"DOI": "10.2143/LV.73.1.3281483",
				"abstractNote": "Abstract :not available",
				"issue": "1",
				"libraryCatalog": "Peeters",
				"pages": "109-113",
				"publicationTitle": "Lumen Vitae",
				"shortTitle": "Mission et œcuménisme",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3281483&journal_code=LV",
				"volume": "73",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3248537&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "HREC Members' Personal Values Influence Decision Making in Contentious Cases",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Handal",
						"firstName": " Boris "
					},
					{
						"creatorType": "author",
						"lastName": "Watson",
						"firstName": " Kevin "
					},
					{
						"creatorType": "author",
						"lastName": "Brewer",
						"firstName": " Keagan"
					},
					{
						"creatorType": "author",
						"lastName": "Fellman",
						"firstName": " Marc "
					},
					{
						"creatorType": "author",
						"lastName": "Maher",
						"firstName": " Marguerite "
					},
					{
						"creatorType": "author",
						"lastName": "Ianiello",
						"firstName": " Hannah "
					},
					{
						"creatorType": "author",
						"lastName": "White",
						"firstName": " Miya"
					}
				],
				"date": "2017",
				"DOI": "10.2143/EP.24.3.3248537",
				"ISSN": "1783-1431",
				"abstractNote": "Abstract :This article identifies 14 contentious issues faced by Human Research Ethics Committees (HRECs). The authors argue that HREC members will respond variably to these issues based on their own fundamental values and worldview. In particular, we propose that personal interpretations of current ethics regulations and HREC members’ attitudes to consequentialism, Kantianism, and utilitarianism in some cases affect their responses to contentious research issues. We seek to promote understanding of how personal and professional backgrounds of HREC reviewers influence their approaches to value-laden issues embedded in ethics applications. Taking the form of a literature review, our contribution highlights the need for further exploration of how HREC members make decisions, and what factors influence the outcomes of ethics applications.",
				"issue": "3",
				"libraryCatalog": "Peeters",
				"pages": "405-439",
				"publicationTitle": "Ethical Perspectives",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3248537&journal_code=EP",
				"volume": "24",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=563038&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Philosophy and the Multi-Cultural Context of (Post)Apartheid South Africa",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Van Der Merwe",
						"firstName": "W.l."
					}
				],
				"date": "July 1996",
				"DOI": "10.2143/EP.3.2.563038",
				"ISSN": "1783-1431",
				"abstractNote": "Abstract :Umuntu ngumuntu ngabantu is the Zulu version of a traditional African aphorism. Although with considerable loss of culture-specific meaning, it can be translated as: 'A human being is a human being through (the otherness of) other human beings.' Still, its meaning can be interpreted in various ways of which I would like to highlight only two, in accordance with the grammar of the central concept 'Ubuntu' which denotes both a state of being and one of becoming.",
				"issue": "2",
				"libraryCatalog": "Peeters",
				"pages": "76-90",
				"publicationTitle": "Ethical Perspectives",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=563038&journal_code=EP",
				"volume": "3",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3256900&journal_code=BYZ",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Unedited <i>Life</i> of St John Chrysostom by Nicetas David the Paphlagonian:  <i>Editio princeps</i> , Part I",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Antonopoulou",
						"firstName": " Theodora"
					}
				],
				"date": "2017",
				"DOI": "10.2143/BYZ.87.0.3256900",
				"ISSN": "2294-6209",
				"abstractNote": "Abstract :The paper presents the first ever edition of the first half (chapters 1-28) of the long Life of St John Chrysostom by Nicetas David the Paphlagonian, composed in all probability in the second quarter of the tenth century. This is an important text for a number of reasons, as explained in detail in my introduction to the Life published in Byz, 86 (2016), pp. 1-51. The critical edition is preceded by a study of the unique manuscript and an exposition of the peculiarities of the author’s language as well as of the editorial principles.",
				"libraryCatalog": "Peeters",
				"pages": "1-67",
				"publicationTitle": "Byzantion",
				"shortTitle": "The Unedited <i>Life</i> of St John Chrysostom by Nicetas David the Paphlagonian",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3256900&journal_code=BYZ",
				"volume": "87",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3288399&journal_code=OGE",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Een kasteel voor Christus:  De burcht als mediatief beeld aan het einde van de middeleeuwen",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Dlabačová",
						"firstName": " Anna"
					}
				],
				"date": "2019-2020",
				"DOI": "10.2143/OGE.90.1.3288399",
				"ISSN": "1783-1652",
				"abstractNote": "Abstract :The allegorical Middle Dutch text, Een gheestelijc casteel [A Spiritual Castle], encourages readers to mentally construct a precious castle in which they will be able to receive Christ. The description of the castle provides a mnemonic image that readers could use during prayer and meditation. Although the author makes no direct reference to Luke 10:38, the allegory is authorized by the exegesis of this Biblical passage: Mary is the castle in which Jesus has entered and she keeps the active and spiritual life, symbolized by Martha and Mary Magdalene, in perfect balance. The Middle Dutch text likely originated around 1460 in the Brussels convent of Jericho (Regular Canonesses). In the last decade of the fifteenth century, the text, now adapted for a lay audience, was printed in Antwerp by Govaert Bac. He was an important member of the Antwerp guild of St Luke, the professional association of painters and printers that also included Antwerp’s principal chamber of rhetoric. The attractive architectural allegory and exercise presented in Bac’s booklet finds parallels in contemporary paintings of Mary and the Christ Child, who are often either portrayed in a landscape with a castle-like architectural structure clearly visible in the background or within a castle-like building. In the former compositions the castle can be viewed as a reflection or ‘echo’ of Mary as a castle (the painting thus portrays two castles) while at the same time functioning as a reminder to those familiar with the meditative image of the spiritual castle to pursue their spiritual skopos. The latter images could be seen as portraying a castle (Mary) within a castle (building), similar to Mary (or the womb) within a room, or even Jan van Eyck’s Madonna in the Church.",
				"issue": "1-2",
				"libraryCatalog": "Peeters",
				"pages": "19-62",
				"publicationTitle": "Ons Geestelijk Erf",
				"shortTitle": "Een kasteel voor Christus",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3288399&journal_code=OGE",
				"volume": "90",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3287449&journal_code=RTL",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Un canon biblique en vingt-quatre livres:  L'alphabet, les Anciens de l'Apocalypse et Homère",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Bogaert",
						"firstName": " Pierre-Maurice"
					}
				],
				"date": "2020",
				"DOI": "10.2143/RTL.51.1.3287449",
				"ISSN": "1783-8401",
				"abstractNote": "Abstract :Le chiffre vingt-quatre est appliqué au nombre des livres saints dans le judaïsme à côté de vingt-deux. Ces chiffres sont respectivement ceux des lettres des alphabets grec et hébreu. Les vingt-quatre chants de l’Iliade et de l’Odyssée, éléments fondamentaux de l’éducation hellénistique, sont depuis toujours désignés par les lettres de l’alphabet grec. L’opposition Homère – livres saints, attestée dans le judaïsme rabbinique, peut impliquer la référence à ce compte des chants. Du côté chrétien, le compte des vingt-quatre livres de l’Ancien Testament a été mis en rapport avec les Anciens de l’Apocalypse. En outre, Origène met en relation les livres de l’Ancien Testament avec l’alphabet hébreu, tandis qu’Hilaire et Jérôme connaissent les chiffres de vingt-deux et vingt-quatre des deux alphabets. La convergence de ces observations conduit à une hypothèse obligée, la référence implicite aux épopées homériques dans les traditions juive et chrétienne à propos du canon biblique. Cette référence est un des facteurs qui ont permis de rassembler sous la même autorité des livres de genres littéraires variés.Number twenty-four is applied to the books of Holy Scriptures in Judaism, as also number twenty-two. Those are respectively the numbers of the letters of the Greek and Hebrew alphabets. The twenty-four books of the Iliad and of the Odyssey, fundamental pieces of the Hellenistic education, are designated of old by the letters of the Greek alphabet. The opposition Homer – Sacred Books, witnessed in rabbinical Judaism, may imply a reference to this counting of the Homeric books. On the Christian side, the counting of the twenty-four books has been put in relation with the Elders of the Apocalypse. Moreover, Origen relates the number of the books of the Old Testament and the Hebrew alphabet, while Hilary and Jerome know of the numbers twenty-two and twenty-four of both Hebrew and Greek alphabets. Convergence of those established facts leads to a necessary hypothesis, the implicit reference to the Homeric epics in the Jewish and Christian traditions about the Biblical canon. This reference is one of the factors which permitted to assemble books of diverse literary genres under a sole authority.",
				"issue": "1",
				"libraryCatalog": "Peeters",
				"pages": "1-14",
				"publicationTitle": "Revue Théologique de Louvain",
				"shortTitle": "Un canon biblique en vingt-quatre livres",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3287449&journal_code=RTL",
				"volume": "51",
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
	}
]
/** END TEST CASES **/
