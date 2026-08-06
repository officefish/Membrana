# Harness and Product production visual report

**Checked:** 2026-08-02T20:24:30+03:00  
**Harness:** `https://harness.mmbrn.tech`  
**Product:** `https://product.mmbrn.tech`

## Deployment evidence

- Harness PR #1650 merged as `40468d1d72b38a267b6e197deeb322a7d469b0f6`.
- Mintlify GitHub deployment `5715569116` for `staging - apps/docs-harness`
  completed successfully for that merge and targets `harness.mmbrn.tech`.
- Mintlify dashboards report both custom domains Connected. Product uses the
  required `product` CNAME to `cname.mintlify.builders`; Harness retains its
  separately configured custom-domain connection.

## HTTP and responsive smoke

| Surface | Desktop 1440x900 | Mobile 390x844 | Result |
|---------|------------------|----------------|--------|
| Harness procedures index | H1 `Процедуры`, no page overflow | H1 visible, cards wrap, no page overflow | PASS |
| Harness workshops index | H1 `Мастерские`, no page overflow | H1 visible, no page overflow | PASS |
| Product overview | HTTPS 200 | Existing Product visual report | PASS |
| Product tariffs | HTTPS 200 | Existing Product visual report | PASS |

Basic accessibility smoke found no images without `alt`. The only control
without a visible label was Mintlify's hidden technical `textarea`, marked
`aria-hidden=true`; it is not an interactive reader control.

The owner inspected the live Harness procedure and workshop pages in the
browser and accepted the result with `Все супер`. This report records that
human visual acceptance without inventing repository screenshots.

## Verdict

PASS. Product and Harness are separate live Mintlify surfaces on their intended
domains. The standing requirement to accumulate lived examples remains in
`workflow-examples-marathon`; it is not a deployment defect.
