$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
& npm.cmd run dev
if ($LASTEXITCODE -ne 0) { throw 'The tracker stopped. Check the Supabase API settings and the error above.' }
