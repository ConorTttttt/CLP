# CLP Mixture Calculator — mobile, local-only build

`mobile/index.html` is a phone-friendly version of `clp_mixture_calculator.html`
with the same engine and every feature except the optional Gemini helpers.

- **Local only.** Nothing is sent anywhere. A Content-Security-Policy in the page
  blocks every network request (`connect-src 'none'`) and allows only the page's
  own scripts. Formulations are saved only in the browser on that device.
- **Self-contained.** One HTML file (about 385 KB) with the engine and GHS
  pictograms built in. It works offline.
- **Same results.** It runs the desktop engine and application code unchanged;
  only the layout differs.

## Using it on a phone

| Option | How | Offline |
|---|---|---|
| Open the file | Copy `mobile/index.html` to the phone (Files app, AirDrop, email to yourself) and open it in the browser. | Yes |
| Install as an app | Serve the `mobile/` folder over HTTPS (e.g. GitHub Pages: `https://<user>.github.io/CLP/mobile/`), open it once, then *Add to Home Screen*. | Yes, after the first visit (service worker) |
| On your network | `python3 -m http.server` in `mobile/`, then open `http://<computer-ip>:8000/` on the phone. | While the server runs |

Even when the page is loaded from a web address, all calculations and saved
formulations stay on the device; the page cannot send data back.

Saved formulations are stored per browser and per web address. Use **Save JSON**
and **Load JSON** to move a formulation between the desktop and mobile versions;
the file format is identical.

## What is different from the desktop page

- Bottom tab bar (Mixture, Ingredients, Label, Results). The Results badge shows
  the number of classifications, coloured by signal word, with a dot when there
  are input warnings.
- Ingredients are shown as cards instead of a sideways-scrolling table.
- Larger touch targets, 16 px inputs (no zoom on focus), single-column forms on
  narrow screens, safe-area spacing for notched phones.
- No Gemini import or review panel, and no network access of any kind.

## Maintaining it

Do **not** edit `mobile/index.html` or `mobile/sw.js` — they are generated.

| To change | Edit | Then |
|---|---|---|
| Engine, features, desktop UI | `clp_mixture_calculator.html` / `verification/engine.js` | `npm run build:mobile` |
| Mobile layout only | `mobile/src/mobile.css` | `npm run build:mobile` |
| Mobile behaviour only (tab bar, offline) | `mobile/src/mobile.js` | `npm run build:mobile` |
| What the build removes or adds | `mobile/build.js` | `npm run build:mobile` |

Commit the regenerated `mobile/index.html` and `mobile/sw.js` with the change.

`npm test` includes `verification/test_mobile_build.js`, which fails if:

- the generated files are out of date with their sources,
- the engine or application code differs from the desktop page (other than the
  removed Gemini code),
- any desktop control is missing from the mobile page,
- any network API, external resource or Gemini code appears, or the
  Content-Security-Policy is weakened,
- the inlined pictograms differ from `pictograms/*.svg`.

The build itself stops with an error if the desktop page changes in a way it
does not recognise (for example the Gemini panel is restructured), rather than
producing a broken mobile page. Update `mobile/build.js` when that happens.

Optional browser check (needs Playwright and Chromium):

    npm run test:mobile-browser

It opens the page at phone size and checks: no errors or network requests, no
sideways scrolling, the tab bar, the worked example matching the desktop result,
and offline use through the service worker.

The app icons in `mobile/icons/` are static; `icon-192.png` and `icon-512.png`
were rendered from `icon.svg`.
