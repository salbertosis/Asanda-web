[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('Preflight', 'Apply', 'Verify')][string]$Mode,
  [Parameter(Mandatory)][string]$ConnectionStateDirectory,
  [Parameter(Mandatory)][string]$PsqlPath,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{64}$')][string]$ApprovedCandidateReceiptHash
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$approvedTargetHash = 'a984bf1acccaf669f54a7d4a43449a58223c6cf00e7143beab293addc504bcdf'
$approvedBaseSha = '4e4b931c00dcb22cd93abce46bd776803f14df9d'
$approvedPsqlHash = '2e8ff78ed93cd1f8610c240116aa43be3c0969c7372c748e8af1050dad4fcf73'
$approvedBackupReceiptHash = 'ed92f24668cf5097f69cd0ceb57e17714df9d7cbaa544824fd96def2a2191bbc'
$approvedMigrationHash = 'e5470d3ed4bcc3a943f45f0bc71fc3140f68ce54dcb1aa1c680cca379a972694'
$approvedManifestHash = 'e65887b9f9b820d3b27636f5620f4bced9fff28930bf25deee014229791d4be3'
$migrationFile = '20260825120000_validate_news_article_body.sql'
$baselineVersions = @(
  '20260812132352','20260812154739','20260812161744','20260812172134','20260812173913',
  '20260812174910','20260812175456','20260812175735','20260812181338','20260812185434',
  '20260812191023','20260812192844','20260812204500','20260812211000','20260812223000',
  '20260812230000','20260812231000','20260817175000','20260817190000','20260817200000',
  '20260818150000','20260820120000','20260820133000','20260820150000','20260820151000',
  '20260820152000','20260823203019'
)

function Get-Sha256Hex {
  param([Parameter(Mandatory)][byte[]]$Bytes)
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function Invoke-GitBytes {
  param([Parameter(Mandatory)][string[]]$Arguments)
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = [Diagnostics.ProcessStartInfo]::new()
  $process.StartInfo.FileName = 'git.exe'
  $process.StartInfo.UseShellExecute = $false
  $process.StartInfo.RedirectStandardOutput = $true
  $process.StartInfo.RedirectStandardError = $true
  foreach ($argument in $Arguments) { [void]$process.StartInfo.ArgumentList.Add($argument) }
  [void]$process.Start()
  $memory = [IO.MemoryStream]::new()
  try {
    $process.StandardOutput.BaseStream.CopyTo($memory)
    $errorText = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'STOP: immutable Git input could not be read.' }
    return $memory.ToArray()
  }
  finally { $memory.Dispose(); $process.Dispose(); $errorText = $null }
}

function Get-MigrationSql {
  $bytes = Invoke-GitBytes @('show', "HEAD:supabase/migrations/$migrationFile")
  try { return [Text.Encoding]::UTF8.GetString($bytes) }
  finally { [Array]::Clear($bytes, 0, $bytes.Length) }
}

function Assert-ImmutableCandidate {
  param([Parameter(Mandatory)][string]$StatePath)
  $status = & git.exe status --porcelain --untracked-files=all 2>$null
  if ($LASTEXITCODE -ne 0 -or $status) { throw 'STOP: worktree or index is not clean.' }
  $executedBlob = & git.exe hash-object --path=scripts/invoke-production-news-body-migration.ps1 $PSCommandPath 2>$null
  $headBlob = & git.exe rev-parse HEAD:scripts/invoke-production-news-body-migration.ps1 2>$null
  if ($LASTEXITCODE -ne 0 -or $executedBlob -ne $headBlob) { throw 'STOP: executed wrapper differs from HEAD.' }
  & git.exe merge-base --is-ancestor $approvedBaseSha HEAD 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'STOP: approved base is not an ancestor of HEAD.' }
  $wrapperBytes = Invoke-GitBytes @('show', 'HEAD:scripts/invoke-production-news-body-migration.ps1')
  $envelopeBytes = Invoke-GitBytes @('show', 'HEAD:openspec/changes/panel-administracion/production-news-body-approval-envelope.md')
  try {
    $wrapperHash=Get-Sha256Hex $wrapperBytes; $envelopeHash=Get-Sha256Hex $envelopeBytes
    if (-not [Text.Encoding]::UTF8.GetString($envelopeBytes).Contains($wrapperHash)) {
      throw 'STOP: wrapper receipt mismatch.'
    }
  }
  finally { [Array]::Clear($wrapperBytes,0,$wrapperBytes.Length); [Array]::Clear($envelopeBytes,0,$envelopeBytes.Length) }
  $pathsBytes = Invoke-GitBytes @('ls-tree','-r','--name-only','HEAD','supabase/migrations')
  try { $paths = [Text.Encoding]::UTF8.GetString($pathsBytes).Split("`n",[StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() } | Sort-Object }
  finally { [Array]::Clear($pathsBytes,0,$pathsBytes.Length) }
  if ($paths.Count -ne 28) { throw 'STOP: migration count differs from authorization.' }
  $builder = [Text.StringBuilder]::new()
  foreach ($path in $paths) {
    $bytes = Invoke-GitBytes @('show', "HEAD:$path")
    try {
      if ($path -eq "supabase/migrations/$migrationFile" -and (Get-Sha256Hex $bytes) -ne $approvedMigrationHash) { throw 'STOP: migration receipt mismatch.' }
      [void]$builder.Append((Get-Sha256Hex $bytes)); [void]$builder.Append('  ')
      [void]$builder.Append([IO.Path]::GetFileName($path)); [void]$builder.Append([char]10)
    }
    finally { [Array]::Clear($bytes,0,$bytes.Length) }
  }
  $manifestBytes = [Text.Encoding]::UTF8.GetBytes($builder.ToString())
  try { if ((Get-Sha256Hex $manifestBytes) -ne $approvedManifestHash) { throw 'STOP: migration manifest differs from authorization.' } }
  finally { [Array]::Clear($manifestBytes,0,$manifestBytes.Length); $builder.Clear() | Out-Null }
  $candidatePath=Join-Path $StatePath 'production-news-body-candidate.json'
  if (-not (Test-Path -LiteralPath $candidatePath -PathType Leaf)) { throw 'STOP: approved candidate receipt is missing.' }
  $candidateBytes=[IO.File]::ReadAllBytes($candidatePath)
  try {
    if ((Get-Sha256Hex $candidateBytes) -ne $ApprovedCandidateReceiptHash) { throw 'STOP: candidate receipt hash mismatch.' }
    $candidate=[Text.Encoding]::UTF8.GetString($candidateBytes) | ConvertFrom-Json
  }
  finally { [Array]::Clear($candidateBytes,0,$candidateBytes.Length) }
  $names=@($candidate.PSObject.Properties.Name | Sort-Object)
  if (($names -join ',') -cne 'backup_receipt_sha256,envelope_sha256,head_sha,manifest_sha256,migration_sha256,target_sha256,wrapper_sha256') { throw 'STOP: candidate receipt schema mismatch.' }
  $head=(& git.exe rev-parse HEAD 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or $candidate.head_sha -cne $head -or $candidate.wrapper_sha256 -cne $wrapperHash -or $candidate.envelope_sha256 -cne $envelopeHash -or
    $candidate.migration_sha256 -cne $approvedMigrationHash -or $candidate.manifest_sha256 -cne $approvedManifestHash -or
    $candidate.backup_receipt_sha256 -cne $approvedBackupReceiptHash -or $candidate.target_sha256 -cne $approvedTargetHash) { throw 'STOP: candidate receipt does not bind the exact authorized state.' }
}

function Assert-BackupReceipt {
  param([Parameter(Mandatory)][string]$StatePath)
  $receiptPath = Join-Path $StatePath 'production-news-body-backup.json'
  if (-not (Test-Path -LiteralPath $receiptPath -PathType Leaf)) { throw 'STOP: approved backup receipt is missing.' }
  $receiptBytes = [IO.File]::ReadAllBytes($receiptPath)
  try {
    if ((Get-Sha256Hex $receiptBytes) -ne $approvedBackupReceiptHash) { throw 'STOP: backup receipt hash mismatch.' }
    $receipt = [Text.Encoding]::UTF8.GetString($receiptBytes) | ConvertFrom-Json
  }
  finally { [Array]::Clear($receiptBytes,0,$receiptBytes.Length) }
  $receiptNames=@($receipt.PSObject.Properties.Name | Sort-Object)
  if (($receiptNames -join ',') -cne 'archives,created_at_utc,postgres_major' -or [int]$receipt.postgres_major -ne 17) { throw 'STOP: backup receipt schema mismatch.' }
  $createdAt=[DateTimeOffset]::Parse([string]$receipt.created_at_utc,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind)
  $archives = @($receipt.archives)
  $expectedFiles=@('application.dump','auth.dump','storage.dump')
  if ($archives.Count -ne 3 -or ((@($archives.file | Sort-Object) -join ',') -cne ($expectedFiles -join ','))) { throw 'STOP: backup receipt must name the three approved archives.' }
  foreach ($archive in $archives) {
    if ((@($archive.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'bytes,file,sha256') { throw 'STOP: backup archive receipt schema mismatch.' }
    $hash=[string]$archive.sha256; $archiveMatches=@(Get-ChildItem -LiteralPath $StatePath -Directory -Filter 'backup-*' | ForEach-Object { Get-ChildItem -LiteralPath $_.FullName -File -Filter ([string]$archive.file) })
    if ($archiveMatches.Count -ne 1 -or $hash -notmatch '^[0-9a-f]{64}$' -or [long]$archive.bytes -ne $archiveMatches[0].Length) {
      throw 'STOP: backup archive receipt is incomplete.'
    }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $archiveMatches[0].FullName).Hash.ToLowerInvariant() -ne $hash) { throw 'STOP: backup archive hash mismatch.' }
  }
  return $createdAt
}

function ConvertFrom-DpapiHex {
  param([Parameter(Mandatory)][string]$Path)
  $hex = [IO.File]::ReadAllText($Path).Trim()
  if ($hex -notmatch '^[0-9a-fA-F]+$' -or ($hex.Length % 2) -ne 0) { throw 'STOP: protected credential payload is malformed.' }
  $protected = [byte[]]::new($hex.Length / 2)
  for ($index=0; $index -lt $protected.Length; $index++) { $protected[$index] = [Convert]::ToByte($hex.Substring($index*2,2),16) }
  try {
    Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
    return [Security.Cryptography.ProtectedData]::Unprotect($protected,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  }
  finally { [Array]::Clear($protected,0,$protected.Length); $hex=$null }
}

function Assert-WindowOpen {
  if ([DateTimeOffset]::UtcNow -ge $deadlineUtc) { throw 'STOP: authorized 60-minute window expired.' }
}

function Save-WindowState {
  param([bool]$Replace)
  $temporary="$windowPath.$([Guid]::NewGuid().ToString('N')).tmp"
  try {
    [IO.File]::WriteAllText($temporary,(ConvertTo-Json $window -Compress),[Text.UTF8Encoding]::new($false))
    [IO.File]::Move($temporary,$windowPath,$Replace)
  }
  finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
}

function Start-Phase {
  $stateLock=$null; try {
  $stateLock=[IO.File]::Open("$windowPath.lock",[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
  if (Test-Path -LiteralPath $windowPath -PathType Leaf) { $script:window=[IO.File]::ReadAllText($windowPath) | ConvertFrom-Json -DateKind String }
  else {
    if ($Mode -ne 'Preflight') { throw 'STOP: Preflight must start the fresh one-shot window.' }
    $now=[DateTimeOffset]::UtcNow
    if ($backupCreatedAt -gt $now -or $backupCreatedAt -lt $now.AddHours(-24)) { throw 'STOP: backup is future-dated or older than 24 hours.' }
    $script:window=[pscustomobject][ordered]@{StartedAtUtc=$now.ToString('O');CandidateReceiptSha256=$ApprovedCandidateReceiptHash;Preflight='not_started';Apply='not_started';Verify='not_started'}
    Save-WindowState $false
  }
  if ((@($window.PSObject.Properties.Name | Sort-Object) -join ',') -cne 'Apply,CandidateReceiptSha256,Preflight,StartedAtUtc,Verify' -or $window.CandidateReceiptSha256 -cne $ApprovedCandidateReceiptHash) { throw 'STOP: window receipt schema or candidate binding mismatch.' }
  foreach($phase in @('Preflight','Apply','Verify')) { if (@('not_started','started','succeeded') -cnotcontains [string]$window.$phase) { throw 'STOP: window phase state invalid.' } }
  $startedAt=[DateTimeOffset]::ParseExact([string]$window.StartedAtUtc,'O',[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind)
  $script:deadlineUtc=$startedAt.AddMinutes(60)
  if ($startedAt -gt [DateTimeOffset]::UtcNow -or $deadlineUtc -le [DateTimeOffset]::UtcNow -or $backupCreatedAt -gt $startedAt -or $backupCreatedAt -lt $startedAt.AddHours(-24)) { throw 'STOP: authorization window or backup freshness invalid.' }
  if ($window.$Mode -ne 'not_started' -or ($Mode -eq 'Apply' -and $window.Preflight -ne 'succeeded') -or ($Mode -eq 'Verify' -and $window.Apply -ne 'succeeded')) { throw 'STOP: one-shot phase order or state mismatch.' }
  $window.$Mode='started'; Save-WindowState $true
  Write-Output ("WINDOW_STARTED_UTC={0:O}" -f $startedAt); Write-Output ("WINDOW_DEADLINE_UTC={0:O}" -f $deadlineUtc)
  } finally { if ($null -ne $stateLock) { $stateLock.Dispose() } }
}

function Complete-Phase {
  if ($window.$Mode -ne 'started') { throw 'STOP: phase completion state mismatch.' }
  $window.$Mode='succeeded'; Save-WindowState $true
}

function Invoke-PsqlBounded {
  param([Parameter(Mandatory)][string]$Sql,[Parameter(Mandatory)][string]$ExpectedToken,[Parameter(Mandatory)][string]$Label)
  Assert-WindowOpen
  $sqlPath = Join-Path ([IO.Path]::GetTempPath()) ("asanda-news-body-{0}.sql" -f [Guid]::NewGuid().ToString('N'))
  $process=$null; $started=$false; $primaryFailure=$null
  try {
    [IO.File]::WriteAllText($sqlPath,$Sql,[Text.UTF8Encoding]::new($false))
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = [Diagnostics.ProcessStartInfo]::new()
    $process.StartInfo.FileName = $PsqlPath; $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.RedirectStandardOutput = $true; $process.StartInfo.RedirectStandardError = $true
    $process.StartInfo.Environment['PGHOST']=$pgHost; $process.StartInfo.Environment['PGPORT']='5432'
    $process.StartInfo.Environment['PGDATABASE']='postgres'; $process.StartInfo.Environment['PGUSER']=$pgUser
    $process.StartInfo.Environment['PGPASSWORD']=$password; $process.StartInfo.Environment['PGSSLMODE']='require'
    $process.StartInfo.Environment['PGCONNECT_TIMEOUT']='10'
    foreach ($argument in @('-X','--no-psqlrc','--quiet','--tuples-only','--no-align','--set','ON_ERROR_STOP=1','--set','VERBOSITY=terse','--file',$sqlPath)) { [void]$process.StartInfo.ArgumentList.Add($argument) }
    [void]$process.Start(); $started=$true; $stdoutTask=$process.StandardOutput.ReadToEndAsync(); $stderrTask=$process.StandardError.ReadToEndAsync()
    $remainingMs=[int][Math]::Max(1,[Math]::Min([int]::MaxValue,($deadlineUtc-[DateTimeOffset]::UtcNow).TotalMilliseconds))
    if (-not $process.WaitForExit($remainingMs)) { $process.Kill($true); throw "STOP: $Label exceeded authorized deadline." }
    [Threading.Tasks.Task]::WaitAll(@($stdoutTask,$stderrTask)); $stdout=$stdoutTask.Result; $stderr=$stderrTask.Result
    $nonEmptyLines=@($stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $safeLines=@($nonEmptyLines | Where-Object { $_ -match '^ASANDA_(DIAG\|[A-Z0-9_]+\|(true|false|[0-9]+)|NEWS_BODY_(PREFLIGHT|APPLY|VERIFY)_OK)$' })
    $unsafeLines=@($nonEmptyLines | Where-Object { $_ -notmatch '^ASANDA_(DIAG\|[A-Z0-9_]+\|(true|false|[0-9]+)|NEWS_BODY_(PREFLIGHT|APPLY|VERIFY)_OK)$' })
    $tokens=@($safeLines | Where-Object { $_ -match '^ASANDA_NEWS_BODY_' })
    $safeLines | ForEach-Object { Write-Output $_ }
    if ($process.ExitCode -ne 0 -or $unsafeLines.Count -ne 0 -or -not [string]::IsNullOrWhiteSpace($stderr) -or $tokens.Count -ne 1 -or $tokens[0] -ne $ExpectedToken) { throw "STOP: $Label failed; no repair or retry is authorized." }
  } catch { $primaryFailure=$_; throw }
  finally {
    $stdout=$null; $stderr=$null
    if ($null -ne $process) {
      if ($started) { try { if (-not $process.HasExited) { $process.Kill($true) } } catch {} }
      try { $process.Dispose() } catch {}
    }
    try { if (Test-Path -LiteralPath $sqlPath) { Remove-Item -LiteralPath $sqlPath -Force } } catch { if ($null -eq $primaryFailure) { throw } }
  }
}

$managedInvalidConstraintFrom="from pg_constraint constraint_row left join pg_class relation_row on relation_row.oid=constraint_row.conrelid left join pg_namespace relation_schema on relation_schema.oid=relation_row.relnamespace left join pg_type domain_row on domain_row.oid=constraint_row.contypid left join pg_namespace domain_schema on domain_schema.oid=domain_row.typnamespace where not constraint_row.convalidated and (relation_schema.nspname in ('public','private') or domain_schema.nspname in ('public','private'))"
function Get-GuardSql {
  param([Parameter(Mandatory)][ValidateSet('Preflight','Verify')][string]$Phase)
  $expected = if ($Phase -eq 'Preflight') { $baselineVersions } else { @($baselineVersions)+@('20260825120000') }
  $expectedSql = ($expected | Sort-Object | ForEach-Object { "'$_'" }) -join ','
  $expectedConstraintCount = if ($Phase -eq 'Preflight') { 0 } else { 3 }
  $ledgerRowSql = if ($Phase -eq 'Preflight') { "not exists(select 1 from supabase_migrations.schema_migrations where version='20260825120000')" } else { "exists(select 1 from supabase_migrations.schema_migrations where version='20260825120000' and name='validate_news_article_body' and statements=array[$tag$migrationSql$tag])" }
  $constraintExactSql = if ($Phase -eq 'Preflight') { "not exists(select 1 from pg_constraint where conrelid='public.news_articles'::regclass and conname in ('news_articles_body_max_length','news_articles_body_no_html_tags','news_articles_body_no_javascript_scheme'))" } else { @"
(select count(*)=3 and bool_and(contype='c' and convalidated and pg_get_constraintdef(oid,true)=case conname
  when 'news_articles_body_max_length' then 'CHECK (body IS NULL OR char_length(body) <= 20000)'
  when 'news_articles_body_no_html_tags' then 'CHECK (body IS NULL OR body !~* ''</?[a-z][^>]*>''::text)'
  when 'news_articles_body_no_javascript_scheme' then 'CHECK (body IS NULL OR body !~* ''javascript[[:space:]]*:''::text)' end)
 from pg_constraint where conrelid='public.news_articles'::regclass and conname in ('news_articles_body_max_length','news_articles_body_no_html_tags','news_articles_body_no_javascript_scheme'))
"@ }
  $token = "ASANDA_NEWS_BODY_$($Phase.ToUpperInvariant())_OK"
  return @"
begin;
set local transaction_read_only=on; set local statement_timeout='2min';
with d as (select
  (select coalesce(array_agg(version order by version),array[]::text[]) = array[$expectedSql] from supabase_migrations.schema_migrations) ledger_ok,
  (select count(*) from supabase_migrations.schema_migrations) ledger_count,
  ($ledgerRowSql) ledger_row_exact,
  (select count(*) from pg_constraint where conrelid='public.news_articles'::regclass and conname in ('news_articles_body_max_length','news_articles_body_no_html_tags','news_articles_body_no_javascript_scheme')) constraint_count,
  (select count(*) from pg_constraint where conrelid='public.news_articles'::regclass and conname in ('news_articles_body_max_length','news_articles_body_no_html_tags','news_articles_body_no_javascript_scheme') and convalidated) validated_count,
  ($constraintExactSql) constraint_exact,
  (select count(*) from public.news_articles where char_length(body)>20000) length_violations,
  (select count(*) from public.news_articles where body ~* '</?[a-z][^>]*>') html_violations,
  (select count(*) from public.news_articles where body ~* 'javascript[[:space:]]*:') javascript_violations,
  (select count(*) from pg_tables where schemaname='public') public_tables,
  (select count(*) from pg_tables where schemaname='private') private_tables,
  (select count(*) from pg_tables where schemaname='public' and rowsecurity) rls_tables,
  (select count(*) from pg_policies where schemaname='public') policies,
  (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','private')) triggers,
  (select count(*) $managedInvalidConstraintFrom) managed_invalid_constraints,
  (has_schema_privilege('anon','private','usage') and has_schema_privilege('authenticated','private','usage') and has_schema_privilege('service_role','private','usage')) private_usage
), lines as (select * from d cross join lateral (values
  (1,'ASANDA_DIAG|LEDGER_COUNT|'||ledger_count),(2,'ASANDA_DIAG|LEDGER_OK|'||ledger_ok),(3,'ASANDA_DIAG|LEDGER_ROW_EXACT|'||ledger_row_exact),(4,'ASANDA_DIAG|CONSTRAINT_COUNT|'||constraint_count),(5,'ASANDA_DIAG|VALIDATED_COUNT|'||validated_count),(6,'ASANDA_DIAG|CONSTRAINT_EXACT|'||constraint_exact),
  (7,'ASANDA_DIAG|LENGTH_VIOLATIONS|'||length_violations),(8,'ASANDA_DIAG|HTML_VIOLATIONS|'||html_violations),(9,'ASANDA_DIAG|JAVASCRIPT_VIOLATIONS|'||javascript_violations),
  (10,'ASANDA_DIAG|PUBLIC_TABLES|'||public_tables),(11,'ASANDA_DIAG|PRIVATE_TABLES|'||private_tables),(12,'ASANDA_DIAG|RLS_TABLES|'||rls_tables),(13,'ASANDA_DIAG|POLICIES|'||policies),(14,'ASANDA_DIAG|TRIGGERS|'||triggers),
  (15,'ASANDA_DIAG|MANAGED_INVALID_CONSTRAINTS|'||managed_invalid_constraints),(16,'ASANDA_DIAG|PRIVATE_USAGE|'||private_usage),
  (17,case when ledger_ok and ledger_row_exact and constraint_count=$expectedConstraintCount and constraint_exact and $(if ($Phase -eq 'Preflight') {'validated_count=0'} else {'validated_count=3'}) and length_violations=0 and html_violations=0 and javascript_violations=0 and public_tables=31 and private_tables=2 and rls_tables=31 and policies=58 and triggers=58 and managed_invalid_constraints=0 and private_usage then '$token' else 'ASANDA_NEWS_BODY_GUARD_FAIL' end)
) v(ord,line)) select line from lines order by ord;
rollback;
"@
}

$passwordBytes=$null; $password=$null; $project=$null; $projectRef=$null; $pgHost=$null; $pgUser=$null
$deadlineUtc=$null; $window=$null; $windowPath=$null; $backupCreatedAt=$null; $migrationSql=$null
try {
  if (-not (Test-Path -LiteralPath $PsqlPath -PathType Leaf)) { throw 'STOP: approved psql executable missing.' }
  $psqlInfo=[Diagnostics.FileVersionInfo]::GetVersionInfo((Resolve-Path -LiteralPath $PsqlPath).Path)
  if ($psqlInfo.FileMajorPart -ne 17 -or (Get-FileHash -Algorithm SHA256 -LiteralPath $PsqlPath).Hash.ToLowerInvariant() -ne $approvedPsqlHash) { throw 'STOP: psql binary differs from authorization.' }
  $statePath=(Resolve-Path -LiteralPath $ConnectionStateDirectory).Path
  Assert-ImmutableCandidate $statePath; $backupCreatedAt=Assert-BackupReceipt $statePath
  $projectPath=Join-Path $statePath 'project.json'; $passwordPath=Join-Path $statePath 'db-password.dpapi'
  if (-not (Test-Path -LiteralPath $projectPath -PathType Leaf) -or -not (Test-Path -LiteralPath $passwordPath -PathType Leaf)) { throw 'STOP: protected connection state incomplete.' }
  $windowPath=Join-Path $statePath 'production-news-body-window.json'
  $project=[IO.File]::ReadAllText($projectPath) | ConvertFrom-Json; $projectRef=[string]$project.ref; $region=[string]$project.region
  if ([string]::IsNullOrWhiteSpace($projectRef) -or [string]::IsNullOrWhiteSpace($region)) { throw 'STOP: target metadata incomplete.' }
  $refBytes=[Text.Encoding]::UTF8.GetBytes($projectRef)
  try { if ((Get-Sha256Hex $refBytes) -ne $approvedTargetHash) { throw 'STOP: target identity mismatch.' } }
  finally { [Array]::Clear($refBytes,0,$refBytes.Length) }
  $passwordBytes=ConvertFrom-DpapiHex $passwordPath; $password=[Text.Encoding]::Unicode.GetString($passwordBytes)
  $pgHost="aws-0-$region.pooler.supabase.com"; $pgUser="postgres.$projectRef"
  $migrationSql=Get-MigrationSql; $version='20260825120000'; $name='validate_news_article_body'; $tag='$asanda_news_body$'
  if ($migrationSql.Contains($tag)) { throw 'STOP: migration conflicts with ledger quoting boundary.' }
  Start-Phase
  if ($Mode -eq 'Preflight') { Invoke-PsqlBounded (Get-GuardSql Preflight) 'ASANDA_NEWS_BODY_PREFLIGHT_OK' 'read-only news-body preflight'; Complete-Phase; return }
  if ($Mode -eq 'Verify') { Invoke-PsqlBounded (Get-GuardSql Verify) 'ASANDA_NEWS_BODY_VERIFY_OK' 'independent news-body verification'; Complete-Phase; return }
  $before=(($baselineVersions | Sort-Object | ForEach-Object { "'$_'" }) -join ',')
  $after=((@($baselineVersions)+@($version) | Sort-Object | ForEach-Object { "'$_'" }) -join ',')
  $applySql=@"
begin;
set local lock_timeout='5s'; set local statement_timeout='2min'; set local idle_in_transaction_session_timeout='2min';
select pg_advisory_xact_lock(hashtextextended('asanda:production-news-body-20260825',0));
do `$guard`$ begin
  if (select coalesce(array_agg(version order by version),array[]::text[]) <> array[$before] from supabase_migrations.schema_migrations) then raise exception 'ledger guard failed'; end if;
  if exists(select 1 from pg_constraint where conrelid='public.news_articles'::regclass and conname in ('news_articles_body_max_length','news_articles_body_no_html_tags','news_articles_body_no_javascript_scheme')) then raise exception 'constraint guard failed'; end if;
  if exists(select 1 from public.news_articles where char_length(body)>20000 or body ~* '</?[a-z][^>]*>' or body ~* 'javascript[[:space:]]*:') then raise exception 'body data guard failed'; end if;
  if (select count(*)<>31 from pg_tables where schemaname='public') or (select count(*)<>2 from pg_tables where schemaname='private') or (select count(*)<>31 from pg_tables where schemaname='public' and rowsecurity)
    or (select count(*)<>58 from pg_policies where schemaname='public') or (select count(*)<>58 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','private'))
    or exists(select 1 $managedInvalidConstraintFrom)
    or not (has_schema_privilege('anon','private','usage') and has_schema_privilege('authenticated','private','usage') and has_schema_privilege('service_role','private','usage')) then raise exception 'structural guard failed'; end if;
end `$guard`$;
$migrationSql
insert into supabase_migrations.schema_migrations(version,name,statements) values ('$version','$name',array[$tag$migrationSql$tag]);
do `$guard`$ begin
  if (select coalesce(array_agg(version order by version),array[]::text[]) <> array[$after] from supabase_migrations.schema_migrations) then raise exception 'post ledger guard failed'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version='$version' and name='$name' and statements=array[$tag$migrationSql$tag]) then raise exception 'post ledger row guard failed'; end if;
  if not (select count(*)=3 and bool_and(contype='c' and convalidated and pg_get_constraintdef(oid,true)=case conname
    when 'news_articles_body_max_length' then 'CHECK (body IS NULL OR char_length(body) <= 20000)'
    when 'news_articles_body_no_html_tags' then 'CHECK (body IS NULL OR body !~* ''</?[a-z][^>]*>''::text)'
    when 'news_articles_body_no_javascript_scheme' then 'CHECK (body IS NULL OR body !~* ''javascript[[:space:]]*:''::text)' end)
    from pg_constraint where conrelid='public.news_articles'::regclass and conname in ('news_articles_body_max_length','news_articles_body_no_html_tags','news_articles_body_no_javascript_scheme')) then raise exception 'post constraint guard failed'; end if;
end `$guard`$;
commit;
select 'ASANDA_NEWS_BODY_APPLY_OK';
"@
  Invoke-PsqlBounded $applySql 'ASANDA_NEWS_BODY_APPLY_OK' 'authorized atomic news-body migration'
  Complete-Phase
  Write-Output 'APPLY_COMPLETE: run Verify in a fresh process and connection.'
}
finally {
  if ($null -ne $passwordBytes) { [Array]::Clear($passwordBytes,0,$passwordBytes.Length) }
  $password=$null; $project=$null; $pgHost=$null; $pgUser=$null; $projectRef=$null; $migrationSql=$null; [GC]::Collect()
}
