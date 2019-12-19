const PROXIED_URL_PREFIXES = [
  // Hosted libraries (usually CDN's for open source).
  "ajax.aspnetcdn.com/",
  "ajax.cloudflare.com/",
  "ajax.googleapis.com/ajax/",
  "cdn.jsdelivr.net/",
  "cdnjs.com/",
  "cdnjs.cloudflare.com/",
  "code.jquery.com/",
  "maxcdn.bootstrapcdn.com/",
  "netdna.bootstrapcdn.com/",
  "oss.maxcdn.com/",
  "stackpath.bootstrapcdn.com/",

  // Popular scripts (can be site-specific)
  "a.optmnstr.com/app/js/",
  "cdn.onesignal.com/sdks/",
  "cdn.optimizely.com/",
  "cdn.shopify.com/s/",
  "css3-mediaqueries-js.googlecode.com/svn/",
  "html5shim.googlecode.com/svn/",
  "html5shiv.googlecode.com/svn/",
  "maps.google.com/maps/api/js",
  "maps.googleapis.com/maps/api/js",
  "pagead2.googlesyndication.com/pagead/js/",
  "platform.twitter.com/widgets.js",
  "platform-api.sharethis.com/js/",
  "s7.addthis.com/js/",
  "stats.wp.com/",
  "ws.sharethis.com/button/",
  "www.google.com/recaptcha/api.js",
  "www.google-analytics.com/analytics.js",
  "www.googletagmanager.com/gtag/js",
  "www.googletagmanager.com/gtm.js",
  "www.googletagservices.com/tag/js/gpt.js"
];

const PROXIED_URL_PREFIXES_RE = new RegExp(
  `^(https?:)?//(${PROXIED_URL_PREFIXES.join("|")})`
);

const PROXY_PREFIX = "/__proxy__";
const PROXY_PREFIX_RE = new RegExp(`^${PROXY_PREFIX}`);

addEventListener("fetch", event => {
  event.passThroughOnException();

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (isProxiedScriptRequest(request)) {
    event.respondWith(proxyScriptRequest(request));
    return;
  }

  if (isPageRequest(request)) {
    event.respondWith(rewritePage(request));
    return;
  }
});

function isPageRequest(request) {
  const accept = request.headers.get("accept");

  return accept && accept.includes("text/html");
}

function isProxiedScriptRequest(request) {
  const { pathname } = new URL(request.url);

  return PROXY_PREFIX_RE.test(pathname);
}

function createProxiedScriptUrl(url) {
  return PROXY_PREFIX + url.replace(/^(https?:)?\//, "");
}

function proxyScriptRequest(request) {
  let { pathname, search } = new URL(request.url);

  pathname = pathname.replace(PROXY_PREFIX_RE, "");

  return fetch(`https:/${pathname}${search}`, { ...request });
}

async function rewritePage(request) {
  const response = await fetch(request);

  return new HTMLRewriter()
    .on("script[src]", {
      element: el => {
        let src = el.getAttribute("src");

        if (PROXIED_URL_PREFIXES_RE.test(src)) {
          el.setAttribute("src", createProxiedScriptUrl(src));
        }
      }
    })
    .transform(response);
}
