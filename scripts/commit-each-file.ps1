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
        "package-lock.json" = "chore: add root package-lock for workspace dependency resolution"
        "pnpm-workspace.yaml" = "chore: add pnpm workspace definition for monorepo packages"
        "turbo.json" = "chore: add Turborepo task pipeline configuration"
        "PLATFORM.md" = "docs: add enterprise platform quick start, service map, and local URLs"
        "docker-compose.yml" = "infra: add Redpanda, microservices, API gateway, and observability stack to Compose"
        "openapi/fraudshield-api.yaml" = "docs: add OpenAPI 3.1 specification for enterprise FraudShield API"
    }
    if ($messages.ContainsKey($f)) { return $messages[$f] }

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
$untracked = git ls-files --others --exclude-standard
$all = ($modified + $untracked) | Where-Object { $_ -and $_ -notmatch '__pycache__|\.pyc$|node_modules' } | Sort-Object -Unique

$count = 0
foreach ($file in $all) {
    if (-not (Test-Path $file)) { continue }
    git add -- "$file"
    $msg = Get-CommitMessage $file
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Skip or empty commit for $file"
    } else {
        $count++
        Write-Host "Committed ($count): $file"
    }
}

Write-Host "Total commits created: $count"
