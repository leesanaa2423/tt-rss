'use strict'

/* eslint-disable no-new */
/* global __, ngettext, App, Headlines, xhrPost, xhrJson, dojo, dijit, PluginHost, Notify, $$, Ajax, fox */

const Article = {
	_scroll_reset_timeout: false,
	getScoreClass: function (score) {
		if (score > 500) {
			return "score-high";
		} else if (score > 0) {
			return "score-half-high";
		} else if (score < -100) {
			return "score-low";
		} else if (score < 0) {
			return "score-half-low";
		} else {
			return "score-neutral";
		}
	},
	getScorePic: function (score) {
		if (score > 500) {
			return "trending_up";
		} else if (score > 0) {
			return "trending_up";
		} else if (score < 0) {
			return "trending_down";
		} else {
			return "trending_neutral";
		}
	},
	selectionSetScore: function () {
		const ids = Headlines.getSelected();

		if (ids.length > 0) {
			const score = prompt(__("Please enter new score for selected articles:"));

			if (!isNaN(parseInt(score))) {
				ids.each((id) => {
					const row = $("RROW-" + id);

					if (row) {
						row.setAttribute("data-score", score);

						const pic = row.select(".icon-score")[0];

						pic.innerHTML = Article.getScorePic(score);
						pic.setAttribute("title", score);

						["score-low", "score-high", "score-half-low", "score-half-high", "score-neutral"]
							.each(function(scl) {
								if (row.hasClassName(scl))
									row.removeClassName(scl);
							});

						row.addClassName(Article.getScoreClass(score));
					}
				});
			}

		} else {
			alert(__("No articles selected."));
		}
	},
	setScore: function (id, pic) {
		const row = pic.up("div[id*=RROW]");

		if (row) {
			const score_old = row.getAttribute("data-score");
			const score = prompt(__("Please enter new score for this article:"), score_old);

			if (!isNaN(parseInt(score))) {
				row.setAttribute("data-score", score);

				const pic = row.select(".icon-score")[0];

				pic.innerHTML = Article.getScorePic(score);
				pic.setAttribute("title", score);

				["score-low", "score-high", "score-half-low", "score-half-high", "score-neutral"]
					.each(function(scl) {
						if (row.hasClassName(scl))
							row.removeClassName(scl);
					});

				row.addClassName(Article.getScoreClass(score));
			}
		}
	},
	popupOpenUrl: function(url) {
		const w = window.open("");

		w.opener = null;
		w.location = url;
	},
	/* popupOpenArticle: function(id) {
		const w = window.open("",
			"ttrss_article_popup",
			"height=900,width=900,resizable=yes,status=no,location=no,menubar=no,directories=no,scrollbars=yes,toolbar=no");

		if (w) {
			w.opener = null;
			w.location = "backend.php?op=article&method=view&mode=raw&html=1&zoom=1&id=" + id + "&csrf_token=" + App.getInitParam("csrf_token");
		}
	}, */
	cdmUnsetActive: function (event) {
		const row = $("RROW-" + Article.getActive());

		if (row) {
			row.removeClassName("active");

			if (event)
				event.stopPropagation();

			return false;
		}
	},
	close: function () {
		if (dijit.byId("content-insert"))
			dijit.byId("headlines-wrap-inner").removeChild(
				dijit.byId("content-insert"));

		Article.setActive(0);
	},
	displayUrl: function (id) {
		const query = {op: "article", method: "get_metadata_by_id", id: id};

		xhrJson("backend.php", query, (reply) => {
			if (reply && reply.link) {
				prompt(__("Article URL:"), reply.link);
			} else {
				alert(__("No URL could be displayed for this article."));
			}
		});
	},
	openInNewWindow: function (id) {
		/* global __csrf_token */
		App.postOpenWindow("backend.php",
			{ "op": "article", "method": "redirect", "id": id, "csrf_token": __csrf_token });

		Headlines.toggleUnread(id, 0);
	},
	renderEnclosures: function (enclosures) {

		// enclosure list was handled by backend (HOOK_FORMAT_ENCLOSURES)
		if (enclosures.formatted)
			return enclosures.formatted;

		return `
				${enclosures.can_inline ?
					`<div class='attachments-inline'>
						${enclosures.entries.map((enc) => {
							if (!enclosures.inline_text_only) {
								if (enc.content_type && enc.content_type.indexOf("image/") != -1) {
									return `<p>
										<img loading="lazy"
											width="${enc.width ? enc.width : ''}"
											height="${enc.height ? enc.height : ''}"
											src="${App.escapeHtml(enc.content_url)}"
											title="${App.escapeHtml(enc.title ? enc.title : enc.content_url)}"/>
									</p>`
								} else if (enc.content_type && enc.content_type.indexOf("audio/") != -1 && App.audioCanPlay(enc.content_type)) {
									return `<p class='inline-player' title="${App.escapeHtml(enc.content_url)}">
										<audio preload="none" controls="controls">
											<source type="${App.escapeHtml(enc.content_type)}" src="${App.escapeHtml(enc.content_url)}"/>
										</audio>
									</p>
									`;
								} else {
									return `<p>
										<a target="_blank" href="${App.escapeHtml(enc.content_url)}"
											title="${App.escapeHtml(enc.title ? enc.title : enc.content_url)}"
											rel="noopener noreferrer">${App.escapeHtml(enc.content_url)}</a>
										</p>`
								}
							} else {
								return `<p>
									<a target="_blank" href="${App.escapeHtml(enc.content_url)}"
										title="${App.escapeHtml(enc.title ? enc.title : enc.content_url)}"
										rel="noopener noreferrer">${App.escapeHtml(enc.content_url)}</a>
									</p>`
							}
						}).join("")}
					</div>` : ''}
			${enclosures.entries.length > 0 ?
				`<div class="attachments" dojoType="fox.form.DropDownButton">
					<span>${__('Attachments')}</span>
					<div dojoType="dijit.Menu" style="display: none">
					${enclosures.entries.map((enc) => `
							<div onclick='Article.popupOpenUrl("${App.escapeHtml(enc.content_url)}")'
								title="${App.escapeHtml(enc.title ? enc.title : enc.content_url)}" dojoType="dijit.MenuItem">
									${enc.title ? enc.title : enc.filename}
							</div>
						`).join("")}
					</div>
				</div>` : ''}
			`
	},
	render: function (article) {
		App.cleanupMemory("content-insert");

		dijit.byId("headlines-wrap-inner").addChild(
			dijit.byId("content-insert"));

		const c = dijit.byId("content-insert");

		try {
			c.domNode.scrollTop = 0;
		} catch (e) {
		}

		c.attr('content', article);
		PluginHost.run(PluginHost.HOOK_ARTICLE_RENDERED, c.domNode);

		//Headlines.correctHeadlinesOffset(Article.getActive());

		try {
			c.focus();
		} catch (e) {
		}
	},
	formatComments: function(hl) {
		let comments = "";

		if (hl.comments || hl.num_comments > 0) {
			let comments_msg = __("comments");

			if (hl.num_comments > 0) {
				comments_msg = hl.num_comments + " " + ngettext("comment", "comments", hl.num_comments)
			}

			comments = `<a target="_blank" rel="noopener noreferrer" href="${App.escapeHtml(hl.comments ? hl.comments : hl.link)}">(${comments_msg})</a>`;
		}

		return comments;
	},
	unpack: function(row) {
		if (row.hasAttribute("data-content")) {
			console.log("unpacking: " + row.id);

			const container = row.querySelector(".content-inner");

			container.innerHTML = row.getAttribute("data-content").trim();

			// blank content element might screw up onclick selection and keyboard moving
			if (container.textContent.length == 0)
				container.innerHTML += "&nbsp;";

			// in expandable mode, save content for later, so that we can pack unfocused rows back
			if (App.isCombinedMode() && $("main").hasClassName("expandable"))
				row.setAttribute("data-content-original", row.getAttribute("data-content"));

			row.removeAttribute("data-content");

			PluginHost.run(PluginHost.HOOK_ARTICLE_RENDERED_CDM, row);
		}
	},
	pack: function(row) {
		if (row.hasAttribute("data-content-original")) {
			console.log("packing", row.id);
			row.setAttribute("data-content", row.getAttribute("data-content-original"));
			row.removeAttribute("data-content-original");

			row.querySelector(".content-inner").innerHTML = "&nbsp;";
		}
	},
	view: function (id, no_expand) {
		this.setActive(id);
		Headlines.scrollToArticleId(id);

		if (!no_expand) {
			const hl = Headlines.objectById(id);

			if (hl) {

				const comments = this.formatComments(hl);

				const article = `<div class="post post-${hl.id}" data-article-id="${hl.id}">
					<div class="header">
						<div class="row">
							<div class="title"><a target="_blank" rel="noopener noreferrer"
								title="${App.escapeHtml(hl.title)}"
								href="${App.escapeHtml(hl.link)}">${hl.title}</a></div>
							<div class="date">${hl.updated_long}</div>
						</div>
						<div class="row">
							<div class="buttons left">${hl.buttons_left}</div>
							<div class="comments">${comments}</div>
							<div class="author">${hl.author}</div>
							<i class="material-icons">label_outline</i>
							<span id="ATSTR-${hl.id}">${hl.tags_str}</span>
							&nbsp;<a title="${__("Edit tags for this article")}" href="#"
								onclick="Article.editTags(${hl.id})">(+)</a>
							<div class="buttons right">${hl.buttons}</div>
						</div>
					</div>
					<div id="POSTNOTE-${hl.id}">${hl.note}</div>
					<div class="content" lang="${hl.lang ? hl.lang : 'en'}">
						${hl.content}
						${Article.renderEnclosures(hl.enclosures)}
					</div>
					</div>`;

				Headlines.toggleUnread(id, 0);
				this.render(article);
			}
		}

		return false;
	},
	editTags: function (id) {
		const dialog = new fox.SingleUseDialog({
			title: __("Edit article Tags"),
			content: `
				${App.FormFields.hidden("id", id.toString())}
				${App.FormFields.hidden("op", "article")}
				${App.FormFields.hidden("method", "setArticleTags")}

				<header class='horizontal'>
					${__("Tags for this article (separated by commas):")}
				</header>

				<section>
					<textarea dojoType='dijit.form.SimpleTextarea' rows='4' disabled='true'
						id='tags_str' name='tags_str'></textarea>
					<div class='autocomplete' id='tags_choices' style='display:none'></div>
				</section>

				<footer>
					<button dojoType='dijit.form.Button' type='submit' class='alt-primary'>
						${__('Save')}
					</button>
					<button dojoType='dijit.form.Button' onclick='App.dialogOf(this).hide()'>
						${__('Cancel')}
					</button>
				</footer>
			`,
			execute: function () {
				if (this.validate()) {
					Notify.progress("Saving article tags...", true);

					xhrPost("backend.php", this.attr('value'), (transport) => {
						try {
							Notify.close();
							dialog.hide();

							const data = JSON.parse(transport.responseText);

							if (data) {
								const id = data.id;

								const tags = $("ATSTR-" + id);
								const tooltip = dijit.byId("ATSTRTIP-" + id);

								if (tags) tags.innerHTML = data.content;
								if (tooltip) tooltip.attr('label', data.content_full);
							}
						} catch (e) {
							App.Error.report(e);
						}
					});
				}
			},
		});

		const tmph = dojo.connect(dialog, 'onShow', function () {
			dojo.disconnect(tmph);

			xhrJson("backend.php", {op: "article", method: "printArticleTags", id: id}, (reply) => {

				dijit.getEnclosingWidget($("tags_str"))
					.attr('value', reply.tags.join(", "))
					.attr('disabled', false);

				new Ajax.Autocompleter("tags_str", "tags_choices",
					"backend.php?op=article&method=completeTags",
					{tokens: ',', paramName: "search"});
			});
		});

		dialog.show();

	},
	cdmMoveToId: function (id, params) {
		params = params || {};

		const force_to_top = params.force_to_top || false;

		const ctr = $("headlines-frame");
		const row = $("RROW-" + id);

		if (!row || !ctr) return;

		if (force_to_top || !App.Scrollable.fitsInContainer(row, ctr)) {
			ctr.scrollTop = row.offsetTop;
		}
	},
	setActive: function (id) {
		if (id != Article.getActive()) {
			console.log("setActive", id, "was", Article.getActive());

			$$("div[id*=RROW][class*=active]").each((row) => {
				row.removeClassName("active");
				Article.pack(row);
			});

			const row = $("RROW-" + id);

			if (row) {
				Article.unpack(row);

				row.removeClassName("Unread");
				row.addClassName("active");

				PluginHost.run(PluginHost.HOOK_ARTICLE_SET_ACTIVE, row.getAttribute("data-article-id"));
			}
		}
	},
	getActive: function () {
		const row = document.querySelector("#headlines-frame > div[id*=RROW][class*=active]");

		if (row)
			return row.getAttribute("data-article-id");
		else
			return 0;
	},
	scrollByPages: function (page_offset) {
		App.Scrollable.scrollByPages($("content-insert"), page_offset);
	},
	scroll: function (offset) {
		App.Scrollable.scroll($("content-insert"), offset);
	},
	mouseIn: function (id) {
		this.post_under_pointer = id;
	},
	mouseOut: function (/* id */) {
		this.post_under_pointer = false;
	},
	getUnderPointer: function () {
		return this.post_under_pointer;
	}
}
