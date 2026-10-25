<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Sales documents share a transaction editor and database RPC workflow; all multi-row changes, numbering, approvals and payment balances are authoritative in PostgreSQL to prevent partial writes and races.
- Issued documents retain an immutable legal/brand snapshot; printed documents must use that snapshot rather than current tenant settings.
- Transaction mutations invalidate all tenant query surfaces together so Finance, Client, shipments and document balances cannot retain stale state.
- Shipment assignment uses a shared dialog and tenant-authorized RPC with restricted team projections; this supports shipment-only staff without exposing the Team module.
- Purchasing vendor reads use the generated client with explicit tenant/deleted filters and local query errors; assignment tables without soft-delete columns must not use tenantClient. Vendor audit reuses the business trigger; assignment audit handles deletes and rows without soft-delete fields separately.
- Client settings/outlets use a focused CRM dialog; PostgreSQL validates required PO and item outlet ownership/snapshots, and only populated item metadata extends approval fingerprints to preserve legacy documents.
- Order client selection reads the limited list_order_clients RPC rather than widening CRM table access; save_sales_document validates PO and normalizes outlet/section metadata atomically.
