# Settlement Details filters

The earlier Server-Side Row Model request examples have been superseded by the
hybrid implementation. The current behavior, request JSON, and backend contract
are documented in [HybridRowModel.md](./HybridRowModel.md).

In summary:

- Top criteria search the complete backend data set and reload a 1,000-row
  server page.
- Grid-column filters search only the currently loaded page and make no backend
  request.
- Grid-column sorting is also local to the loaded page.
- Server-page navigation and manual refresh call the backend.
