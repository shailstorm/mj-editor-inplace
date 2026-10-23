# Serve the editor at shay.city/editor-inplace

The editor's `vercel.json` runs `npm run build:production` with `/editor-inplace/` as its public asset base. Its rewrites serve that prefix on the editor deployment as well. Development and the normal `npm run build` continue to use `/`.

The shaysite change is ready in `shaysite-editor-inplace.patch`. From `/Users/shay/dev/shaysite`, apply it with:

```sh
git apply /Users/shay/dev/mj/editor-redesign-inplace/integrations/shaysite-editor-inplace.patch
```

Deploy the editor changes first, then the shaysite changes. The new rules proxy `/editor-inplace` and `/editor-inplace/:path*` to the same paths at `https://mj-editor-inplace.vercel.app`. Existing `/editor-canvas` routing is preserved.

After deployment, check `https://shay.city/editor-inplace`. Scripts, CSS, photos, icons, and fonts should all load under `/editor-inplace/`.

Validation completed in this task:

- Editor tests, lint, and production build pass.
- Production script, CSS, image, icon, and font URLs resolve to emitted files beneath the prefixed route.
- The patch applies cleanly to the local shaysite checkout.
- The edited Next.js configuration loads and returns both editor integrations' rewrite rules.
- A full shaysite build was attempted but could not fetch its existing Google Fonts because this session cannot resolve `fonts.googleapis.com` from Node.

The route is not live until both repositories' changes are deployed. This task could not apply the shaysite patch directly because that checkout is outside the writable workspace, and no usable GitHub credential was available for pushing changes.
