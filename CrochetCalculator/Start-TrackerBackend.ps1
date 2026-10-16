$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
& npm.cmd start
if ($LASTEXITCODE -ne 0) { throw 'Backend stopped. Check the Supabase API settings and the error above.' }
