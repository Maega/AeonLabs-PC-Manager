# -------------------------------------------------------------------------
#   Check for latest NVIDIA driver version and compare to current version
# -------------------------------------------------------------------------

# Checking currently installed driver version
try {
    $VideoController = Get-WmiObject -ClassName Win32_VideoController | Where-Object { $_.Name -match "NVIDIA" }
    $ins_version = ($VideoController.DriverVersion.Replace('.', '')[-5..-1] -join '').insert(3, '.')
}
catch {
    Write-Host "Unable to detect a compatible Nvidia device."
    exit
}

# Checking latest driver version from Nvidia website
$link = Invoke-WebRequest -Uri 'https://www.nvidia.com/Download/processFind.aspx?psid=101&pfid=816&osid=57&lid=1&whql=1&lang=en-us&ctk=0&dtcid=1' -Method GET -UseBasicParsing
$link -match '<td class="gridItem">([^<]+?)</td>' | Out-Null
$version = $matches[1]

# Comparing installed driver version to latest driver version from Nvidia
$updateAvailable = "true"
if ($version -eq $ins_version) {
    $updateAvailable = "false"
}

Write-Host @"
{
    "current": $ins_version,
    "latest": $version,
    "updateAvailable": $updateAvailable
}
"@