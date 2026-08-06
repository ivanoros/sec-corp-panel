# Phase 3 signals state and view-model mapping

## Scope

Phase 3 adds the reusable application-state layer between the Phase 2 domain/API
contract and the future AG Grid component. It does not render the grid.

Each docked panel component provides its own `FundingPanelStore`. Two Sec Corp
panels therefore cannot leak edits, save status, conflicts, or refresh requests
into one another.

## State ownership

The store keeps three deliberately separate representations:

1. `serverReport` is the latest complete report confirmed by GET or PUT.
2. `edits` is a sparse immutable overlay containing committed, unsaved snapshot
   cells.
3. `activeEdit` is the cell editor's current raw and validated value.

`report` is a computed signal that overlays valid values and recalculates the
declarative total graph. `viewModel` is another computed signal that maps that
preview report into grid-ready rows and cells. Domain models are never decorated
with UI flags.

An invalid active value is retained for the editor and view-model validation
message but is not applied to financial calculations.

The shell dirty flag includes a changed active editor value as well as committed
overlay values, so closing or replacing a panel cannot bypass an edit that has
not lost focus yet.

## Edit and explicit update sequence

1. The editor begins on an input row in `8:30`, `11:30`, or `1:30`.
2. Every valid keystroke updates the computed preview and dependent totals.
3. Lost focus, Enter, or Tab will call `commitEdit` in the grid phase.
4. A valid commit moves the value to the edit overlay. It does not call the API.
5. The operator can edit additional cells while preview totals continue to
   recalculate locally.
6. Selecting `Update` commits any active valid editor and sends one complete
   versioned PUT.
7. Escape calls `cancelEdit`; an invalid commit remains in the editor.

Editable cells require both `canEdit` and `canSave`. This avoids allowing an
edit that the explicit Update workflow could never persist.

The input validator accepts conventional financial forms such as
`1,234.5`, `$1,234.50`, and `(1,234.50)`, then emits the canonical signed
two-decimal string required by the REST contract.

## Explicit and serialized updates

Only one PUT can be in flight for a store. Each Update captures the complete
preview report dataset and the current confirmed version.

Edits made while that PUT is pending remain in the overlay. When the response
arrives, the overlay is rebased against the authoritative returned report:

- values accepted by the server disappear from the overlay;
- newer user values remain dirty for the next explicit Update;
- a user reverting a cell while its earlier value is in flight is preserved as
  explicit intent and can be sent by the next Update.

This provides serialization without dropping rapid edits, issuing requests on
focus loss, or saving post-click changes without another operator action.

## Version conflicts and errors

A `409` or `412` becomes a `conflict` save state containing expected and current
versions. Dirty edits remain intact and automatic saving stops. Manual refresh
is blocked so stale work cannot be silently discarded.

`discardChangesAndRefresh` is the explicit conflict escape hatch for the future
UI. It removes local work and retrieves the latest server report. The store does
not automatically rebase and overwrite another user's changes because it cannot
know whether two edits to the same cell are semantically compatible.

Non-conflict failures retain dirty work and expose `retrySave`.

## Manual refresh and host integration

The store uses effects only at two imperative boundaries:

- publishing computed dirty/save/refresh state to the shell adapter;
- responding to the shell adapter's refresh revision.

A clean refresh performs GET immediately. Refreshing with dirty values requires
explicit confirmation because the GET discards the local overlay. Invalid edits,
an in-flight Update, and version conflicts block normal refresh.

There is no timer and no polling.

## Data access binding

The store depends only on `FUNDING_PANEL_GATEWAY`. Sec Corp currently provides
the Phase 2 mock gateway so the phased panel runs without a backend. The existing
HTTP gateway implements the same GET and PUT contract and can replace that
provider without changing the store or grid.
