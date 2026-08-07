# Phase 5 inline editing and explicit Update

The filename is retained for historical phase traceability. Autosave was later
replaced by the approved Update and Refresh buttons.

## Scope

Phase 5 connects AG Grid editing to the Phase 3 signals store. It enables only
input rows in `8:30`, `11:30`, `1:30`, and `Opps funding`. `Bucket`, `LIVE`,
section rows, subtotals, totals, and closing balances remain read-only.

## Editor lifecycle

The funding grid uses a dedicated Angular financial cell editor rather than AG
Grid's generic text editor.

1. A single click, Enter, F2, or direct typing starts the editor.
2. `agInit` calls `FundingPanelStore.beginEdit` with the row and editable period ID.
3. Every input event calls `previewEdit`.
4. A valid preview immediately updates computed subtotals and End of Day.
5. On focus loss, Enter, or Tab, the editor calls `commitEdit` with its exact row
   and period address before AG Grid navigates. This avoids committing the next
   cell when Tab immediately opens another editor.
6. Editor destruction repeats the address-guarded commit as a safe fallback.
   The operation stores the value locally without making an API request.
7. Selecting `Update` sends the complete preview report in one versioned PUT.
8. Escape cancels the active preview and calls AG Grid's cancel path.

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

## Dirty and update presentation

Presentation classes are derived centrally from `FundingGridCellViewModel`.

- Editable cells show a restrained hover affordance.
- The active preview has a teal inset border.
- Committed unsaved cells show a small amber dirty marker.
- Invalid cells and editors use the negative/error palette.
- Dirty markers remain after focus loss, through pending updates and failures,
  then disappear only after the authoritative PUT response accepts the value.

The shared toolbar contains `Update` and `Refresh`. Update is enabled only when
valid dirty work exists. Refresh calls GET; when dirty work exists, the panel
requires confirmation before discarding it. A compact overlay appears while
updating or when action is required:

- save failures preserve edits and offer Retry;
- version conflicts preserve edits and offer the explicit destructive action
  `Discard my edits and reload`, followed by an inline confirmation.

No conflict automatically overwrites a newer server version.

## Keyboard and focus behavior

The editor intercepts Escape because it must cancel the store preview before AG
Grid destroys the editor. Enter and Tab bubble to AG Grid's popup editor wrapper
so its native navigation behavior remains intact. With
`stopEditingWhenCellsLoseFocus`, clicking outside a valid editor commits and
recalculates the local preview. It does not save.

Invalid values block navigation until corrected or cancelled with Escape.

## Module and API impact

No additional AG Grid modules are registered. The existing client-side row
model and runtime Enterprise license setup are sufficient.

The REST contract sends all backend-owned report facts only when Update is
selected. The version 2 body contains the current actor `userId`,
`definitionVersion`, `expectedVersion`, and five columns of row IDs and values;
presentation definitions are excluded. `If-Match` contains the same quoted
version. The server returns the incremented report version with its audit
`userId` set to that actor.
