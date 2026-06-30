# Deprecation Notice Template

Use this template when announcing a breaking API change to wallet partners.
Send at least **90 days** before the sunset date (StreamPay policy).

Fill in all `{{ }}` placeholders before sending.

---

**Subject:** [StreamPay] API {{ VERSION }} deprecation — action required by {{ SUNSET_DATE }}

---

Hi {{ PARTNER_NAME or "StreamPay Partner" }},

We're writing to let you know that **StreamPay API {{ VERSION }}** will reach
end-of-life on **{{ SUNSET_DATE }}** ({{ DAYS_NOTICE }} days from today).

After that date, requests to `{{ DEPRECATED_BASE_PATH }}` will return
`410 Gone` and must be migrated to `{{ SUCCESSOR_BASE_PATH }}`.

## What's changing

{{ BRIEF_SUMMARY — one paragraph describing the breaking changes and why
they were made. Example: "v3 restructures the settlement object to expose
Soroban escrow ledger sequence numbers, aligning with Horizon's event
streaming format." }}

| v{{ VERSION }} field | v{{ NEXT_VERSION }} field | Notes |
|---|---|---|
| {{ OLD_FIELD_1 }} | {{ NEW_FIELD_1 }} | {{ REASON }} |
| {{ OLD_FIELD_2 }} | {{ NEW_FIELD_2 }} | {{ REASON }} |

## What you need to do

1. Read the full migration guide: {{ MIGRATION_GUIDE_URL }}
2. Update request base paths from `{{ DEPRECATED_BASE_PATH }}` to
   `{{ SUCCESSOR_BASE_PATH }}`
3. Update field references per the table above
4. Test in our staging environment: `{{ STAGING_URL }}`
5. Complete migration before **{{ SUNSET_DATE }}**

## Deprecation headers

Every response from `{{ DEPRECATED_BASE_PATH }}` already includes:

```
Deprecation: {{ DEPRECATION_DATE_RFC7231 }}
Sunset: {{ SUNSET_DATE_RFC7231 }}
Link: <{{ MIGRATION_GUIDE_URL }}>; rel="successor-version"
```

If your HTTP client or API gateway supports RFC 9745 header monitoring,
these will surface automatically.

## Timeline

| Date | Event |
|------|-------|
| {{ DEPRECATION_DATE }} | Deprecation announced; Deprecation/Sunset headers added |
| {{ SUNSET_DATE }} | v{{ VERSION }} returns 410 Gone |

## Questions

- Open a GitHub issue: {{ GITHUB_ISSUES_URL }}
- Email: partner-support@streampay.io
- Docs: {{ MIGRATION_GUIDE_URL }}

We appreciate your partnership and are happy to help with the migration.

— StreamPay Engineering

---

## Internal checklist before sending

- [ ] Sunset date is ≥ 90 days from send date
- [ ] Migration guide URL is live and complete
- [ ] Staging environment is running the new version
- [ ] `Deprecation` and `Sunset` headers are confirmed in production responses
- [ ] CI contract tests for the old version are in place
- [ ] GitHub issue tracking the deprecation is open and linked
- [ ] Send list includes all registered wallet partners (check partner DB)
- [ ] Engineering on-call is aware of the sunset date
