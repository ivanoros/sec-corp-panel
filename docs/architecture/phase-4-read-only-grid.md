# Phase 4 read-only AG Grid

## Scope

Phase 4 renders the Phase 3 view model as a responsive, read-only AG Grid. Cell
editing, editor lifecycle events, validation presentation, and autosave wiring
remain Phase 5 work.

## Panel boundary

The shell already owns panel chrome, including the Sec Corp title, docking,
resizing, minimize, maximize, and close controls. The Angular panel therefore
uses its entire surface for the report grid and does not duplicate a title bar.

The grid always declares these six columns:

1. `Bucket`
2. `8:30`
3. `11:30`
4. `1:30`
5. `LIVE`
6. `Opps funding`

The Bucket column has a larger flex ratio and minimum width. Numeric columns
share the remaining width while preserving useful minimum widths. AG Grid owns
vertical and fallback horizontal scrolling inside the shell-provided size.

## Display policy

Number formatting and presentation classification are centralized in
`funding-grid-display.ts`.

- Exact decimal strings are grouped without conversion to JavaScript numbers.
- Negative values use accounting parentheses and the screenshot's pink/red
  emphasis.
- Zero remains `0.00`.
- Section cells remain blank.
- Detail rows receive the screenshot's leading hierarchy dash.
- Opening, section, subtotal, and closing rows receive stable semantic CSS
  classes.

This policy is shared infrastructure and is not Sec Corp-specific.

## AG Grid configuration

The grid uses Angular's standalone AG Grid component and the v36 Theming API.
No legacy theme stylesheet is loaded. The custom theme establishes the compact
20-pixel rows, 30-pixel header, dark charcoal body, alternating detail rows,
teal section bands, muted teal totals, tabular numeric alignment, and restrained
grid lines visible in the references.

All Phase 4 column definitions remain read-only even when the view model reports
that a cell is eligible for editing. Phase 5 will selectively enable only input
rows in the three snapshot columns.

The grid component uses unencapsulated styles because AG Grid creates its
internal DOM below a third-party component boundary. Every selector is scoped
under the unique `.funding-grid` class to prevent leakage into the shell or
future non-funding grids.

Only the client-side row-model module is registered. Enterprise license
registration remains runtime-configured, and no unused enterprise modules are
added.

## Lazy-loading decision

AG Grid setup moved from the application bootstrap into the lazy Sec Corp
feature boundary. Registering it eagerly caused the complete grid runtime to
enter the initial application bundle. Registration is idempotent so multiple
docked Sec Corp instances reuse the same registered module and license while
keeping unrelated routes lightweight.

## Report states

The panel uses Angular's built-in control flow for:

- loading with an accessible live status;
- a load failure with the store error and manual retry;
- the populated AG Grid;
- a defensive empty state.

The shell continues to drive normal manual refresh through the host adapter.
