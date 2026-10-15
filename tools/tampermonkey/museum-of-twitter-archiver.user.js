// ==UserScript==
// @name         Museum of Twitter Archiver
// @namespace    museum-of-twitter-archiver
// @version      1.1.0
// @description  Adds an "Archive" button to tweets on x.com/twitter.com that copies clean, structured tweet data (real engagement counts, video URLs, quoted tweets including deleted ones, and reply-to context) to the clipboard for pasting into the admin importer.
// @match        https://twitter.com/*
// @match        https://x.com/*
// @run-at       document-start
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  // Flip to true and open the browser console if the button stops finding
  // data — X's GraphQL response shape is not public API and can change
  // without notice. The DOM fallback below still works even if this whole
  // interception layer breaks, just without video or real counts.
  const DEBUG = false;
  const log = (...args) => DEBUG && console.log('[museum-archiver]', ...args);

  // X's GraphQL API returns literal HTML-entity-encoded text ("&#39;"
  // instead of "'") for some older tweets' full_text — a known artifact,
  // not something introduced by this script. Decode it here so it never
  // gets saved into markdown_content in the first place. (Can't share this
  // with the app's own copy in twitterTextParser.js — this file runs in a
  // completely separate context with no module system.)
  function decodeHtmlEntities(text) {
    if (!text) return text;
    return text
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  }

  // ---------------------------------------------------------------------
  // 1. Network interception: X's web app fetches tweet data as JSON from
  //    its internal GraphQL endpoints (timeline, tweet detail, etc). Every
  //    one of those responses embeds one or more objects shaped like
  //    { rest_id, legacy: { full_text, ... }, core/user_results: {...} }.
  //    Capturing those as they fly by gives us the *real* tweet text,
  //    media (including actual video.twimg.com URLs — never available
  //    from the DOM/clipboard, since X only puts a blob: URL there), and
  //    engagement counts — all more reliable than scraping rendered HTML.
  // ---------------------------------------------------------------------
  const tweetCache = new Map(); // rest_id -> normalized tweet data
  const MAX_CACHE = 500;

  function cacheTweet(restId, data) {
    if (tweetCache.has(restId)) tweetCache.delete(restId); // refresh LRU order
    tweetCache.set(restId, data);
    if (tweetCache.size > MAX_CACHE) {
      const oldest = tweetCache.keys().next().value;
      tweetCache.delete(oldest);
    }
  }

  function bestVideoUrl(extendedEntities) {
    const media = extendedEntities?.media || [];
    const videoMedia = media.find(m => m.type === 'video' || m.type === 'animated_gif');
    const variants = videoMedia?.video_info?.variants || [];
    const mp4Variants = variants.filter(v => v.content_type === 'video/mp4');
    if (mp4Variants.length === 0) return undefined;
    return mp4Variants.reduce((best, v) => ((v.bitrate || 0) > (best.bitrate || 0) ? v : best)).url;
  }

  function photoUrls(extendedEntities) {
    const media = extendedEntities?.media || [];
    return media.filter(m => m.type === 'photo').map(m => m.media_url_https).filter(Boolean);
  }

  function expandBody(legacy) {
    let body = decodeHtmlEntities(legacy.full_text || '');
    const urls = legacy.entities?.urls || [];
    for (const u of urls) {
      if (u.url && u.expanded_url) body = body.split(u.url).join(u.expanded_url);
    }
    // Strip the trailing t.co token that points at the attached media card
    // itself — it's never a link the author actually typed, just an
    // auto-appended pointer to the photo/video already captured above.
    const mediaUrls = (legacy.extended_entities?.media || []).map(m => m.url).filter(Boolean);
    for (const u of mediaUrls) {
      body = body.replace(u, '').trim();
    }
    return body.trim();
  }

  function formatTime(createdAt) {
    // X's legacy created_at looks like "Wed Oct 10 20:19:24 +0000 2018",
    // which Date can parse directly.
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return '';
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${time} · ${date}`;
  }

  function upgradeAvatar(url) {
    if (!url) return undefined;
    return url.replace(/_(normal|bigger|mini|200x200)(\.\w+)$/i, '_400x400$2');
  }

  // Normalizes one raw GraphQL "tweet result" node (handles both the
  // flattened `core.user_results` schema and the older bare `legacy.user`
  // shape some endpoints still return).
  // X marks a deleted/suspended quoted tweet as a "TweetTombstone" instead
  // of a normal tweet result. This exact shape is not public API and is
  // reconstructed from general knowledge of X's GraphQL schema, not a
  // verified live sample — the fallback message covers us if the field
  // path is slightly off.
  function tombstoneMessage(result) {
    if (!result || result.__typename !== 'TweetTombstone') return null;
    return result.tombstone?.text?.text || 'This Tweet is unavailable.';
  }

  function normalizeTweetResult(node) {
    try {
      const legacy = node.legacy;
      if (!legacy) return null;

      const userResult = node.core?.user_results?.result;
      const userLegacy = userResult?.legacy || userResult?.core;
      const name = decodeHtmlEntities(userLegacy?.name) || userLegacy?.screen_name;
      const handle = userLegacy?.screen_name ? `@${userLegacy.screen_name}` : undefined;
      const avatarUrl = upgradeAvatar(userResult?.avatar?.image_url || userLegacy?.profile_image_url_https);

      if (!name || !handle) return null;

      const quotedResult = node.quoted_status_result?.result;
      const quoteTombstone = tombstoneMessage(quotedResult);
      // quotedResult (if a real tweet, not a tombstone) is also independently
      // walked and cached by scanForTweets's generic recursion — we only
      // need to remember its id here to look it up later.
      const quotedRestId = !quoteTombstone ? quotedResult?.rest_id : undefined;

      return {
        restId: node.rest_id,
        name,
        handle,
        body: expandBody(legacy),
        avatarUrl,
        mediaUrls: photoUrls(legacy.extended_entities),
        videoUrl: bestVideoUrl(legacy.extended_entities),
        time: formatTime(legacy.created_at),
        views: node.views?.count ? String(node.views.count) : undefined,
        counts: {
          replies: legacy.reply_count || 0,
          retweets: legacy.retweet_count || 0,
          likes: legacy.favorite_count || 0
        },
        inReplyToScreenName: legacy.in_reply_to_screen_name || undefined,
        quotedRestId,
        quoteTombstone: quoteTombstone || undefined
      };
    } catch (e) {
      log('normalize failed', e);
      return null;
    }
  }

  // Generic, depth/size-capped scan for tweet-result-shaped objects. Avoids
  // hardcoding the exact nested path to each GraphQL operation's tweet
  // entries (timeline vs detail vs search all nest differently, and X
  // reshuffles this periodically) at the cost of walking more of the tree.
  function scanForTweets(node, depth, budget) {
    if (!node || typeof node !== 'object' || depth > 14 || budget.count > 20000) return;
    budget.count++;

    if (Array.isArray(node)) {
      for (const item of node) scanForTweets(item, depth + 1, budget);
      return;
    }

    if (node.rest_id && node.legacy && typeof node.legacy === 'object') {
      const normalized = normalizeTweetResult(node);
      if (normalized) {
        cacheTweet(normalized.restId, normalized);
        log('cached tweet', normalized.restId, normalized.handle);
      }
    }

    for (const key in node) {
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        scanForTweets(node[key], depth + 1, budget);
      }
    }
  }

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const promise = originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && url.includes('/graphql/')) {
      promise
        .then(response => response.clone().json())
        .then(json => scanForTweets(json, 0, { count: 0 }))
        .catch(() => {}); // not JSON, or already consumed — ignore
    }
    return promise;
  };

  // ---------------------------------------------------------------------
  // 2. Button injection: a MutationObserver watches for rendered tweets and
  //    adds an "Archive" button to each one's action bar.
  // ---------------------------------------------------------------------
  function tweetIdFromArticle(article) {
    const link = article.querySelector('a[href*="/status/"] time')?.closest('a');
    const match = link?.getAttribute('href')?.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }

  // X's profile links inside a tweet are relative ("/bobby"), not absolute
  // ("https://x.com/bobby") — confirmed against a real captured tweet.
  // Resolve against location.origin and only accept a single-segment path
  // (a bare username), so this doesn't also match the tweet's own
  // permalink anchor ("/bobby/status/123"), which has two segments.
  function extractHandle(container) {
    const links = Array.from(container?.querySelectorAll('a[href]') || []);
    for (const link of links) {
      try {
        const path = new URL(link.getAttribute('href'), location.origin).pathname;
        const segments = path.split('/').filter(Boolean);
        if (segments.length === 1 && /^\w+$/.test(segments[0])) {
          return '@' + segments[0];
        }
      } catch {
        // ignore unparseable hrefs
      }
    }
    return undefined;
  }

  // Confirmed real format: aria-label="70 replies, 15872 reposts, 42340
  // likes, 418 bookmarks" on the action bar's [role="group"]. Parsed here
  // so the DOM fallback can still carry real counts even without a
  // GraphQL capture, instead of falling all the way back to synthetic ones.
  function extractCountsFromActionBar(actionBar) {
    const label = actionBar?.getAttribute('aria-label');
    if (!label) return undefined;
    const num = (word) => {
      const match = label.match(new RegExp(`([\\d,]+)\\s*${word}`, 'i'));
      return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
    };
    return { replies: num('repl'), retweets: num('repost'), likes: num('like') };
  }

  // A quoted tweet embed is NOT a nested article[data-testid="tweet"] —
  // confirmed against a real sample — it's a plain div[role="link"]
  // (no href; navigated via JS) that contains its own
  // Tweet-User-Avatar/User-Name/tweetText, qualified by requiring a nested
  // tweetText so this doesn't match some other role="link" wrapper (e.g. a
  // link-preview card uses an <a role="link">, a different tag).
  function findQuoteContainer(article) {
    const candidates = Array.from(article.querySelectorAll('div[role="link"]'));
    return candidates.find(el => el.querySelector('[data-testid="tweetText"]')) || null;
  }

  // Unlike the main tweet, the quoted author's handle has no <a href> at
  // all — confirmed against a real sample, the whole card is one big
  // role="link" div and the handle is just inert text next to the name.
  // Regex over the author-info wrapper's text (name + handle + time, NOT
  // the tweetText body, which lives in a separate sibling) is the
  // reliable way to pull it out here.
  function extractQuoteFromDom(container) {
    if (!container) return undefined;

    const nameBlock = container.querySelector('[data-testid="User-Name"]');
    const name = nameBlock?.querySelector('span')?.textContent?.trim();
    const authorInfo = nameBlock?.parentElement;
    const handleMatch = authorInfo?.textContent?.match(/@\w+/);

    const avatarImg = container.querySelector('[data-testid="Tweet-User-Avatar"] img');
    const bodyEl = container.querySelector('[data-testid="tweetText"]');
    const timeEl = authorInfo?.querySelector('time') || container.querySelector('time');
    // Unverified against a real media-in-quote sample — same caveat as the
    // main tweet's own media selector.
    const mediaImgs = Array.from(container.querySelectorAll('[data-testid="tweetPhoto"] img'));

    if (!name && !bodyEl) return undefined;

    return {
      name: name || 'Unknown User',
      handle: handleMatch ? handleMatch[0] : '@unknown',
      body: bodyEl?.textContent?.trim() || '',
      avatarUrl: upgradeAvatar(avatarImg?.getAttribute('src')),
      mediaUrls: mediaImgs.map(img => img.getAttribute('src')).filter(Boolean),
      time: timeEl?.textContent?.trim() || ''
    };
  }

  // Falls back to scraping the rendered DOM when we don't have a cached
  // network capture for this tweet yet (e.g. script just loaded). No video
  // this way — X only exposes a blob: URL for it outside the network
  // response — but counts, quote tweets, and everything else can still be
  // real.
  //
  // Still doesn't capture "Replying to @x" context — I don't have a live
  // sample of that markup yet. If a tweet needs that, give it a moment to
  // load so the GraphQL capture in buildPayload can pick it up instead
  // (capturedVia: "api").
  //
  // Also doesn't detect a deleted/unavailable quoted tweet from the DOM —
  // no sample of that case yet either, so a tombstoned quote will come
  // through as whatever X renders in its place rather than `unavailable`.
  function domFallback(article, tweetId, tweetUrl) {
    const quoteContainer = findQuoteContainer(article);

    // A quote card nests its own copies of every one of these data-testids,
    // so a plain article-wide querySelector risks grabbing the quote's
    // version instead of the main tweet's own — confirmed happening for
    // `time` in a real sample, where the quote's timestamp happened to sit
    // earlier in document order than the main tweet's own. Scope every
    // main-tweet lookup to skip anything inside the quote subtree.
    function firstOutsideQuote(selector) {
      const matches = article.querySelectorAll(selector);
      for (const el of matches) {
        if (!quoteContainer || !quoteContainer.contains(el)) return el;
      }
      return null;
    }

    const nameBlock = firstOutsideQuote('[data-testid="User-Name"]');
    const handle = extractHandle(nameBlock);
    const name = nameBlock?.querySelector('span')?.textContent?.trim();

    const avatarImg = firstOutsideQuote('[data-testid="Tweet-User-Avatar"] img');
    const bodyEl = firstOutsideQuote('[data-testid="tweetText"]');
    const timeEl = firstOutsideQuote('time');
    const actionBar = article.querySelector('[role="group"]'); // not duplicated inside quote cards

    // Excludes images inside the quote container so a quoted tweet's own
    // photo isn't double-counted as the main tweet's media too.
    const mediaImgs = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img')).filter(
      img => !quoteContainer || !quoteContainer.contains(img)
    );

    return {
      __source: 'museum-of-twitter-archiver',
      version: 1,
      name: name || 'Unknown User',
      handle: handle || '@unknown',
      body: bodyEl?.textContent?.trim() || '',
      avatarUrl: upgradeAvatar(avatarImg?.getAttribute('src')),
      quote: extractQuoteFromDom(quoteContainer),
      mediaUrls: mediaImgs.map(img => img.getAttribute('src')).filter(Boolean),
      time: timeEl?.textContent?.trim() || '',
      counts: extractCountsFromActionBar(actionBar),
      tweetUrl,
      capturedVia: 'dom'
    };
  }

  // Resolves a cached tweet's quote reference into the exported payload
  // shape: either a real quoted tweet (looked up in tweetCache, since
  // scanForTweets already normalized and cached it independently as it
  // walked past it) or an "unavailable" placeholder if it was a tombstone.
  function resolveQuote(cached) {
    if (cached.quoteTombstone) {
      return { unavailable: cached.quoteTombstone };
    }
    if (!cached.quotedRestId) return undefined;

    const quoted = tweetCache.get(cached.quotedRestId);
    if (!quoted) return undefined; // seen the reference but not the tweet itself yet

    return {
      name: quoted.name,
      handle: quoted.handle,
      body: quoted.body,
      time: quoted.time,
      avatarUrl: quoted.avatarUrl,
      mediaUrls: quoted.mediaUrls
    };
  }

  function buildPayload(article) {
    const tweetId = tweetIdFromArticle(article);
    const tweetUrl = tweetId ? `${location.origin}${article.querySelector('a[href*="/status/"]')?.getAttribute('href') || ''}` : location.href;

    const cached = tweetId ? tweetCache.get(tweetId) : null;
    if (cached) {
      return {
        __source: 'museum-of-twitter-archiver',
        version: 1,
        name: cached.name,
        handle: cached.handle,
        body: cached.body,
        avatarUrl: cached.avatarUrl,
        mediaUrls: cached.mediaUrls,
        videoUrl: cached.videoUrl,
        time: cached.time,
        views: cached.views,
        counts: cached.counts,
        replyingTo: cached.inReplyToScreenName ? `@${cached.inReplyToScreenName}` : undefined,
        quote: resolveQuote(cached),
        tweetUrl,
        capturedVia: 'api'
      };
    }

    log('no cached network data for', tweetId, '— using DOM fallback');
    return domFallback(article, tweetId, tweetUrl);
  }

  function flashButton(button, ok) {
    const original = button.textContent;
    button.textContent = ok ? '✅' : '⚠️';
    setTimeout(() => (button.textContent = original), 1200);
  }

  function injectButton(article) {
    if (article.querySelector('.mota-archive-btn')) return;

    const actionBar = article.querySelector('[role="group"]');
    if (!actionBar) return;

    const button = document.createElement('div');
    button.className = 'mota-archive-btn';
    button.textContent = '📋';
    button.title = 'Copy for Museum of Twitter archive';
    button.style.cssText =
      'cursor:pointer;display:flex;align-items:center;justify-content:center;width:34.75px;height:34.75px;border-radius:50%;margin-left:4px;font-size:15px;user-select:none;';
    button.addEventListener('mouseenter', () => (button.style.backgroundColor = 'rgba(29,155,240,0.1)'));
    button.addEventListener('mouseleave', () => (button.style.backgroundColor = ''));

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      try {
        const payload = buildPayload(article);
        GM_setClipboard(JSON.stringify(payload), 'text');
        flashButton(button, true);
        log('copied payload', payload);
      } catch (e) {
        console.error('[museum-archiver] failed to build payload', e);
        flashButton(button, false);
      }
    });

    actionBar.appendChild(button);
  }

  const observer = new MutationObserver(() => {
    document.querySelectorAll('article[data-testid="tweet"]').forEach(injectButton);
  });

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('article[data-testid="tweet"]').forEach(injectButton);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
