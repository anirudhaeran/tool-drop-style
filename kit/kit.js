// Nick Sarev style kit — runtime helpers. Every helper adds tweens to the (paused, seekable)
// main timeline at absolute times; nothing reads clocks or plays media.
window.NS = (function () {
  const $ = (sel, root) => (typeof sel === "string" ? (root || document).querySelector(sel) : sel);
  const $$ = (sel, root) => (typeof sel === "string" ? Array.from((root || document).querySelectorAll(sel)) : [].concat(sel));

  const fmt = {
    int: (v) => Math.round(v).toLocaleString("en-US"),
    dec1: (v) => v.toFixed(1),
    k: (v) => (v >= 1000 ? Math.round(v / 1000) + "K" : String(Math.round(v))),
  };

  /** Fade + rise + slight scale in (the default entrance). */
  function pop(tl, sel, t, o) {
    o = o || {};
    const els = $$(sel);
    tl.fromTo(
      els,
      { opacity: 0, y: o.y ?? 26, x: o.x ?? 0, scale: o.scale ?? 0.94 },
      { opacity: 1, y: 0, x: 0, scale: 1, duration: o.d ?? 0.26, ease: o.ease || "power3.out", stagger: o.stagger || 0 },
      t,
    );
  }

  /** Springy pop for badges, chips, icons. */
  function bounce(tl, sel, t, o) {
    o = o || {};
    tl.fromTo($$(sel), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: o.d ?? 0.38, ease: "back.out(2.2)", stagger: o.stagger || 0 }, t);
  }

  /** Fast move with motion blur. */
  function fly(tl, sel, from, t, o) {
    o = o || {};
    tl.fromTo($$(sel), { opacity: 0, filter: "blur(14px)", ...from }, { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", duration: o.d ?? 0.32, ease: "power3.out", stagger: o.stagger || 0 }, t);
  }

  function out(tl, sel, t, o) {
    o = o || {};
    tl.to($$(sel), { opacity: 0, y: o.y ?? -10, duration: o.d ?? 0.18, ease: "power2.in" }, t);
  }

  /** Number roll-up written into an element's text. */
  function count(tl, sel, from, to, t, d, format, pre, post) {
    const node = $(sel);
    const f = typeof format === "function" ? format : fmt[format || "int"];
    pre = pre || "";
    post = post || "";
    const o = { v: from };
    node.textContent = pre + f(from) + post;
    tl.to(o, { v: to, duration: d, ease: "power2.out", onUpdate: () => (node.textContent = pre + f(o.v) + post) }, t);
  }

  /** Typewriter. */
  function type(tl, sel, text, t, d) {
    const node = $(sel);
    const o = { n: 0 };
    node.textContent = "";
    tl.to(o, { n: text.length, duration: d, ease: "none", onUpdate: () => (node.textContent = text.slice(0, Math.round(o.n))) }, t);
  }

  /** Draw an SVG stroke. */
  function draw(tl, sel, t, d) {
    $$(sel).forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: d ?? 0.6, ease: "power2.inOut" }, t);
    });
  }

  /** Highlighter / bar grows from the left. */
  function sweep(tl, sel, t, d) {
    tl.fromTo($$(sel), { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: d ?? 0.35, ease: "power2.out" }, t);
  }

  /** Slow push-in on any element (screenshot cards, logos). */
  function drift(tl, sel, t, d, to) {
    tl.fromTo($$(sel), { scale: 1 }, { scale: to ?? 1.05, duration: d, ease: "sine.inOut" }, t);
  }

  /** Zoom into a detail (e.g. a number on a screenshot). origin is a CSS transform-origin. */
  function zoom(tl, sel, t, d, scale, origin, extra) {
    const to = Object.assign({ scale, duration: d, ease: "power3.inOut", transformOrigin: origin }, extra || {});
    tl.fromTo($$(sel), { scale: 1, x: 0, y: 0 }, to, t);
  }

  /** Numbered item card: tile rises, the header slides up from behind it. */
  function item(tl, root, t) {
    const r = $(root);
    tl.fromTo($(".tile", r), { opacity: 0, y: 70, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "power3.out" }, t);
    tl.fromTo($(".item-head", r), { opacity: 0, y: 190 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, t + 0.06);
    tl.to($(".tile", r), { y: -10, duration: 1.2, ease: "sine.inOut" }, t + 0.45);
  }

  /**
   * A view of the timeline whose position arguments are multiplied by k — lets a plan authored
   * on one timebase (e.g. a sped-up cut) drive a re-cut footage. Tween durations are unchanged.
   */
  // tl positions authored on the plan timebase → composition time (t × k − shift)
  function scaled(tl, k, shift = 0) {
    if (k === 1 && !shift) return tl;
    const posArg = { to: 2, from: 2, set: 2, fromTo: 3, call: 2 };
    return new Proxy(tl, {
      get(target, prop) {
        const v = target[prop];
        if (prop in posArg) {
          return (...args) => {
            const i = posArg[prop];
            if (typeof args[i] === "number") args[i] = args[i] * k - shift;
            return v.apply(target, args);
          };
        }
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
  }

  /** Captions: hard swaps, styled per layout; optional count-up and two-tier emphasis. */
  function captions(tl, list) {
    const host = $("#caps");
    list.forEach((c, i) => {
      const el = document.createElement("div");
      el.id = "cap-" + i;
      el.className = "cap pos-" + c.pos + (c.emph ? " emph" : "");
      el.style.setProperty("--y", c.y + "px");
      if (c.emph) {
        el.innerHTML = '<span class="lead"></span><span class="key"></span>';
        el.children[0].textContent = c.emph.lead;
        el.children[1].textContent = c.emph.key;
      } else {
        const span = document.createElement("span");
        span.className = c.font + " " + c.tone;
        span.textContent = c.text;
        el.appendChild(span);
      }
      host.appendChild(el);
      tl.set(el, { opacity: 1 }, c.show);
      tl.set(el, { opacity: 0 }, c.hide);
      if (c.emph) tl.fromTo(el.children[1], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, c.emph.at);
      if (c.count) count(tl, el.querySelector("span"), c.count.from, c.count.to, c.count.t, c.count.d, c.count.fmt, c.count.pre, c.count.post);
    });
  }

  return { $, $$, fmt, pop, bounce, fly, out, count, type, draw, sweep, drift, zoom, item, scaled, captions };
})();
