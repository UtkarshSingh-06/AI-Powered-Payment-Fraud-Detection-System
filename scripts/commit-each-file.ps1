$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

git config user.name "UtkarshSingh-06"
git config user.email "utkarsh.yash77@gmail.com"

function Get-CommitMessage([string]$f) {
    $messages = @{
        ".github/workflows/ci-cd.yml" = "ci: expand pipeline with contracts, inference, Next.js, and compose smoke tests"
        ".github/workflows/deploy-staging.yml" = "ci: add manual staging deploy workflow with Terraform and Helm validation"
        ".github/workflows/drift-monitor.yml" = "ci: add scheduled model drift monitoring workflow"
        ".github/workflows/retrain-model.yml" = "ci: point retrain workflow to MLflow training pipeline in ml/training"
        "package.json" = "chore: add monorepo root package with npm workspaces and Turbo scripts"
        "package-lock.json" = "chore: sync root package-lock for workspace and frontend dependency updates"
        "pnpm-workspace.yaml" = "chore: add pnpm workspace definition for monorepo packages"
        "turbo.json" = "chore: add Turborepo task pipeline configuration"
        "PLATFORM.md" = "docs: add enterprise platform quick start, service map, and local URLs"
        "docker-compose.yml" = "infra: add Redpanda, microservices, API gateway, and observability stack to Compose"
        "openapi/fraudshield-api.yaml" = "docs: add OpenAPI 3.1 specification for enterprise FraudShield API"
        "scripts/hard-launch.ps1" = "chore(scripts): add hard-launch script to start inference, backend, gateway, and frontend"
        "Dockerfile.render" = "deploy: add Render monolith Dockerfile for frontend and backend production image"
        "render.yaml" = "deploy: add Render Blueprint for Postgres, API, and inference services"
        "docs/DEPLOY_RENDER.md" = "docs: add Render deployment guide with Stripe webhook and env vars"
        "docs/ENTERPRISE_ARCHITECTURE.md" = "docs: add enterprise architecture overview for platform services"
        ".github/workflows/deploy-prod.yml" = "ci: add production deploy workflow"
        ".github/workflows/security-scan.yml" = "ci: add security scanning workflow"
        "backend/services/tokenService.js" = "feat(auth): add httpOnly cookies, refresh tokens, and MFA helpers"
        "backend/scripts/renderBootstrap.js" = "deploy: add Render bootstrap script for migrate and optional seed"
        "backend/routes/webhooks/stripe.js" = "feat(payments): add Stripe webhook ingest route"
        "backend/services/stripeEventMapper.js" = "feat(payments): map Stripe events to fraud transactions"
        "frontend/src/pages/Cases.jsx" = "feat(frontend): add analyst case management page"
        "frontend/src/pages/Alerts.jsx" = "feat(frontend): add fraud alerts inbox page"
        "frontend/src/pages/TransactionDetail.jsx" = "feat(frontend): add transaction detail with explainability"
        "frontend/src/styles/design-system.css" = "feat(frontend): add shared FraudShield design tokens and UI primitives"
        "frontend/src/components/AuthShell.jsx" = "feat(frontend): add AuthShell layout matching landing page aesthetic"
        "frontend/src/components/ErrorBoundary.jsx" = "feat(frontend): add React error boundary for graceful UI failures"
        "frontend/src/components/landing/HeroScene3D.jsx" = "feat(frontend): add Three.js WebGL hero scene for landing page"
        "frontend/src/components/landing/SceneFallback.jsx" = "feat(frontend): add CSS fallback orb scene when WebGL is unavailable"
        "frontend/src/components/landing/scene-shared.css" = "feat(frontend): extract shared hero scene styles for landing and auth"
        "frontend/src/components/landing/AnimatedCounter.jsx" = "feat(frontend): add animated metric counter for landing stats"
        "frontend/index.html" = "feat(frontend): load Syne display font for unified branding"
        "frontend/vite.config.js" = "fix(frontend): configure dev server on port 3002 with flexible strictPort"
    }
    if ($messages.ContainsKey($f)) { return $messages[$f] }

    if ($f -eq "frontend/src/pages/Login.jsx") { return "feat(frontend): redesign login page with AuthShell and landing-aligned UI" }
    if ($f -eq "frontend/src/pages/Register.jsx") { return "feat(frontend): redesign register page to match unified auth experience" }
    if ($f -eq "frontend/src/pages/Auth.css") { return "style(frontend): restyle auth pages with dark minimal FraudShield theme" }
    if ($f -eq "frontend/src/pages/About.jsx") { return "feat(frontend): enhance Tenbin-style landing with 3D hero and compare table" }
    if ($f -eq "frontend/src/pages/About.css") { return "style(frontend): update landing styles and import shared scene CSS" }
    if ($f -eq "frontend/src/components/Layout.jsx") { return "feat(frontend): add ambient background and FraudShield sidebar branding" }
    if ($f -eq "frontend/src/components/Layout.css") { return "style(frontend): align app shell sidebar and layout with design system" }
    if ($f -eq "frontend/src/pages/Dashboard.jsx") { return "refactor(frontend): simplify dashboard header to match design system" }
    if ($f -eq "frontend/src/pages/Dashboard.css") { return "style(frontend): soften dashboard cards to match landing glass panels" }
    if ($f -eq "frontend/src/App.css") { return "style(frontend): unify global cards, tables, and buttons with design tokens" }
    if ($f -eq "frontend/src/index.css") { return "style(frontend): import design system and update base color palette" }
    if ($f -eq "frontend/src/main.jsx") { return "feat(frontend): wrap app with ErrorBoundary at root" }
    if ($f -eq "frontend/package.json") { return "feat(frontend): add three.js and react-three-fiber for 3D landing hero" }
    if ($f -match "^frontend/dist/assets/.*\.js$") { return "build(frontend): update production JS bundle - $(Split-Path $f -Leaf)" }
    if ($f -match "^frontend/dist/assets/.*\.css$") { return "build(frontend): update production CSS bundle - $(Split-Path $f -Leaf)" }
    if ($f -eq "frontend/dist/index.html") { return "build(frontend): refresh Vite dist index after production build" }

    if ($f -match "^apps/api-gateway/") { return "feat(gateway): add API gateway component - $(Split-Path $f -Leaf)" }
    if ($f -match "^apps/web/") { return "feat(web): add Next.js enterprise dashboard - $(Split-Path $f -Leaf)" }
    if ($f -match "^backend/config/") { return "feat(backend): add backend config - $(Split-Path $f -Leaf)" }
    if ($f -match "^backend/middleware/") { return "feat(backend): add security middleware - $(Split-Path $f -Leaf)" }
    if ($f -match "^backend/routes/") { return "feat(backend): add API route module - $(Split-Path $f -Leaf)" }
    if ($f -match "^backend/services/") { return "feat(backend): add platform service - $(Split-Path $f -Leaf)" }
    if ($f -match "^backend/scripts/") { return "feat(backend): add database script - $(Split-Path $f -Leaf)" }
    if ($f -match "^backend/tests/") { return "test(backend): add test suite file - $(Split-Path $f -Leaf)" }
    if ($f -match "^backend/") { return "feat(backend): update backend - $(Split-Path $f -Leaf)" }
    if ($f -match "^packages/contracts/") { return "feat(contracts): add JSON schema contract artifact - $(Split-Path $f -Leaf)" }
    if ($f -match "^packages/sdk") { return "feat(sdk): add client SDK file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/auth-service/") { return "feat(auth-service): add authentication microservice file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/ingestion-service/") { return "feat(ingestion): add high-throughput ingestion service file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/scoring-service/") { return "feat(scoring): add ML scoring orchestration service file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/case-service/") { return "feat(cases): add analyst case management service file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/rules-engine/") { return "feat(rules): add versioned rules engine file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/notification-service/") { return "feat(notifications): add alert notification service file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/aml-service/") { return "feat(aml): add AML screening service file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/sandbox-simulator/") { return "feat(sandbox): add fraud simulation sandbox file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/feature-pipeline/") { return "feat(pipeline): add Kafka feature pipeline file - $(Split-Path $f -Leaf)" }
    if ($f -match "^services/inference-fastapi/") { return "feat(inference): add ML inference service file - $(Split-Path $f -Leaf)" }
    if ($f -match "^infra/terraform/") { return "infra(terraform): add AWS/cloud infrastructure module - $f" }
    if ($f -match "^infra/k8s/") { return "infra(k8s): add Helm/Kubernetes deployment artifact - $(Split-Path $f -Leaf)" }
    if ($f -match "^infra/monitoring/") { return "infra(monitoring): update observability config - $(Split-Path $f -Leaf)" }
    if ($f -match "^ml/") { return "feat(ml): add MLOps training or XAI artifact - $(Split-Path $f -Leaf)" }
    if ($f -match "^docs/") { return "docs: update architecture documentation - $(Split-Path $f -Leaf)" }
    if ($f -match "^frontend/") { return "feat(frontend): update Vite client - $(Split-Path $f -Leaf)" }
    return "chore: add platform file $f"
}

$modified = git diff --name-only
$deleted = git diff --name-only --diff-filter=D
$untracked = git ls-files --others --exclude-standard
$all = ($modified + $deleted + $untracked) | Where-Object { $_ -and $_ -notmatch '__pycache__|\.pyc$|node_modules|\.env$' } | Sort-Object -Unique

$count = 0
foreach ($file in $all) {
    git add -- "$file"
    if ($LASTEXITCODE -ne 0) { Write-Warning "Could not stage $file"; continue }
    $msg = Get-CommitMessage $file
    if ($file -in $deleted) {
        $msg = "chore(frontend): remove stale production bundle - $(Split-Path $file -Leaf)"
    }
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Skip or empty commit for $file"
    } else {
        $count++
        Write-Host "Committed ($count): $file"
    }
}

Write-Host "Total commits created: $count"
