# GitHub and GitHub Pages setup

This project supports two deployment modes. The immediate no-install mode publishes the complete repository root directly from a branch. The later npm mode uses the included GitHub Actions build workflow. GitHub Pages is public, so do not commit private affiliate performance data or secrets. See the official guides for [custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), and [Pages security](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## One-time setup — browser-only, no npm

1. Create a GitHub account, if needed, and sign in.
2. Create a new repository, for example `xmtd-competitor-intelligence`.
3. Keep the repository public if you want to use GitHub Free Pages without an upgraded plan. Treat all committed content as public.
4. Download the project bundle from the chat and extract it. You do not need to install anything.
5. In the empty repository, click **Add file → Upload files**.
6. Drag the entire contents of the extracted `xmtd-competitor-intelligence` folder into GitHub’s upload area. Preserve these folders exactly:

   ```text
   index.html
   data/
   public/
   src/
   docs/
   scripts/
   package.json
   vite.config.js
   ```

   The `.github/workflows/` folder can also be uploaded, but it will not be used by the no-build deployment yet.

7. Commit the upload to the `main` branch.
8. Open **Settings → Pages**.
9. Under **Build and deployment → Source**, choose **Deploy from a branch**.
10. Select branch `main` and folder `/ (root)`, then click **Save**.
11. GitHub shows the page URL under **Settings → Pages**. For a project repository, it is usually `https://YOUR-USER.github.io/xmtd-competitor-intelligence/`.

The complete app is now running from GitHub. `index.html` loads `src/main.js`, which loads the JSON files in `data/`. The folder structure must not be flattened.

## Normal update cycle — browser-only

1. Edit a file through GitHub’s web interface for small changes, or prepare a replacement file locally.
2. Use **Add file → Upload files** to upload the changed files while preserving their paths.
3. Commit changes to `main`.
4. Wait for GitHub Pages to republish the site.

For larger updates, upload the complete extracted project again and keep the same paths.

## Later npm/Vite deployment

When npm and VS Code become available:

1. Open the same repository in VS Code.
2. Run `npm install` and `npm run validate:data`.
3. Run `npm run build` and review the result with `npm run preview`.
4. Change **Settings → Pages → Source** from **Deploy from a branch** to **GitHub Actions**.
5. Commit the project and use the included `deploy-pages.yml` workflow.

The later workflow builds `dist/`, uploads the Pages artifact and deploys it. The source repository remains the same.

## Periodic source refresh

The included **Refresh allowlisted competitor sources** workflow is scheduled for Mondays at 02:17 UTC and can also be started manually from **Actions**. It produces a review artifact; it does not commit changes or silently rewrite the analysis. To use it:

1. Open **Actions → Refresh allowlisted competitor sources → Run workflow**.
2. Download the artifact from the completed run.
3. Review changed hashes and URLs against the live source.
4. Update the source register and analysis JSON in a pull request.
5. Merge only after human review.

GitHub Actions supports scheduled and manual workflow triggers; see the [workflow event reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) and [manual workflow guide](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## Optional research endpoint

GitHub Pages cannot safely host server-side scraping or private API credentials. If a backend is added later:

1. Keep the backend outside the static build.
2. Store keys as deployment secrets.
3. Return the full validated analysis schema, not free-form text only.
4. Configure the browser endpoint at build/deploy time with `VITE_XMTD_RESEARCH_ENDPOINT` or set `window.XMTD_RESEARCH_ENDPOINT` before the app starts.
5. Keep the endpoint restricted to the same allowlisted sources and evidence rules.
