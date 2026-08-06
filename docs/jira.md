### Epic 1: Funding Panel Infrastructure

1. **FND-101**: Define funding panel platform contract and runtime configuration (3 pts)
   - Deliverables: shared `FundingPanelStore`, `FundingPanelSurfaceComponent`, `FUNDING_PANEL_GATEWAY`, runtime config flags.
   - Acceptance: new panels can be added with only route/component + fixture + metadata.

2. **FND-102**: Implement reusable mock and HTTP gateways for all funding panels (5 pts)
   - Deliverables: `MockFundingPanelGateway`, `HttpFundingPanelGateway`, version conflict handling.
   - Acceptance: both `mock` and `http` modes work for `sec-corp` and `pbil`.

3. **FND-103**: Create generic funding grid view model and row metadata support (5 pts)
   - Deliverables: funding-grid.viewmodel.ts, panel row catalogs, panel-specific label maps.
   - Acceptance: panel-specific rows and totals render without grid code changes.

### Epic 2: Sec Corp / PBIL Panel Baseline

4. **FND-104**: Build `Sec Corp` panel route, surface and mock fixture (5 pts)
   - Deliverables: `sec-corp-panel.component`, `sec-corp-report.fixture`, `sec-corp-row-catalog`.
   - Acceptance: panel loads, displays rows, save state and conflict UI appear.

5. **FND-105**: Build `PBIL` panel route, surface and mock fixture (5 pts)
   - Deliverables: `pbil-panel.component`, `pbil-report.fixture`, `pbil-row-catalog`.
   - Acceptance: panel loads with PBIL metadata and uses shared shell.

### Epic 3: Future Panel Expansion (5 more panels)

6. **FND-106**: Define panel extension pattern and onboarding checklist (3 pts)
   - Deliverables: docs/checklist for adding panels, route naming conventions, fixture requirements.
   - Acceptance: new panel added with minimal boilerplate.

7. **FND-107**: Add third funding panel integration scaffold (5 pts)
   - Deliverables: route/component, panel-specific fixture, row catalog stub.
   - Acceptance: new panel can mount and load via shared panel surface.

8. **FND-108**: Add fourth funding panel integration scaffold (5 pts)
   - Similar acceptance to above.

9. **FND-109**: Add fifth funding panel integration scaffold (5 pts)

10. **FND-110**: Add sixth funding panel integration scaffold (5 pts)

11. **FND-111**: Add seventh funding panel integration scaffold (5 pts)

### Epic 4: Editing & Autosave

12. **FND-112**: Implement row editing and cell editor UX (8 pts)

- Deliverables: `funding-amount-cell-editor`, edit preview overlay, validation indicators.
- Acceptance: values can be edited, validated, and preview totals update optimistically.

13. **FND-113**: Autosave and conflict resolution flow (8 pts)

- Deliverables: explicit Update, save lifecycle states, conflict messaging.
- Acceptance: conflict from backend surfaces correct UI state, retry/save works.

### Epic 5: Quality and Release

14. **FND-114**: Unit/integration tests for funding panel core workflows (5 pts)

- Deliverables: store tests, gateway tests, surface + grid component tests.
- Acceptance: core coverage for load/save/conflict/row mapping.

15. **FND-115**: Accessibility, styling, and narrow-panel behavior (3 pts)

- Deliverables: keyboard support, ARIA labels, responsive width handling.
- Acceptance: narrow docked layout remains usable.

16. **FND-116**: Operations runbook and panel reuse documentation (2 pts)

- Deliverables: `docs/architecture/*`, sec-corp-panel-runbook.md, extension checklist.
- Acceptance: team can onboard a future panel with documented steps.
