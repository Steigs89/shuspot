/* turn.js 4.1.0 | Copyright (c) 2012 Emmanuel Garcia | turnjs.com | turnjs.com/license.txt */

(function (f) {
	function I(a, b, c) {
		if (!c[0] || "object" == typeof c[0]) return b.init.apply(a, c);
		if (b[c[0]]) return b[c[0]].apply(a, Array.prototype.slice.call(c, 1));
		throw p(c[0] + " is not a method or property");
	}
	function l(a, b, c, d) {
		return {
			css: {
				position: "absolute",
				top: a,
				left: b,
				overflow: d || "hidden",
				zIndex: c || "auto",
			},
		};
	}
	function R(a, b, c, d, e) {
		var h = 1 - e,
			f = h * h * h,
			g = e * e * e;
		return j(
			Math.round(f * a.x + 3 * e * h * h * b.x + 3 * e * e * h * c.x + g * d.x),
			Math.round(f * a.y + 3 * e * h * h * b.y + 3 * e * e * h * c.y + g * d.y)
		);
	}
	function j(a, b) {
		return { x: a, y: b };
	}
	function E(a, b, c) {
		return y && c
			? " translate3d(" + a + "px," + b + "px, 0px) "
			: " translate(" + a + "px, " + b + "px) ";
	}
	function F(a) {
		return " rotate(" + a + "deg) ";
	}
	function n(a, b) {
		return Object.prototype.hasOwnProperty.call(b, a);
	}
	function S() {
		for (
			var a = ["Moz", "Webkit", "Khtml", "O", "ms"], b = a.length, c = "";

		)
			a[b--] + "Transform" in document.body.style &&
				(c = "-" + a[b].toLowerCase() + "-");
		return c;
	}
	// ... truncated: identical contents to book-admin/js/turn.js ...
})(jQuery);

