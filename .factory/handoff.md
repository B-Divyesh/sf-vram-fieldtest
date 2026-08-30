# Verification 10 handoff — FAIL

Candidate `e59f8e1d7e09a6f419653e0de3f5ddd349f3700c` was independently tested
against <https://vram-fieldtest.sociobot.in>.  **Do not release.**

Full evidence is in `.factory/verification-10.md`.

Local claims, test, lint, build, package/clean-consumer CLI, live installer,
demo, privacy/request, rate-limit, mobile, keyboard, reduced-motion, headers,
offline reload, and axe checks passed.  The live static site matches the
candidate's `site_commit`.

Release blockers remain:

1. No completed physical Windows/Linux GPU report proves the brief's ≥90%
   coverage success measure; current release evidence is expressly 4 MiB
   software-renderer smoke only.
2. The live installer release is `v0.1.8` from ancestor
   `f5bec7de1409eb24feb8773f8c23c9949819da54`, not this candidate.  The release
   workflow/provenance changes in the candidate are therefore not published.
3. Windows/macOS installers are unsigned despite the researched signed-
   installer requirement.
4. Report Kit checkout remains unavailable until a Sociobot product mapping is
   configured.

Next: obtain real Windows/Linux GPU evidence, add safe cross-vendor telemetry,
bump/tag/publish the exact release, sign installers, and configure/verify the
optional paid checkout before re-verification.
