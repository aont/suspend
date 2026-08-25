!function () {
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

  function appendOgimg(params, url) {
    if (!url || url.startsWith("data:")) {
      return;
    }

    params.append("ogimg", url);
  }

  function appendFallbackFavicon(params, pageUrl, hasFavicon) {
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

    params.append(
      "favicon",
      JSON.stringify({
        rel: "icon",
        href: normalizeUrl(fallbackFaviconUrl, pageUrl),
      }),
    );
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

  appendFallbackFavicon(params, targetUrl, faviconLinks.length > 0);

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

  ogimgCandidates.forEach(function (ogimg) {
    appendOgimg(params, ogimg);
  });

  const suspendUrl = "__SUSPEND_URL__#?" + params.toString();
  location.href = suspendUrl;
}();
