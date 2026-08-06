# Phase 7 production hardening

## Scope

Phase 7 closes the panel implementation without changing the approved report
model, REST contract, calculations, or editing rules. It adds the production
guardrails that sit around those behaviors:

- accessible grid and editor context;
- narrow-panel status layout;
- duplicate refresh suppression;
- tested recovery from transient GET and PUT failures;
- a single release-quality command;
- an operator runbook and a reuse checklist for future panels.

## Accessibility boundary

AG Grid owns the focusable `treegrid` element. A normal Angular host attribute
does not guarantee that a screen reader sees the label on that inner element.
`FundingGridComponent` therefore uses one small `effect` to synchronize the
signal-derived label and `aria-describedby` reference through
`GridApi.setGridAriaProperty`.

Each mounted grid and editor receives an instance-unique description/error ID.
This matters because the shell may dock multiple copies of the same panel.
Editor labels include the row and snapshot (for example, `OCC 8:30 funding
amount`), and the existing Enter, Tab, and Escape keyboard behavior is exposed
through `aria-keyshortcuts`.

The off-screen grid description states the currency, business date, as-of
timestamp, timezone, columns, and read-only behavior. It is metadata only; the
visible grid remains pixel-aligned with the approved screenshots.

## Responsive behavior

The shell continues to own panel dimensions. The grid preserves minimum column
widths and uses horizontal scrolling instead of compressing financial values
until they are unreadable. At narrow container widths, save/error/conflict
status controls wrap within the panel rather than overflowing the docked
surface. Container queries are used because a docked panel's width is not
necessarily related to the browser viewport.

## Operational behavior

`requestRefresh` now rejects a duplicate request while GET is already in
progress. This prevents multiple shell refresh events from racing and makes
`hostState.canRefresh` enforceable at both the host and store boundaries.

The test suite verifies:

- failed GET leaves the active query available for retry;
- failed PUT retains dirty work and retries with the same expected version;
- both `409 Conflict` and `412 Precondition Failed` enter the version-conflict
  path;
- a refresh in progress cannot be started again;
- accessible labels and editor error relationships render correctly.

No automatic retry or polling was added. A retry that could repeat indefinitely
or unexpectedly overwrite operator intent would conflict with the approved
manual-control model.

AG Grid modules are registered explicitly for the features this panel uses:
client-side rows, cell/row styling, custom and text editing, tooltips, and the
render API. This preserves tree shaking while preventing a partially rendered
grid caused by a missing module. The complete Enterprise module bundle is not
registered because Sec Corp does not currently use those additional features;
the runtime Enterprise license path remains ready for future licensed modules.

## Reusing the infrastructure

A future funding panel should reuse:

- `FundingPanelStore` for edit overlays, preview totals, explicit Update,
  optimistic concurrency, retry, and refresh coordination;
- `FundingGridComponent` and the financial editor for rendering and input;
- `FUNDING_PANEL_DATA_ACCESS_PROVIDERS` for mock/HTTP runtime selection;
- the domain/DTO/mapper separation and decimal calculation utilities;
- `PanelHostAdapter` for shell refresh and status publication.

Panel-specific code should be limited to its route/component, report fixture or
backend data, row definitions, and any genuinely new calculation rules. A new
panel should not fork the generic store or grid merely to change labels,
ordering, values, or permissions; those belong in report data.

## Exit criteria

Phase 7 is complete when `npm run check` passes and the production dependency
audit has no runtime vulnerabilities. Backend integration and shell injection
still require environment smoke testing because they depend on systems outside
this repository.

## Known development-tool advisory

The Angular runtime packages are pinned to patched Angular 21.2.19, and the
production audit reports zero vulnerabilities. The full audit currently reports
eight development-tool findings (five moderate and three high) on transitive
Angular CLI/build dependency paths, including:

```text
@angular/cli -> @modelcontextprotocol/sdk -> @hono/node-server
@angular/build -> undici
```

The automated forced fixes propose incompatible Angular CLI/build downgrades,
so they are intentionally not applied. Recheck these advisories during routine
dependency updates and upgrade when the Angular 21 toolchain provides compatible
patched transitive dependencies.
