import fs from "node:fs";
import * as terser from "terser";

const pagesUrl = process.env.GITHUB_PAGES_URL;
if (!pagesUrl) {
  throw new Error("GITHUB_PAGES_URL is required");
}

const suspendUrl = new URL("./suspend.html", pagesUrl).href;
const source = fs.readFileSync("public/bookmarklet.js", "utf8").replaceAll("__SUSPEND_URL__", suspendUrl);
const result = await terser.minify(source, { compress: { inline: false, sequences: false, join_vars: false }, mangle: false });
if (result.error || !result.code) {
  throw result.error || new Error("Terser minification produced no output");
}

const dynamicSuspendExpr = `"+new URL('./suspend.html',window.location.href).href+"`;
const bookmarkletHref = "javascript:" + result.code.replaceAll(suspendUrl, dynamicSuspendExpr);

const template = fs.readFileSync("public/index.html", "utf8");
const output = template.replace("__BOOKMARKLET_HREF__", bookmarkletHref);
fs.writeFileSync("public/index.html", output);
