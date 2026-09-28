const escape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Minimal document for crawlers that do not run JavaScript. Visitors are redirected straight to the
 * app, so the page is never really seen by a person.
 */
export function renderPreviewPage(card) {
  const title = escape(card.title);
  const description = escape(card.description);
  const url = escape(card.url);
  const image = card.image ? escape(card.image) : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="${card.kind === "profile" ? "profile" : "article"}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
${image ? `<meta property="og:image" content="${image}">` : ""}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
${image ? `<meta name="twitter:image" content="${image}">` : ""}
<link rel="canonical" href="${url}">
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body>
<p><a href="${url}">${title}</a></p>
<script>location.replace(${JSON.stringify(card.url)});</script>
</body>
</html>`;
}
