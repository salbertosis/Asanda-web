[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('Preflight', 'Apply', 'Verify')][string]$Mode,
  [Parameter(Mandatory)][string]$ConnectionStateDirectory,
  [Parameter(Mandatory)][string]$PsqlPath)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$startedAtUtc = $null
$deadlineUtc = $null
$approvedTargetHash = 'a984bf1acccaf669f54a7d4a43449a58223c6cf00e7143beab293addc504bcdf'
$approvedManifestHash = 'da3f3d3babc31b585ffd1f52fa52c3e3028afb8fe3e4730b2b3c2b120e68babf'
$approvedBaseSha = '3719fb85022a4a354d883b97ffb24a0503dc1c42'
$approvedPsqlHash = '2e8ff78ed93cd1f8610c240116aa43be3c0969c7372c748e8af1050dad4fcf73'
$productionVersions = @('20260812132352','20260812154739','20260812161744','20260812172134',
  '20260812173913','20260812174910','20260812175456','20260812175735','20260812181338','20260812185434',
  '20260812191023','20260812192844','20260812204500','20260812211000','20260812223000','20260812230000')
$ledgerOnlyMigration = '20260812231000_correct_copa_pasion_acuatica_organizer.sql'
$migrationBatches = @(
  @('20260817175000_add_admin_audit_log.sql','20260817190000_add_admin_content_contracts.sql',
    '20260817200000_add_staff_profile_transition_rpc.sql','20260818150000_enable_content_contracts_rls.sql'),
  @('20260820120000_add_club_lifecycle_contracts.sql','20260820133000_add_competition_admin_contracts.sql'),
  @('20260820150000_add_result_import_transaction.sql','20260820151000_add_public_result_query.sql',
    '20260820152000_fix_result_import_entry_conflict.sql'), @('20260823203019_grant_private_schema_usage.sql'))
function Assert-WindowOpen {
  if ([DateTimeOffset]::UtcNow -ge $deadlineUtc) {
    throw 'STOP: the authorized 60-minute window has expired.'
  }
}
function Get-Sha256Hex {
  param([Parameter(Mandatory)][byte[]]$Bytes)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '').ToLowerInvariant()
  }
  finally {
    $sha.Dispose()
  }
}
function Invoke-GitBytes {
  param([Parameter(Mandatory)][string[]]$Arguments)
  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $process.StartInfo.FileName = 'git.exe'
  $process.StartInfo.UseShellExecute = $false
  $process.StartInfo.RedirectStandardOutput = $true
  $process.StartInfo.RedirectStandardError = $true
  foreach ($argument in $Arguments) { [void]$process.StartInfo.ArgumentList.Add($argument) }
  [void]$process.Start()
  $memory = [System.IO.MemoryStream]::new()
  try {
    $process.StandardOutput.BaseStream.CopyTo($memory)
    $errorText = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'STOP: immutable Git input could not be read.' }
    return $memory.ToArray()
  }
  finally {
    $memory.Dispose()
    $process.Dispose()
    $errorText = $null
  }
}
function Assert-ImmutableCandidate {
  $status = & git.exe status --porcelain --untracked-files=all 2>$null
  if ($LASTEXITCODE -ne 0 -or $status) { throw 'STOP: worktree or index is not clean.' }
  $executedBlob = & git.exe hash-object --path=scripts/invoke-production-migration-batch.ps1 $PSCommandPath 2>$null
  $headBlob = & git.exe rev-parse HEAD:scripts/invoke-production-migration-batch.ps1 2>$null
  if ($LASTEXITCODE -ne 0 -or $executedBlob -ne $headBlob) { throw 'STOP: executed wrapper differs from HEAD.' }
  $selfBytes = Invoke-GitBytes @('show','HEAD:scripts/invoke-production-migration-batch.ps1')
  $envelopeBytes = Invoke-GitBytes @('show','HEAD:openspec/changes/panel-administracion/production-rls-approval-envelope.md')
  try {
    if (-not [System.Text.Encoding]::UTF8.GetString($envelopeBytes).Contains((Get-Sha256Hex $selfBytes))) { throw 'STOP: wrapper receipt mismatch.' }
  }
  finally { [Array]::Clear($selfBytes,0,$selfBytes.Length); [Array]::Clear($envelopeBytes,0,$envelopeBytes.Length) }
  $headBytes = Invoke-GitBytes @('rev-parse', 'HEAD')
  try {
    $head = [System.Text.Encoding]::UTF8.GetString($headBytes).Trim()
    $ancestor = & git.exe merge-base --is-ancestor $approvedBaseSha $head 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'STOP: the approved base is not an ancestor of HEAD.' }
  }
  finally {
    [Array]::Clear($headBytes, 0, $headBytes.Length)
    $head = $null
    $ancestor = $null
  }
  $pathBytes = Invoke-GitBytes @('ls-tree', '-r', '--name-only', 'HEAD', 'supabase/migrations')
  try {
    $paths = [System.Text.Encoding]::UTF8.GetString($pathBytes).Split("`n", [StringSplitOptions]::RemoveEmptyEntries) |
      ForEach-Object { $_.Trim() } | Sort-Object
  }
  finally {
    [Array]::Clear($pathBytes, 0, $pathBytes.Length)
  }
  if ($paths.Count -ne 27) { throw 'STOP: the migration count differs from the approved candidate.' }
  $builder = [System.Text.StringBuilder]::new()
  foreach ($path in $paths) {
    $blob = Invoke-GitBytes @('show', "HEAD:$path")
    try {
      [void]$builder.Append((Get-Sha256Hex $blob))
      [void]$builder.Append('  ')
      [void]$builder.Append([System.IO.Path]::GetFileName($path))
      [void]$builder.Append([char]10)
    }
    finally {
      [Array]::Clear($blob, 0, $blob.Length)
    }
  }
  $manifestBytes = [System.Text.Encoding]::UTF8.GetBytes($builder.ToString())
  try {
    if ((Get-Sha256Hex $manifestBytes) -ne $approvedManifestHash) {
      throw 'STOP: the canonical migration manifest differs from the authorization.'
    }
  }
  finally {
    [Array]::Clear($manifestBytes, 0, $manifestBytes.Length)
    $builder.Clear() | Out-Null
  }
}
function ConvertFrom-DpapiHex {
  param([Parameter(Mandatory)][string]$Path)
  $hex = [System.IO.File]::ReadAllText($Path).Trim()
  if ($hex -notmatch '^[0-9a-fA-F]+$' -or ($hex.Length % 2) -ne 0) {
    throw 'STOP: protected credential payload is malformed.'
  }
  $protected = [byte[]]::new($hex.Length / 2)
  for ($index = 0; $index -lt $protected.Length; $index++) {
    $protected[$index] = [Convert]::ToByte($hex.Substring($index * 2, 2), 16)
  }
  try {
    Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
    return [System.Security.Cryptography.ProtectedData]::Unprotect(
      $protected,
      $null,
      [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
  }
  finally {
    [Array]::Clear($protected, 0, $protected.Length)
    $hex = $null
  }
}
function Invoke-PsqlBounded {
  param([Parameter(Mandatory)][string]$Sql, [Parameter(Mandatory)][string]$ExpectedOutput,
    [Parameter(Mandatory)][string]$Label)
  Assert-WindowOpen
  $sqlPath = Join-Path ([System.IO.Path]::GetTempPath()) ("asanda-prod-{0}.sql" -f [Guid]::NewGuid().ToString('N'))
  [System.IO.File]::WriteAllText($sqlPath, $Sql, [System.Text.UTF8Encoding]::new($false))
  $process = [System.Diagnostics.Process]::new()
  try {
    $process.StartInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $process.StartInfo.FileName = $PsqlPath
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    $process.StartInfo.Environment['PGHOST'] = $pgHost
    $process.StartInfo.Environment['PGPORT'] = '5432'
    $process.StartInfo.Environment['PGDATABASE'] = 'postgres'
    $process.StartInfo.Environment['PGUSER'] = $pgUser
    $process.StartInfo.Environment['PGPASSWORD'] = $password
    $process.StartInfo.Environment['PGSSLMODE'] = 'require'
    $process.StartInfo.Environment['PGCONNECT_TIMEOUT'] = '10'
    foreach ($argument in @('-X', '--no-psqlrc', '--quiet', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--set', 'VERBOSITY=terse', '--file', $sqlPath)) {
      [void]$process.StartInfo.ArgumentList.Add($argument)
    }
    [void]$process.Start()
    $stdoutTask = $process.StandardOutput.ReadToEndAsync(); $stderrTask = $process.StandardError.ReadToEndAsync()
    $remainingMs = [int][Math]::Max(1, [Math]::Min([int]::MaxValue, ($deadlineUtc - [DateTimeOffset]::UtcNow).TotalMilliseconds))
    if (-not $process.WaitForExit($remainingMs)) { $process.Kill($true); throw "STOP: $Label exceeded the authorized deadline." }
    [Threading.Tasks.Task]::WaitAll(@($stdoutTask,$stderrTask)); $stdout = $stdoutTask.Result.Trim(); $stderr = $stderrTask.Result
    $phaseTokens = @($stdout -split '\r?\n' | Where-Object { $_ -match '^ASANDA_(PREFLIGHT|VERIFY|LEDGER|BATCH_[1-4]|APPLY)_OK$' })
    if ($process.ExitCode -ne 0 -or $phaseTokens.Count -eq 0 -or $phaseTokens[-1] -ne $ExpectedOutput) {
      if ($phaseTokens.Count) { Write-Output "STOP_AFTER=$($phaseTokens[-1])" }
      throw "STOP: $Label failed; no repair or retry is authorized."
    }
    $phaseTokens | ForEach-Object { Write-Output "PHASE=$_" }; Write-Output "PASS: $Label"
  }
  finally {
    $stdout = $null
    $stderr = $null
    if (-not $process.HasExited) { $process.Kill($true) }
    $process.Dispose()
    if (Test-Path -LiteralPath $sqlPath) { Remove-Item -LiteralPath $sqlPath -Force }
  }
}
function Get-LedgerInsertSql {
  param([Parameter(Mandatory)][string]$FileName)
  $version = $FileName.Substring(0, 14)
  $name = [System.IO.Path]::GetFileNameWithoutExtension($FileName).Substring(15)
  $path = "supabase/migrations/$FileName"
  $bytes = Invoke-GitBytes @('show', "HEAD:$path")
  try {
    $statement = [System.Text.Encoding]::UTF8.GetString($bytes)
  }
  finally {
    [Array]::Clear($bytes, 0, $bytes.Length)
  }
  $tag = "`$asanda_$version`$"
  if ($statement.Contains($tag)) { throw 'STOP: migration conflicts with the ledger quoting boundary.' }
  return "insert into supabase_migrations.schema_migrations(version,name,statements) values ('$version','$name',array[$tag$statement$tag]);"
}
function Get-MigrationSql {
  param([Parameter(Mandatory)][string]$FileName)
  $bytes = Invoke-GitBytes @('show', "HEAD:supabase/migrations/$FileName")
  try { return [System.Text.Encoding]::UTF8.GetString($bytes) }
  finally { [Array]::Clear($bytes, 0, $bytes.Length) }
}
function Get-PreflightSql {
  $expected = ($productionVersions | ForEach-Object { "'$_'" }) -join ','
  return @"
begin;
set local transaction_read_only = on;
with ledger as (
  select coalesce(array_agg(version order by version), array[]::text[]) as versions
  from supabase_migrations.schema_migrations
), guards as (
  select
    (select versions = array[$expected] from ledger) as ledger_ok,
    (select count(*) = 1
       from public.competitions competition
       join public.organizations organization on organization.id = competition.organizer_id
       join public.media_assets asset on asset.id = competition.logo_asset_id
      where competition.slug = 'copa-pasion-acuatica-2026'
        and organization.slug = 'feveda'
        and asset.provider = 'cloudinary' and asset.public_id = 'feveda_logo') as copa_ok,
    to_regclass('private.admin_audit_log') is null
      and to_regclass('public.featured_athletes') is null
      and to_regclass('public.source_mappings') is null as object_residue_zero,
    not exists (
      select 1 from public.organizations
      where organization_type = 'club' and (btrim(name) = '' or slug <> lower(slug))
    ) as club_data_ok,
    not exists (select 1 from public.venues where btrim(name) = '') as venue_names_ok,
    not exists (
      select 1 from public.venues
      group by lower(btrim(name)), lower(btrim(coalesce(address,''))),
        lower(btrim(coalesce(city,''))), lower(btrim(coalesce(region,''))), upper(coalesce(country_code,''))
      having count(*) > 1
    ) as venue_identity_ok,
    (select count(*) = 0 from public.source_documents) as source_documents_empty,
    (select count(*) = 0 from public.import_batches) as import_batches_empty,
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.performances'::regclass and conname = 'performances_entry_id_key'
    ) as performance_key_ok
)
select case when ledger_ok and copa_ok and object_residue_zero and club_data_ok and venue_names_ok
  and venue_identity_ok and source_documents_empty and import_batches_empty and performance_key_ok
  then 'ASANDA_PREFLIGHT_OK' else 'ASANDA_PREFLIGHT_FAIL' end
from guards;
rollback;
"@
}
function Get-VerifySql {
  $expected = ((@($productionVersions) + @('20260812231000') + @($migrationBatches | ForEach-Object { $_ | ForEach-Object { $_.Substring(0,14) } })) | Sort-Object) -join "','"
  return @"
begin;
set local transaction_read_only = on;
with guards as (
  select
    (select coalesce(array_agg(version order by version),array[]::text[]) = array['$expected']
      from supabase_migrations.schema_migrations) as ledger_exact,
    (select count(*) = 1
       from public.competitions competition
       join public.organizations organization on organization.id = competition.organizer_id
       join public.media_assets asset on asset.id = competition.logo_asset_id
      where competition.slug = 'copa-pasion-acuatica-2026'
        and organization.slug = 'feveda'
        and asset.provider = 'cloudinary' and asset.public_id = 'feveda_logo') as copa_ok,
    to_regclass('private.admin_audit_log') is not null
      and to_regclass('public.featured_athletes') is not null
      and to_regclass('public.source_mappings') is not null as objects_ok,
    (select count(*) = 31 from pg_tables where schemaname='public') as public_tables_ok,
    (select count(*) = 2 from pg_tables where schemaname='private') as private_tables_ok,
    (select count(*) = 31 from pg_tables where schemaname='public' and rowsecurity) as rls_ok,
    (select count(*) = 58 from pg_policies where schemaname='public') as policies_ok,
    (select count(*) = 58 from pg_trigger trigger_row join pg_class table_row on table_row.oid=trigger_row.tgrelid
      join pg_namespace schema_row on schema_row.oid=table_row.relnamespace where not trigger_row.tgisinternal and schema_row.nspname in ('public','private')) as triggers_ok,
    (select (select count(*) from private.admin_audit_log)+(select count(*) from public.featured_athletes)+
      (select count(*) from public.source_mappings)+(select count(*) from public.source_documents)+
      (select count(*) from public.import_batches)=0) as new_residue_zero,
    (select count(*) = 0 from pg_constraint where not convalidated) as constraints_ok,
    has_schema_privilege('anon','private','usage')
      and has_schema_privilege('authenticated','private','usage')
      and has_schema_privilege('service_role','private','usage') as private_usage_ok
)
select case when ledger_exact and copa_ok and objects_ok and public_tables_ok and private_tables_ok and rls_ok
  and policies_ok and triggers_ok and new_residue_zero and constraints_ok and private_usage_ok
  then 'ASANDA_VERIFY_OK' else 'ASANDA_VERIFY_FAIL' end
from guards;
rollback;
"@
}
$passwordBytes=$null; $password=$null; $projectRef=$null; $pgHost=$null; $pgUser=$null; $window=$null
try {
  if (-not (Test-Path -LiteralPath $PsqlPath -PathType Leaf)) { throw 'STOP: approved psql executable was not found.' }
  $psqlInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo((Resolve-Path -LiteralPath $PsqlPath).Path)
  if ($psqlInfo.FileMajorPart -ne 17 -or (Get-FileHash -Algorithm SHA256 -LiteralPath $PsqlPath).Hash.ToLowerInvariant() -ne $approvedPsqlHash) { throw 'STOP: psql binary differs from the approved version.' }
  $statePath = (Resolve-Path -LiteralPath $ConnectionStateDirectory).Path
  $projectPath = Join-Path $statePath 'project.json'
  $passwordPath = Join-Path $statePath 'db-password.dpapi'
  if (-not (Test-Path -LiteralPath $projectPath -PathType Leaf) -or -not (Test-Path -LiteralPath $passwordPath -PathType Leaf)) {
    throw 'STOP: protected connection state is incomplete.'
  }
  Assert-ImmutableCandidate
  $windowPath = Join-Path $statePath 'production-migration-window.json'
  if (Test-Path -LiteralPath $windowPath -PathType Leaf) { $window = [IO.File]::ReadAllText($windowPath) | ConvertFrom-Json -DateKind String }
  elseif ($Mode -eq 'Verify') { throw 'STOP: the original authorization-window receipt is missing.' }
  else {
    $startedAtUtc = [DateTimeOffset]::UtcNow; $temporaryWindowPath = "$windowPath.$([Guid]::NewGuid().ToString('N')).tmp"
    try { [IO.File]::WriteAllText($temporaryWindowPath,(ConvertTo-Json @{ StartedAtUtc=$startedAtUtc.ToString('O') } -Compress),[Text.UTF8Encoding]::new($false)); [IO.File]::Move($temporaryWindowPath,$windowPath,$false) }
    catch { if (-not (Test-Path -LiteralPath $windowPath -PathType Leaf)) { throw }; $window = [IO.File]::ReadAllText($windowPath) | ConvertFrom-Json -DateKind String }
    finally { if (Test-Path -LiteralPath $temporaryWindowPath) { Remove-Item -LiteralPath $temporaryWindowPath -Force } }
  }
  if ($null -ne $window) { $names=@($window.PSObject.Properties.Name); if ($names.Count -ne 1 -or $names[0] -ne 'StartedAtUtc') { throw 'STOP: authorization-window receipt is malformed.' }; $startedAtUtc=[DateTimeOffset]::ParseExact([string]$window.StartedAtUtc,'O',[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind) }
  $deadlineUtc = $startedAtUtc.AddMinutes(60)
  if ($startedAtUtc -gt [DateTimeOffset]::UtcNow -or $deadlineUtc -le [DateTimeOffset]::UtcNow) { throw 'STOP: authorization window is invalid or expired.' }
  $project = [System.IO.File]::ReadAllText($projectPath) | ConvertFrom-Json
  $projectRef = [string]$project.ref
  $region = [string]$project.region
  if ([string]::IsNullOrWhiteSpace($projectRef) -or [string]::IsNullOrWhiteSpace($region)) {
    throw 'STOP: target metadata is incomplete.'
  }
  $refBytes = [System.Text.Encoding]::UTF8.GetBytes($projectRef)
  try {
    if ((Get-Sha256Hex $refBytes) -ne $approvedTargetHash) { throw 'STOP: target identity mismatch.' }
  }
  finally { [Array]::Clear($refBytes, 0, $refBytes.Length) }
  $passwordBytes = ConvertFrom-DpapiHex $passwordPath
  $password = [System.Text.Encoding]::Unicode.GetString($passwordBytes)
  $pgHost = "aws-0-$region.pooler.supabase.com"
  $pgUser = "postgres.$projectRef"
  Write-Output ("WINDOW_STARTED_UTC={0:O}" -f $startedAtUtc)
  Write-Output ("WINDOW_DEADLINE_UTC={0:O}" -f $deadlineUtc)
  if ($Mode -eq 'Verify') {
    Invoke-PsqlBounded (Get-VerifySql) 'ASANDA_VERIFY_OK' 'independent aggregate verification'
    return
  }
  Invoke-PsqlBounded (Get-PreflightSql) 'ASANDA_PREFLIGHT_OK' 'read-only production preflight'
  if ($Mode -eq 'Preflight') { return }
  $ledgerSql = Get-LedgerInsertSql $ledgerOnlyMigration
  $ledgerTransaction = @"
begin;
do `$guard`$
declare before_update timestamptz;
begin
  if (select coalesce(array_agg(version order by version), array[]::text[]) <> array[$(($productionVersions | ForEach-Object { "'$_'" }) -join ',')] from supabase_migrations.schema_migrations) then
    raise exception 'ledger guard failed';
  end if;
  select competition.updated_at into strict before_update
  from public.competitions competition
  join public.organizations organization on organization.id = competition.organizer_id
  join public.media_assets asset on asset.id = competition.logo_asset_id
  where competition.slug = 'copa-pasion-acuatica-2026'
    and organization.slug = 'feveda'
    and asset.provider = 'cloudinary' and asset.public_id = 'feveda_logo'
  for update of competition;
  $ledgerSql
  if (select updated_at is distinct from before_update from public.competitions where slug = 'copa-pasion-acuatica-2026') then
    raise exception 'protected row changed';
  end if;
end
`$guard`$;
commit;
select 'ASANDA_LEDGER_OK';
"@
  $applySql = [System.Text.StringBuilder]::new()
  [void]$applySql.AppendLine("set lock_timeout='5s'; set statement_timeout='10min'; set idle_in_transaction_session_timeout='2min';")
  [void]$applySql.AppendLine("do `$lock`$ begin if not pg_try_advisory_lock(hashtextextended('asanda:production-migration-20260823',0)) then raise exception 'migration lock unavailable'; end if; end `$lock`$;")
  [void]$applySql.AppendLine($ledgerTransaction)
  $batchNumber = 0
  foreach ($batch in $migrationBatches) {
    $batchNumber++
    $sql = [System.Text.StringBuilder]::new()
    [void]$sql.AppendLine('begin;')
    foreach ($fileName in $batch) {
      [void]$sql.AppendLine((Get-MigrationSql $fileName))
      [void]$sql.AppendLine((Get-LedgerInsertSql $fileName))
    }
    [void]$sql.AppendLine('commit;')
    [void]$sql.AppendLine("select 'ASANDA_BATCH_${batchNumber}_OK';")
    [void]$applySql.AppendLine($sql.ToString())
    $sql.Clear() | Out-Null
  }
  [void]$applySql.AppendLine("select pg_advisory_unlock(hashtextextended('asanda:production-migration-20260823',0)) where false;")
  [void]$applySql.AppendLine("select 'ASANDA_APPLY_OK';")
  try { Invoke-PsqlBounded $applySql.ToString() 'ASANDA_APPLY_OK' 'authorized migration batch' }
  finally { $applySql.Clear() | Out-Null }
  Write-Output 'APPLY_COMPLETE: run Verify in a separate process and connection.'
}
finally {
  if ($null -ne $passwordBytes) { [Array]::Clear($passwordBytes, 0, $passwordBytes.Length) }
  $password = $null
  $projectRef = $null
  $pgHost = $null
  $pgUser = $null
  $project = $null
  [GC]::Collect()
}
