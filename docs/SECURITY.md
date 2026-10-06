# Security and safe research boundaries

## Secrets

- Never put an API key, partner credential or private endpoint token in `src/`, `data/` or a GitHub Pages build.
- Use GitHub Actions secrets or a separate backend for credentials.
- `.env.example` is documentation only; `.env` is ignored.

## Research collection

- Fetch only public URLs already present in the source register and only on the allowlisted domains.
- Respect `robots.txt`, terms of use, rate limits and applicable law.
- Use timeouts, bounded fetch counts and a descriptive user agent.
- Do not bypass login, CAPTCHA, paywalls, geo-blocking, anti-bot systems or partner portals.
- Store hashes and metadata first. Human-review any content change before changing a competitor conclusion.

## Evidence integrity

- Preserve the source ID and last-verified date for each conclusion.
- Separate official evidence from competitor marketing claims and third-party affiliate opinion.
- Keep Japan scope separate from global/international scope.
- Surface conflicts and unknowns; do not silently resolve them.

## Deployment

- GitHub Pages should be treated as public. Check the build output before deploying.
- The default refresh workflow has read-only repository permissions and uploads an artifact instead of committing changes.
- If write-back is later added, use a narrow protected branch, required review and a dedicated bot identity.

