!async function () {
  function toDomainOmittedPath(urlObj) {
    return urlObj.pathname + urlObj.search + urlObj.hash;
  }

  function normalizeUrl(targetUrl, baseUrl) {
    let base;
    try {
      base = new URL(baseUrl);
    } catch (e) {
      return targetUrl;
    }

    let absoluteTarget;
    try {
      absoluteTarget = new URL(targetUrl);
    } catch (e) {
      absoluteTarget = null;
    }

    if (absoluteTarget) {
      return absoluteTarget.origin === base.origin
        ? toDomainOmittedPath(absoluteTarget)
        : targetUrl;
    }

    let resolved;
    try {
      resolved = new URL(targetUrl, base);
    } catch (e) {
      return targetUrl;
    }

    const domainOmitted = toDomainOmittedPath(resolved);
    return domainOmitted.length < targetUrl.length ? domainOmitted : targetUrl;
  }

  async function appendOgimgIfAllowed(params, url) {
    if (!url || url.startsWith("data:")) {
      return;
    }

    try {
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) {
        return;
      }

      const contentLengthHeader = res.headers.get("content-length");
      if (contentLengthHeader) {
        const size = Number(contentLengthHeader);
        if (Number.isFinite(size) && size >= 512 * 1024) {
          return;
        }
      }

      params.append("ogimg", url);
    } catch (e) {}
  }

  async function appendFallbackFaviconIfAllowed(params, pageUrl, hasFavicon) {
    if (hasFavicon) {
      return;
    }

    let currentUrl;
    try {
      currentUrl = new URL(pageUrl);
    } catch (e) {
      return;
    }

    const fallbackFaviconUrl = `${currentUrl.origin}/favicon.ico`;

    try {
      const res = await fetch(fallbackFaviconUrl, { method: "HEAD" });
      if (!res.ok) {
        return;
      }

      params.append(
        "favicon",
        JSON.stringify({
          rel: "icon",
          href: normalizeUrl(fallbackFaviconUrl, pageUrl),
        }),
      );
    } catch (e) {}
  }

  let targetUrl = location.href;
  try {
    if (location.href.startsWith("chrome://offline")) {
      const reload = new URLSearchParams(location.search).get("reload");
      if (reload) {
        targetUrl = reload;
      }
    }
  } catch (e) {}

  if (!location.href.startsWith("https://chatgpt.com/")) {
    try {
      let candidate = null;
      const ogUrlMeta = document.querySelector(
        'html > head > meta[property="og:url"]',
      );
      if (ogUrlMeta && ogUrlMeta.content) {
        candidate = ogUrlMeta.content;
      }

      if (!candidate) {
        const canonicalLink = document.querySelector(
          'html > head > link[rel="canonical"]',
        );
        if (canonicalLink && canonicalLink.href) {
          candidate = canonicalLink.href;
        }
      }

      if (candidate) {
        try {
          const abs = new URL(candidate, location.href);
          targetUrl = abs.href;
        } catch (e) {
          targetUrl = candidate;
        }
      }
    } catch (e) {}
  }

  const params = new URLSearchParams();
  if (document.title) {
    params.set("title", document.title);
  }
  params.set("url", targetUrl);

  const faviconLinks = Array.from(
    document.querySelectorAll(
      "html > head > link[rel~=icon], html > head > link[rel~=apple-touch-icon]",
    ),
  );

  faviconLinks.forEach(function (link) {
    const faviconObj = Array.from(link.attributes).reduce(function (acc, attr) {
      if (attr.name === "href") {
        try {
          acc[attr.name] = normalizeUrl(attr.value, targetUrl);
        } catch (e) {
          acc[attr.name] = attr.value;
        }
      } else if (attr.name === "rel") {
        acc[attr.name] = "icon";
      } else {
        acc[attr.name] = attr.value;
      }

      return acc;
    }, {});

    if (faviconObj.href && !faviconObj.href.startsWith("data:")) {
      params.append("favicon", JSON.stringify(faviconObj));
    }
  });

  await appendFallbackFaviconIfAllowed(params, targetUrl, faviconLinks.length > 0);

  const ogimgCandidates = [];
  try {
    const currentUrl = new URL(targetUrl);
    if (
      (currentUrl.hostname === "www.youtube.com" ||
        currentUrl.hostname === "m.youtube.com") &&
      currentUrl.pathname === "/watch"
    ) {
      const vid = currentUrl.searchParams.get("v");
      if (vid) {
        const thumbUrl = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;
        ogimgCandidates.push(thumbUrl);
      }
    }

    if (currentUrl.hostname.includes("amazon.")) {
      const landingImage = document.getElementById("landingImage");
      if (landingImage && landingImage.src) {
        ogimgCandidates.push(normalizeUrl(landingImage.src, targetUrl));
      }
    }
  } catch (e) {}

  Array.from(
    document.querySelectorAll('html > head > meta[property="og:image"]'),
  ).forEach(function (meta) {
    let content = meta.content;
    if (content && !content.startsWith("data:")) {
      content = normalizeUrl(content, targetUrl);
      ogimgCandidates.push(content);
    }
  });

  for (const ogimg of ogimgCandidates) {
    await appendOgimgIfAllowed(params, ogimg);
  }

  const suspendUrl = "__SUSPEND_URL__#?" + params.toString();
  location.href = suspendUrl;
}();
