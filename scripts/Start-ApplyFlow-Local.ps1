$ErrorActionPreference = "Stop"
$env:APPLYFLOW_LOCAL_SETUP = "1"
try {
  node tests/e2e/server.mjs
} finally {
  Remove-Item Env:APPLYFLOW_LOCAL_SETUP -ErrorAction SilentlyContinue
}