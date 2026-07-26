# Phase 5 inline editing and autosave

## Scope

Phase 5 connects AG Grid editing to the Phase 3 signals store. It enables only
input rows in `8:30`, `11:30`, and `1:30`. `LIVE`, `Opps funding`, section rows,
subtotals, totals, and closing balances remain read-only.

## Editor lifecycle

The funding grid uses a dedicated Angular financial cell editor rather than AG
Grid's generic text editor.

1. A single click, Enter, F2, or direct typing starts the editor.
2. `agInit` calls `FundingPanelStore.beginEdit` with the row and snapshot ID.
3. Every input event calls `previewEdit`.
4. A valid preview immediately updates computed subtotals and End of Day.
5. Focus loss, Enter, or Tab asks AG Grid to finish editing.
6. AG Grid's `cellEditingStopped` event calls `commitEdit`, which queues the
   versioned PUT.
7. Escape cancels the active preview and calls AG Grid's cancel path.

AG Grid uses `readOnlyEdit`. It never mutates the view-model row. The signals
store remains the only state owner, and every visible value is regenerated from
the domain report plus the immutable overlay.

## Validation

The custom editor delegates to the shared financial validator and implements AG
Grid's validation contract. `invalidEditValueMode="block"` keeps an invalid
editor open on focus loss, Enter, or Tab.

The editor shows an accessible inline message and invalid border. Valid values
support conventional financial entry forms and are normalized to the canonical
two-decimal REST representation before commit.

## Dirty and save presentation

Presentation classes are derived centrally from `FundingGridCellViewModel`.

- Editable cells show a restrained hover affordance.
- The active preview has a teal inset border.
- Committed unsaved cells show a small amber dirty marker.
- Invalid cells and editors use the negative/error palette.
- Dirty markers remain through pending saves and failures, then disappear only
  after the authoritative PUT response accepts the value.

There is no persistent Save or Revert bar. Valid commits autosave immediately.
A compact overlay appears only while saving or when action is required:

- save failures preserve edits and offer Retry;
- version conflicts preserve edits and offer the explicit destructive action
  `Discard my edits and reload`, followed by an inline confirmation.

No conflict automatically overwrites a newer server version.

## Keyboard and focus behavior

The editor intercepts Escape because it must cancel the store preview before AG
Grid destroys the editor. Enter and Tab bubble to AG Grid's popup editor wrapper
so its native navigation behavior remains intact. With
`stopEditingWhenCellsLoseFocus`, clicking outside a valid editor commits and
autosaves.

Invalid values block navigation until corrected or cancelled with Escape.

## Module and API impact

No additional AG Grid modules are registered. The existing client-side row
model and runtime Enterprise license setup are sufficient.

The REST contract is unchanged: every successful cell commit ultimately sends a
complete editable snapshot replacement with `expectedVersion`.
