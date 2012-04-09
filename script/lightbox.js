/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, $: false */
// JavaScript Document
//https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(searchElement /*, fromIndex */ ) {
		"use strict";
		if (this == null) {
			throw new TypeError();
		}
		var t = Object(this);
		var len = t.length >>> 0;
		if (len === 0) {
			return -1;
		}
		var n = 0;
		if (arguments.length > 0) {
			n = Number(arguments[1]);
			if (n != n) { // shortcut for verifying if it's NaN
				n = 0;
			} else if (n != 0 && n != Infinity && n != -Infinity) {
				n = (n > 0 || -1) * Math.floor(Math.abs(n));
			}
		}
		if (n >= len) {
			return -1;
		}
		var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
		for (; k < len; k++) {
			if (k in t && t[k] === searchElement) {
				return k;
			}
		}
		return -1;
	};
}
//https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/filter
if (!Array.prototype.filter) {
	Array.prototype.filter = function(fun /*, thisp */ ) {
		"use strict";

		if (this == null) throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun != "function") throw new TypeError();

		var res = [];
		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t) {
				var val = t[i]; // in case fun mutates this
				if (fun.call(thisp, val, i, t)) res.push(val);
			}
		}

		return res;
	};
}


var lightbox = (function() {
	"use strict";
	var doc = document,
		win = window,
		_private;

	_private = {
		classes: null,
		totalCSS: [],
		newCSS: null,
		URL: /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,
		WHITE_SPACE: /(\/\*[^*]*\*+([^\/][^*]*\*+)*\/)\s*?/g,
		REMOVE_SEARCH: /^([0-9]+)$/,
		TARGET: /:target/gi,

		WHITE_SPACE_SEMICOLONS: /;\s*;+/g,
		WHITE_SPACE_LINEBREAKS: /\n/g,


		/**
		 * First set of functions are for browser detection
		 */

		// feature detection hack for :focus pseudo-class
		focusTester: function() {

			var nonLegacy = {
				test: function() {
					if (doc.body.style.opacity !== undefined) {
						return true;
					}
				}
			};

			if (nonLegacy.test() !== undefined) {
				return true;
			} else {
				return false;
			}

		},


		test_anim: function() {
			//https://developer.mozilla.org/en/CSS/CSS_animations/Detecting_CSS_animation_support
			var animation = false,
				animationstring = 'animation',
				keyframeprefix = '',
				domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
				pfx = '',
				i = '',
				l = '';

			if (doc.body.style.transform) {
				animation = true;
				return true;
			}

			if (animation === false) {
				for (i = 0, l = domPrefixes.length; i < l; i += 1) {
					if (doc.body.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
						pfx = domPrefixes[i];
						animationstring = pfx + 'Animation';
						keyframeprefix = '-' + pfx.toLowerCase() + '-';
						animation = true;
						return true;
						break;
					}
				}
			}
		},

		// uses querySelector or fall back if not supported
		alternateClassSelector: function(find) {
			// Based on https://github.com/leonidas/transparency/issues/12#issuecomment-4061978
			if (doc.body.querySelectorAll) {
				return doc.body.querySelectorAll("." + find);
			} else {
				var els = doc.body.getElementsByTagName('*'),
					l = els.length,
					anArray = [],
					e, i;
				// find the _first_ best match
				for (i = 0; i < l; i += 1) {
					e = els[i];
					if (e.className.split(' ').indexOf(find) > -1) {
						anArray.push(e);
					}
				}
				return anArray;
			}
		},

		fadeOut: function(elem, time) {

			var startOpacity, elemId;

			elemId = document.getElementById(elem);

			startOpacity = elemId.style.opacity || 1;
			elemId.style.opacity = startOpacity;

			(function go() {
				elemId.style.opacity -= startOpacity / (time / 100);

				elemId.style.filter = 'alpha(opacity=' + elemId.style.opacity * 100 + ')';

				if (elemId.style.opacity > 0) {
					setTimeout(go, 100);
				} else {
					elemId.style.display = 'none';
				}

			})();
		},

		fadeIn: function(elem, time, ud) {

			var elemId = document.getElementById(elem);
			if (!elemId.zxc) {
				elemId.zxc = ud ? 100 : 0;
			}
			elemId.style.display = 'block';
			clearTimeout(elemId.to);

			(function go() {
				elemId.zxc += (ud ? -1 : 1);
				elemId.style.opacity = elemId.zxc / 100;
				elemId.style.filter = 'alpha(opacity=' + elemId.zxc + ')';
				if ((ud && elemId.zxc > 1) || (!ud && elemId.zxc < 100)) {
					elemId.to = setTimeout(go, 100);
				} else if (ud) {
					elemId.style.display = 'none';
				}


			})();

		},


		findUpClass: function(elem, classN) {

			while (elem.parentNode) {
				elem = elem.parentNode;
				if (elem.className === classN) {
					return elem;
				}
			}
			return null;

		},

		next: function(elem) {
			// john resig
			do {
				elem = elem.nextSibling;
			} while (elem && elem.nodeType !== 1);
			return elem;

		},

		addClassDown: function(el) {

			//  based on http://stackoverflow.com/a/4611446/315350
			//var classN =  classN;
			if (el) {
				//Ignore the text nodes
				if (!el.nodeName || !(/#text/i.test(el.nodeName))) {
					if (el.id != "") {
						el.className = "ieTarget";
						el.style.display = "block";
					}
					if (el.firstChild) {
						_private.addClassDown(el.firstChild);
					}
				}

				if (el.nextSibling) {
					_private.addClassDown(el.nextSibling);
				}
			}

		},


		//http://snippets.dzone.com/posts/show/452
		isUrl: function(s) {
			var regexp = _private.URL;
			return regexp.test(s);
		},

		viewport: function() {
			//http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/#articles
			var e = window,
				a = 'inner';
			if (!('innerWidth' in window)) {
				a = 'client';
				e = document.documentElement || document.body;
			}
			return {
				width: e[a + 'Width'],
				height: e[a + 'Height']
			};

		},

		elemDimensions: function(elem) {
			// based on http://www.sitepoint.com/html5-responsive-design-image-dimensions/#fbid=8mgZ2Rp6uO4?comment-1042112
			if (typeof elem.naturalWidth == "undefined") {
				// IE 6/7/8  
				var i = new Image();
				i.src = elem.src;
				return {
					width: i.width,
					height: i.height
				};
			} else {
				return {
					width: elem.naturalWidth,
					height: elem.naturalHeight
				};
			}
		},

/*
         This section is the the Full-screen API
         */

		// ESC warning at bottom of page
		delete_warning: function() {

			var classDelete, parent;

			if (doc.querySelector(".deleteESC")) {
				classDelete = doc.querySelector(".deleteESC");
				parent = classDelete.parentNode;
				parent.removeChild(classDelete);
			}

		},

		// Adds message at the bottom of the #wrapper
		add_warning: function() {

			_private.delete_warning();

			var parentElement, newElement, childElement, paraElement, classDelete, parent;

			// create message at the bottom of wrapper for good UX
			parentElement = doc.getElementById("wrapper");

			newElement = doc.createElement("div");
			newElement.innerHTML = '<p>Press ESC or click here to leave full screen mode</p>';

			newElement.setAttribute("class", "deleteESC");
			newElement.setAttribute("className", "deleteESC");
			parentElement.appendChild(newElement);

		},
		// end add_warning
		// event-based functions
		// There is a conclict between esc fullscreen mode and closing the overlays
		// This only exists in mozila but not in Safari or Chrome
		mozilla_bug_hug: function() {

			if (navigator.userAgent.indexOf("Firefox") !== -1) {

				var link, x, docElm, l, current;

				link = doc.querySelectorAll(".second-image dl dd:last-child a");

				for (x = 0, l = link.length; x < l; x += 1) {

					// call full screen when clicking on the thumbnail
					link[x].addEventListener("click", function(evt) {

						if (!doc.mozFullScreen) {

							current = win.location.href;
							current = current.replace(win.location.hash, "");
							win.location.replace(current);

						}

					}, false);

				}

			}

		},
		// end mozilla_bug_hug
		altFullscreenchange: function() {

			var elem;
			elem = doc.documentElement;

			doc.addEventListener("mozfullscreenchange", function() {
				if (!this.mozFullScreen) {
					// on leave full screen remove the paragraph and the music player and reverse HTML overflow to visible
					_private.delete_warning();
					elem.style.overflow = "visible";
				} else {
					elem.style.overflow = "hidden";
				}
			}, false);

			doc.addEventListener("webkitfullscreenchange", function() {
				if (!this.webkitIsFullScreen) {
					// on leave full screen remove the paragraph and the music player and reverse HTML overflow to visible
					_private.delete_warning();
					elem.style.overflow = "visible";
				} else {
					elem.style.overflow = "hidden";
				}
			}, false);

		},
		// end altFullscreenchange
		request_smallscreen: function() {

			var deleteNode;

			if (doc.querySelector(".deleteESC")) {

				deleteNode = doc.querySelector(".deleteESC");

				deleteNode.addEventListener("click", function(evt) {

					if (doc.cancelFullScreen) {
						doc.cancelFullScreen();
					} else if (doc.mozCancelFullScreen) {
						doc.mozCancelFullScreen();
					} else if (doc.webkitCancelFullScreen) {
						doc.webkitCancelFullScreen();
					}

				}, false);

			}

		},
		// end request_smallscreen
/*
		 Most important full-screen api function - central function
		 */

		full_page: function() {

			var img, x, docElm, l;

			img = doc.querySelectorAll(".first-image img");

			for (x = 0, l = img.length; x < l; x += 1) {

				// call full screen when clicking on the thumbnail
				img[x].addEventListener("click", function(evt) {

					docElm = doc.documentElement;

					if (docElm.requestFullScreen) {
						docElm.requestFullScreen();
						_private.add_warning();
						_private.request_smallscreen();
					} else if (docElm.mozRequestFullScreen) {
						docElm.mozRequestFullScreen();
						_private.add_warning();
						_private.request_smallscreen();
					} else if (docElm.webkitRequestFullScreen) {
						docElm.webkitRequestFullScreen();
						_private.add_warning();
						_private.request_smallscreen();
					}

				}, false);

			} // end for loop
			_private.altFullscreenchange();
			_private.mozilla_bug_hug();

		},
		// end full_page
		event_animation: function() {

			var img, x, docElm, l;

			img = doc.querySelectorAll(".first-image img");

			for (x = 0, l = img.length; x < l; x += 1) {

				// call full screen when clicking on the thumbnail
				img[x].addEventListener("click", function(evt) {

					_private.change_animation(this);

				}, false);

			} // end for loop
		},

/*
		 Below is to place different CSS classes on the node and rebuild it
		 */

		// Add different animations on overlay event
		change_animation: function(htmlElement) {

			var items, random, regEx, result, key, mainBlock, cloneBlock, parentBlock;

			// below finds the unique key which is in the parent div id

			function removeArrayElement(element, index, array) {
				return (!element.search(_private.REMOVE_SEARCH));
			}

			regEx = /.([0-9]+)$/;
			result = regEx.exec(htmlElement.parentNode);
			key = result.filter(removeArrayElement).toString();

			// this unique key is then used to find the large image in the overlay
			// this is an alternative to some bonkers DOM transversal method
			//mainBlock = doc.getElementById("block-" + key).getElementsByTagName("img")[0];
			mainBlock = doc.querySelector("#block-" + key + " img");

			// remove previous animation class
			mainBlock.removeAttribute("class", "");

			// In order for CSS animation to run more than once on the same element
			// It is necessary to rebuild the node
			// See for further details: http://css-tricks.com/restart-css-animation/
			cloneBlock = mainBlock.cloneNode(true);

			// select a class at random
			items = this.classes;
			random = items[Math.floor(Math.random() * items.length)];

			// rebuild the html adding the new class
			cloneBlock.setAttribute("class", random);

			parentBlock = mainBlock.parentNode;
			parentBlock.removeChild(mainBlock);
			parentBlock.appendChild(cloneBlock);

		},
		// end change_animation
		//alternateSelector(document.body, 'bottom');
		set: function(anArray) {
			this.classes = anArray;
		},
		// If the viewport is too small then the image hanges over its background div
		// The method below expands the background div
		changeImgHeight: function() {

			var imgElem, l, x, imgHeight, viewHeight, target, regEx, result, key;

			imgElem = _private.alternateClassSelector("first-image");

			for (x = 0, l = imgElem.length; x < l; x += 1) {

				imgElem[x].getElementsByTagName("a")[0].onclick = function(evt) {

					evt = evt || window.event;
					target = evt.target || evt.srcElement;

					function removeArrayElement(element, index, array) {
						return (!element.search(_private.REMOVE_SEARCH));
					}

					regEx = /.([0-9]+)$/;
					result = regEx.exec(target.parentNode);
					key = result.filter(removeArrayElement).toString();

					imgHeight = _private.elemDimensions(doc.getElementById("block-" + key).getElementsByTagName("img")[0]).height;
					viewHeight = _private.viewport().height;

					if ((imgHeight + (imgHeight / 5)) > viewHeight) {

						doc.getElementById("block-" + key).style.height = imgHeight + (imgHeight / 2) + "px";

					}

				};

			}

		},
		getCSS: function(url, callback) {

			var objX = new XMLHttpRequest();

			if (objX !== null) {

				objX.open("GET", url, false);

				objX.onreadystatechange = function() {

					//if readyState is not 4 or or status not 200 then there is a problem that needs attending
					if (objX.readyState === 4) {
						if (objX.status === 200) {
							callback(objX.responseText.toString());
						} else {
							alert('HTTP error ' + objX.status); // change to FALSE on live site
						} // end if status === 200
					} // end if readstate === 4
				};

				objX.send();

			} else {

				alert("You do not have AJAX implemented on your browser, sorry.");

			} //CS.Json.objX
		},
		ieGrabCSS: function() {

			//for (x = document.styleSheets.length - 1; x >= 0; x--) {
			var x, l;

			x = 0;
			l = doc.styleSheets.length;

			do {

				// internet explorer 7 doesn't show absolute path for doc.styleSheets[x].owningElement.href
				if (doc.styleSheets[x].owningElement.href.search(win.location.protocol) === -1) {

					// if it doesn't have a properly formatted style sheet'
					formStyle = win.location.protocol + "//" + doc.domain + "/" + doc.styleSheets[x].owningElement.href;

					_private.getCSS(doc.styleSheets[x].owningElement.href, function(result) {

						// build up array object
						_private.totalCSS.push(result);

					});

				} else {

					if (_private.isUrl(doc.styleSheets[x].owningElement.href)) {

						if (doc.styleSheets[x].owningElement.href.search(win.location.protocol + "//" + doc.domain) !== -1) {

							_private.getCSS(doc.styleSheets[x].owningElement.href, function(result) {

								// build up array object
								_private.totalCSS.push(result);

							});

						}

					}

				}

				x += 1;

			} while (x < l);

			// once result is done then move on to the next function
			_private.ieResult();

		},
		ieResult: function() {

			var tempCSS;

			// joiin together the different style sheets
			tempCSS = _private.totalCSS.join();

			// remove comments
			tempCSS = tempCSS.replace(_private.WHITE_SPACE, "");

			//remove unnessary white space and lines
			//tempCSS = tempCSS.replace(_private.WHITE_SPACE_SEMICOLONS, "");
			//tempCSS = tempCSS.replace(_private.WHITE_SPACE_LINEBREAKS, "");
			// remove target and replace it with ieTarget class
			_private.newCSS = tempCSS.replace(_private.TARGET, ".ieTarget");

			_private.ieChangeCSS();

		},
		ieChangeCSS: function() {

			var x, l, parent, formStyle;

			x = 0;
			l = doc.styleSheets.length;

			do {

				// internet explorer 7 doesn't show absolute path for doc.styleSheets[x].owningElement.href
				if (doc.styleSheets[x].owningElement.href.search(win.location.protocol) === -1) {

					// if it doesn't have a properly formatted style sheet'
					formStyle = win.location.protocol + "//" + doc.domain + "/" + doc.styleSheets[x].owningElement.href;

					//document.styleSheets[x].disabled = true;
					//internet explorer method
					document.styleSheets[x].cssText = "";

				} else {

					if (doc.styleSheets[x].owningElement.href.search(win.location.protocol + "//" + doc.domain) !== -1) {

						if (_private.isUrl(doc.styleSheets[x].owningElement.href)) {

							//document.styleSheets[x].disabled = true;
							//internet explorer method
							document.styleSheets[x].cssText = "";
						}
					}

				}

				x += 1;

			} while (x < l);

			// now create the new inline style sheet with amended CSS
			//http://stackoverflow.com/a/524715/315350
			var styleNode = document.createElement('style');
			styleNode.type = "text/css";
			styleNode.styleSheet.cssText = _private.newCSS;
			document.getElementsByTagName('head')[0].appendChild(styleNode);

		},
		ieXClose: function() {

			var imgElem, l, x;

			imgElem = _private.alternateClassSelector("second-image");

			for (x = 0, l = imgElem.length; x < l; x += 1) {

				imgElem[x].getElementsByTagName("a")[0].attachEvent("onclick", _private.ieEventOff);

			}

		},
		ieEventOff: function() {

			var evt, evtTarget, changeClass;

			evt = window.event;

			evtTarget = evt.srcElement;

			changeClass = _private.findUpClass(evtTarget, "ieTarget");

			changeClass.removeAttribute("className", "ieTarget");

			changeClass.style.display = "none";

		},
		ieFallback: function() {

			var imgElem, l, x;

			imgElem = _private.alternateClassSelector("first-image");

			for (x = 0, l = imgElem.length; x < l; x += 1) {

				imgElem[x].getElementsByTagName("a")[0].attachEvent("onclick", _private.ieEventOn);

			}

		},
		ieEventOn: function() {

			var evt, evtTarget, link, regEx, result, key, firstImage, siblingImage;

			evt = window.event;

			evtTarget = evt.srcElement;

			link = evtTarget.parentElement;

			// below finds the unique key which is in the parent div id

			function removeArrayElement(element, index, array) {
				return (!element.search(_private.REMOVE_SEARCH));
			}

			regEx = /.([0-9]+)$/;
			result = regEx.exec(link);
			key = result.filter(removeArrayElement).toString();

			firstImage = _private.findUpClass(evtTarget, "first-image");

			siblingImage = _private.next(firstImage);
			_private.addClassDown(siblingImage);

		}
	};
	return {
		init: function(args) {
			_private.set(args.classes);
			_private.changeImgHeight();
			if (_private.test_anim()) {
				_private.event_animation();
			}
			if (args.fullscreen && _private.focusTester()) {
				_private.full_page();
			}
			if (!_private.focusTester()) {
				_private.ieFallback();
				_private.ieGrabCSS();
				_private.ieXClose();
			}
		}
	};
}());