# Suspend

Suspend is a small static web utility that lets you "pseudo-suspend" the current page using a bookmarklet.

## What it does

- Generates a bookmarklet from `public/index.html`.
- Captures basic page metadata from the current tab (URL, title, icons, and preview image when available).
- Opens `public/suspend.html` to show a lightweight suspended view with:
  - A large link back to the original page
  - A preview image (Open Graph image or YouTube thumbnail when available)
  - Favicon fallback when no preview image exists
- Uses a service worker (`public/sw.js`) and cache to improve suspended page behavior.

## Project structure

- `public/index.html` – Bookmarklet generator/manual page.
- `public/suspend.html` – Suspended page renderer.
- `public/sw.js` – Service worker for caching support.
- `LICENSE` – License information.

## Usage

1. Open `public/index.html` in your browser.
2. Drag the **Bookmarklet** link to your bookmarks bar.
3. Visit any page you want to suspend.
4. Click the bookmarklet.
5. You will be redirected to the suspended view for that page.

## Notes

- This is a static client-side project; no backend is required.
- Some previews depend on metadata available on the target page.
