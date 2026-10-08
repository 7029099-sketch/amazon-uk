# Amazon Associates readiness checklist (2026-10-08)

Status: NOT READY / application not submitted. Social automation postponed.

Official references:
- https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM
- https://affiliate-program.amazon.com/help/operating/policies
- https://affiliate-program.amazon.com/help/operating/participation/
- https://affiliate-program.amazon.com/help/operating/agreement/

## Critical blockers before application
- Amazon says it reviews sites after at least 3 qualifying sales within 180 days of application; original content is essential (Amazon suggests ~10 posts as a rule of thumb) and recent website content generally within 60 days. Approval is not guaranteed.
- Publish substantive, independently written, useful editorial articles/guides; public site must work without login.
- Do not claim an all-Amazon live search or current prices until approved licensed integration actually works.
- IMPORTANT: Associates policy generally prohibits price-tracking and price-alert functionality without separate Amazon agreement. Disable such features for Amazon Program Content; do not deploy the previously proposed alerts/history without express permission.
- IMPORTANT: Amazon participation requirements prohibit orders/transactions on Amazon on behalf of others. Remove or disable managed Amazon purchase flow from Associates-site launch pending separate formal legal and program review.
- Amazon Program Content must not be used to promote other retailers; separate content rights and pages clearly.
- No Amazon images/ratings/reviews unless allowed by license; comply with cache/freshness/timestamp rules. Do not scrape.
- Review site branding and links for trademark confusion; no Amazon logos without authorized use.
- Prominent Associate disclosure when applicable: As an Amazon Associate I earn from qualifying purchases.
- No fake crossed-out prices, percentages, reviews, shipping guarantees or verified claims.
- Secure admin, privacy/terms/contact, HTTPS, mobile and link checks; no payment acceptance before processor, legal and fiscal sign-off.
- Document official terms review, owner and date; retest on policy changes.

## Release criteria
[ ] Public domain/SSL/navigation tested
[ ] 10+ original substantial posts or comparable robust content; freshness checked
[ ] Original images or properly licensed content only
[ ] Product links and disclosures tested
[ ] Amazon prohibited price-alert/tracking feature absent
[ ] Amazon purchase-on-behalf functionality disabled
[ ] Verified deal gate enforced in runtime with tests
[ ] Live search either licensed and working or clearly limited
[ ] Admin authentication and private data secured
[ ] No false claims of Amazon endorsement
[ ] Final manual compliance review before submitting
