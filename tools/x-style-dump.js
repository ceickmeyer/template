// tools/x-style-dump.js
// Paste into the DevTools console on x.com to dump the exact layout of a few
// tweets (every element's box, spacing, fonts, colors, borders and the SVG
// icon paths) to a JSON file, so the archive's tweet styles can be matched
// against the real thing.
//
// - On the home timeline it dumps the first tweet, the first one with a
//   photo, and the first quote tweet.
// - On a tweet's own page (x.com/<user>/status/<id>) it dumps the tweet
//   above it (thread layout), the opened tweet, and the first reply.
//
// Use 100% browser zoom and the dark "Lights out" theme. Chrome may ask you
// to type "allow pasting" in the console first.
(() => {
 try {
  const PROPS = [
    'display', 'position', 'flexDirection', 'flexWrap', 'alignItems', 'alignSelf', 'justifyContent', 'gap',
    'flexGrow', 'flexShrink', 'flexBasis', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'color',
    'textAlign', 'whiteSpace', 'wordBreak', 'overflowWrap', 'textOverflow', 'textDecorationLine',
    'backgroundColor', 'backgroundImage', 'backgroundSize',
    'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderRightWidth', 'borderBottomWidth',
    'borderBottomColor', 'borderLeftWidth', 'borderTopLeftRadius', 'borderTopRightRadius',
    'borderBottomLeftRadius', 'borderBottomRightRadius', 'boxShadow', 'outline',
    'ovdoerflow', 'opacity', 'objectFit', 'objectPosition', 'aspectRatio', 'verticalAlign', 'zIndex',
    'transform', 'transition', 'cursor', 'fill', 'stroke', 'strokeWidth'
  ];
  // Inherited properties are only recorded where they differ from the parent.
  const INHERITED = new Set([
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'color',
    'textAlign', 'whiteSpace', 'wordBreak', 'overflowWrap', 'cursor', 'fill', 'stroke', 'strokeWidth'
  ]);
  const DEFAULTS = new Set([
    '', 'none', 'normal', 'auto', 'rgba(0, 0, 0, 0)', 'static', 'visible', '0px', '0', 'start', 'baseline',
    'nowrap', 'row', 'stretch', 'left', 'solid', 'clip', 'fill', 'all', '50% 50%'
  ]);
  const ALWAYS = new Set(['display', 'width', 'height', 'fontSize', 'fontWeight', 'lineHeight', 'color']);

  const round = (n) => Math.round(n * 10) / 10;

  function styles(el, parentStyle) {
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of PROPS) {
      const v = cs[p];
      if (INHERITED.has(p) && parentStyle && parentStyle[p] === v) continue;
      if (!ALWAYS.has(p) && DEFAULTS.has(v)) continue;
      if (p === 'flexShrink' && v === '1') continue;
      if (p === 'borderTopColor' && cs.borderTopWidth === '0px') continue;
      if (p === 'borderBottomColor' && cs.borderBottomWidth === '0px') continue;
      if (p === 'outline' && cs.outlineStyle === 'none') continue;
      if (p === 'opacity' && v === '1') continue;
      out[p] = v;
    }
    return { cs, out };
  }

  function ownText(el) {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent;
    t = t.trim();
    return t ? t.slice(0, 80) : undefined;
  }

  function walk(el, origin, parentStyle, depth) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0 && el.tagName !== 'svg') return null;
    const { cs, out } = styles(el, parentStyle);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    const node = {
      tag: el.tagName.toLowerCase(),
      testid: el.getAttribute('data-testid') || undefined,
      role: el.getAttribute('role') || undefined,
      aria: (el.getAttribute('aria-label') || '').slice(0, 60) || undefined,
      box: [round(r.left - origin.left), round(r.top - origin.top), round(r.width), round(r.height)],
      text: ownText(el),
      style: out
    };
    if (el.tagName === 'IMG') node.img = { natural: [el.naturalWidth, el.naturalHeight], alt: el.alt.slice(0, 40) };
    if (el.tagName.toLowerCase() === 'svg') {
      node.svg = {
        viewBox: el.getAttribute('viewBox'),
        paths: [...el.querySelectorAll('path')].map((p) => p.getAttribute('d'))
      };
      return node; // no need to walk inside icons
    }
    if (depth < 60) {
      const kids = [...el.children].map((c) => walk(c, origin, cs, depth + 1)).filter(Boolean);
      if (kids.length) node.kids = kids;
    }
    return node;
  }

  function dump(article, label) {
    // The cell around the article holds the separator lines between tweets.
    const root = article.closest('[data-testid="cellInnerDiv"]') || article;
    const origin = root.getBoundingClientRect();
    return { label, text: article.innerText.slice(0, 120), tree: walk(root, origin, null, 0) };
  }

  const articles = [...document.querySelectorAll('article[data-testid="tweet"]')];
  if (!articles.length) return console.warn('No tweets found on this page.');

  // The opened tweet: X marks it tabindex="-1"; failing that, it's the one
  // whose timestamp links to the status id in the URL.
  const statusId = location.pathname.match(/\/status\/(\d+)/)?.[1];
  let focused = articles.findIndex((a) => a.getAttribute('tabindex') === '-1');
  if (focused < 0 && statusId) {
    focused = articles.findIndex((a) => a.querySelector(`a[href*="/status/${statusId}"] time`));
    if (focused < 0) focused = articles.findIndex((a) => !a.querySelector('a[href*="/status/"] time'));
  }
  const picks = [];
  if (focused >= 0) {
    if (focused > 0) picks.push([articles[focused - 1], 'thread-above-opened-tweet']);
    picks.push([articles[focused], 'opened-tweet']);
    if (articles[focused + 1]) picks.push([articles[focused + 1], 'first-reply']);
  } else {
    picks.push([articles[0], 'timeline-first']);
    const photo = articles.find((a) => a.querySelector('[data-testid="tweetPhoto"]'));
    if (photo && photo !== articles[0]) picks.push([photo, 'timeline-with-photo']);
    const quote = articles.find((a) => a.querySelectorAll('[data-testid="User-Name"]').length > 1);
    if (quote && !picks.some(([a]) => a === quote)) picks.push([quote, 'timeline-quote']);
  }

  const column = document.querySelector('[data-testid="primaryColumn"]');
  const result = {
    url: location.href,
    viewport: [innerWidth, innerHeight],
    devicePixelRatio,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    column: column && { box: [round(column.getBoundingClientRect().width)], style: styles(column, null).out },
    fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
    tweets: picks.map(([a, label]) => dump(a, label))
  };

  const json = JSON.stringify(result);
  const name = `x-dump-${focused >= 0 ? 'status' : 'timeline'}-${Date.now()}.json`;
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([json], { type: 'application/json' })),
    download: name
  });
  link.click();
  console.log(`Saved ${name} (${Math.round(json.length / 1024)} KB): ${picks.map(([, l]) => l).join(', ')}`);
 } catch (err) {
  console.error(err);
  alert('x-style-dump failed: ' + err.message);
 }
})();
