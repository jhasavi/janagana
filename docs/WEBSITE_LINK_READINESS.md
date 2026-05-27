# Website Link Readiness — v3

Date: 2026-05-27
Status: Ready for simple links only (no widget/embed/API integration yet)

## Approved Portal Links

- The Purple Wings website link target:
  - `http://localhost:3020/portal/purple-wings`
- Namaste Boston website link target:
  - `http://localhost:3020/portal/namaste-boston`

## Scope Notes

- This milestone approves only direct links to tenant portal pages.
- Do not add widgets, API embedding, or bi-directional sync yet.
- Do not modify external website repos (`~/tpw`, `~/nb`) until a dedicated integration milestone is started.

## Validation Steps

1. Open each link and confirm HTTP 200.
2. Confirm tenant title matches URL slug context.
3. Register attendee in one tenant and verify no visibility in the other tenant portal/admin.
