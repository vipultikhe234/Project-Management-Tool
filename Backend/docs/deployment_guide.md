# Deployment & CI/CD Setup Guide for SprintNIX Backend (Laravel 12)

This document provides a guide to setting up and operating the production-ready CI/CD pipeline using GitHub Actions to deploy the Laravel 12 backend to Render.

---

## Architecture Overview

```
Developer Push
      ↓
GitHub Repository (main branch)
      ↓
GitHub Actions (Validation, PHP Linting, Composer checks)
      ↓
Render Deploy Hook Trigger
      ↓
Render (Build & Zero-Downtime Deployment)
```

---

## 1. Retrieve the Render Deploy Hook URL

To trigger deployments from GitHub Actions, you need a Deploy Hook URL from your Render service:

1. Log in to the [Render Dashboard](https://dashboard.render.com/).
2. Navigate to your **SprintNIX Backend** Web Service.
3. In the sidebar, select **Settings**.
4. Scroll down to the **Deploy Hook** section.
5. Copy the unique URL provided (it looks like: `https://api.render.com/deploy/srv-xxxxxxxxxxxxx?key=yyyyyyyyyy`).

---

## 2. Configure GitHub Secrets

Store the deploy hook URL securely in your GitHub repository:

1. Navigate to your GitHub repository.
2. Click on **Settings** -> **Secrets and variables** -> **Actions**.
3. Click the **New repository secret** button.
4. Set the **Name** to: `RENDER_DEPLOY_HOOK`.
5. Paste your copied Render Deploy Hook URL into the **Secret** field.
6. Click **Add secret**.

---

## 3. Disable Render Auto-Deploy (Recommended)

To ensure Render only deploys after GitHub Actions successfully runs validation and linting checks:

1. On the Render Dashboard, go to your service's **Settings**.
2. Scroll to the **Auto Deploy** section.
3. Change the value from **Yes** to **No**.
4. Click **Save Changes**.

*Note: Disabling Auto-Deploy prevents Render from building a push immediately, ensuring that a build is only initiated once GitHub Actions confirms code quality.*

---

## 4. Rollback Strategy

If a faulty deployment goes live, you can easily roll back to the last stable release:

### Option A: Manual Rollback via Render (Fastest)
1. Go to your service dashboard on Render.
2. Select the **Events** or **Deploys** tab.
3. Find the last known stable deployment.
4. Click the three dots `...` next to the stable deployment and select **Rollback to this deploy**.

### Option B: Git Revert (Cleanest)
1. Revert the problematic commit locally:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. The CI/CD pipeline will validate the reverted code and trigger a new deployment.

---

## 5. Deployment Troubleshooting

### Issue: Workflow fails on "Trigger Render Deployment"
- **Cause**: The `RENDER_DEPLOY_HOOK` secret is missing, invalid, or expired.
- **Resolution**: Verify that the secret exists in GitHub Repository settings and that it matches the URL from your Render service settings.

### Issue: Syntax Validation fails
- **Cause**: PHP files in your `app/`, `routes/`, `config/`, or `database/` folders have syntax errors.
- **Resolution**: Check the Actions logs to identify which file failed. Fix the syntax issues locally and push again.

### Issue: Missing dependencies or Artisan issues
- **Cause**: Local environment configurations or required files were not committed.
- **Resolution**: Ensure `.env.example`, `composer.json`, and `artisan` are in the `Backend` directory and tracked by git.

---

## 6. Pre-deployment Checklist
* [ ] All PHP code passes local syntax checks (`php -l`).
* [ ] `.env.example` contains all environment keys needed for production.
* [ ] Database migrations are backwards compatible.
* [ ] Secrets and keys are configured in Render Environment settings, not committed in code.
