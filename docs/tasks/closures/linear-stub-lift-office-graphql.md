# Closure: linear-stub-lift-office-graphql

| Field | Value |
|---|---|
| acceptedBy | vesnin |
| headRev | 698542b5bca973ae9c44d357ddbcfc54db2d7575 |
| githubIssue | 694 |
| pr | 695 |

## Deploy (office MSK)

| Field | Value |
|---|---|
| server HEAD | `698542b5bca973ae9c44d357ddbcfc54db2d7575` |
| MEDIA_API_URL | `https://media.membrana.space` |
| MEDIA_API_TOKEN | aligned with media `API_INTERNAL_TOKEN` (fp match) |

## Smoke

- localhost + `https://office.mmbrn.tech/health` → `status: ok`
- `GET /v1/linear/issue/TEC-42` → **503** / `LINEAR_OFFICE_EGRESS_DISABLED`
- office host → media `POST /v1/linear-snapshots/capture` → **200** `pullOk=true` `producedBy=media-NL`
