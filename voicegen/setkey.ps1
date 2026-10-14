# 브레인무브: Gemini API 키 저장 (이 창에서 직접 붙여넣기 — 화면에 보이지 않아요)
$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8
$dir = Join-Path $PSScriptRoot '..\_secret'; New-Item -ItemType Directory -Force $dir | Out-Null
Write-Host ''
Write-Host '  Google AI Studio(aistudio.google.com/apikey)에서 만든 Gemini API 키를' -ForegroundColor Yellow
Write-Host '  아래에 붙여넣고(마우스 오른쪽 클릭) Enter를 누르세요. 글자는 보이지 않아요.' -ForegroundColor Yellow
Write-Host ''
$s = Read-Host '  API 키' -AsSecureString
$k = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)).Trim()
if ($k.Length -lt 20) { Write-Host '  키가 너무 짧아요. 창을 닫고 다시 해 주세요.' -ForegroundColor Red; Read-Host '  Enter로 닫기'; exit }
Set-Content -Path (Join-Path $dir 'gemini_key.txt') -Value $k -NoNewline -Encoding ascii
Write-Host ''
Write-Host '  저장했어요! 이 창은 닫으셔도 돼요. Claude에게 "키 저장했어"라고 알려 주세요.' -ForegroundColor Green
Read-Host '  Enter로 닫기'
