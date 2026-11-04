# Working with multiple classifications (no database)

The calculator supports **multiple in-page classification tabs**. Each tab contains an independent formulation, ingredient list, manual hazard entries, labelling context and calculated CLP results.

## How to use

- Select **+ New classification** to open a blank formulation without changing other tabs.
- Use **Duplicate current** to create a separate copy of the active formulation for comparison. Changes to the copy do not change the original.
- Click a formulation name in the tab bar to switch between classifications. The tab title follows the mixture name entered under **Mixture information**; unnamed mixtures use 'Classification 1', 'Classification 2', etc.
- Select **×** next to a tab to close its working copy. A confirmation is required. Closing the last tab creates a blank one.
- Keep using **Save JSON** and **Load JSON** to export/import an individual formulation. Switching tabs requires no export.
- All tabs are restored from browser-local storage when the calculator is refreshed, provided browser storage remains available.

## Data privacy and durability

**There is no database or server-side storage for these workspaces.** The browser's `localStorage` holds a JSON snapshot of the open classification tabs in the current browser profile and origin. Browser-local data can be lost if site data is cleared, the application moves to another URL/origin, storage is blocked, or the profile is removed. Incognito/private windows may delete the data on closure. A visible warning appears if local persistence fails.

For important or finalised work, **export the individual formulations as .clpmix.json files**. These can be imported later and can be backed up outside the browser. Workspace tabs are not automatically synchronised between computers, browser profiles, or different origins.

The feature migrates a prior single saved formulation from `clp_calc_state_v1` into the first workspace when no multi-workspace state exists. It does not delete the old key, and the multi-workspace key takes precedence thereafter.

The existing deterministic CLP mixture-classification engine, source ingredient controls, report and regulatory logic are unchanged. Tab switching affects only which formulation is currently displayed and computed.

## Verification

`node verification/test_multi_workspaces.js` exercises independent formulations, cloning, switching, persistence, legacy migration, closing, cancellation, handling malformed storage and safe tab titles.

The full `npm test` suite also runs the engine and UI regression checks.
