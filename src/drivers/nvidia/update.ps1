# -------------------------------------------------------------------------
#       Download & install latest NVIDIA driver for Windows 10/11 x64
# -------------------------------------------------------------------------

# Options (these can be altered by passing params when invoking the script)
$cleanInstall = $args.Contains("-clean") # If true, this will do a clean install
$minimalInstall = $args.Contains("-minimal") # If true, this will do a minimal install without GeForce Experience and other bloatware

# Checking currently installed driver version
try {
    $VideoController = Get-WmiObject -ClassName Win32_VideoController | Where-Object { $_.Name -match "NVIDIA" }
    $currentVersion = ($VideoController.DriverVersion.Replace('.', '')[-5..-1] -join '').insert(3, '.')
}
catch {
    Write-Host '{"didUpdate": false, "error": "Could not find compatible NVIDIA hardware."}'
    exit
}

# Get latest driver version number from NVIDIA's website
$link = Invoke-WebRequest -Uri 'https://www.nvidia.com/Download/processFind.aspx?psid=101&pfid=816&osid=57&lid=1&whql=1&lang=en-us&ctk=0&dtcid=1' -Method GET -UseBasicParsing
$link -match '<td class="gridItem">([^<]+?)</td>' | Out-Null
$latestVersion = $matches[1]

# Comparing installed driver version to latest driver version from Nvidia
if ($latestVersion -eq $currentVersion) {
    Write-Host '{"didUpdate": false, "error": "You already have the latest NVIDIA driver installed."}'
    exit
}

# Generate the download link
$url = "https://international.download.nvidia.com/Windows/$latestVersion/$latestVersion-desktop-win10-win11-64bit-international-dch-whql.exe"

# Create a new temp folder NVIDIA
$nvidiaTempFolder = "$env:temp\NVIDIA"
New-Item -Path $nvidiaTempFolder -ItemType Directory 2>&1 | Out-Null

# Downloading the installer
$dlFile = "$nvidiaTempFolder\$latestVersion.exe"
Write-Host "Downloading the latest version to $dlFile"
Start-BitsTransfer -Source $url -Destination $dlFile

if (!$?) {
    Write-Host "Download failed, trying alternative RP package now..."
    $url = "https://international.download.nvidia.com/Windows/$latestVersion/$latestVersion-desktop-win10-win11-64bit-international-dch-whql-rp.exe"
    Start-BitsTransfer -Source $url -Destination $dlFile
}

# Extracting setup files
$extractFolder = "$nvidiaTempFolder\$latestVersion"

$filesToExtract = "*" # Full Install
if ($minimalInstall) {$filesToExtract = "Display.Driver HDAudio NVI2 PhysX EULA.txt ListDevices.txt setup.cfg setup.exe"} # Minimal Install

Write-Host "Download finished, extracting the files now..."

# Start extracting...
Start-Process -FilePath ".\7za.exe" -NoNewWindow -ArgumentList "x -bso0 -bsp1 -bse1 -aoa $dlFile $filesToExtract -o""$extractFolder""" -wait

if ($minimalInstall) {
    # Remove unneeded dependencies from setup.cfg for a minimal install
    (Get-Content "$extractFolder\setup.cfg") | Where-Object { $_ -notmatch 'name="\${{(EulaHtmlFile|FunctionalConsentFile|PrivacyPolicyFile)}}' } | Set-Content "$extractFolder\setup.cfg" -Encoding UTF8 -Force
}

# Installing drivers
Write-Host "Installing NVIDIA drivers now..."
$install_args = "-passive -noreboot -noeula -nofinish -s"
if ($cleanInstall) {$install_args = $install_args + " -clean"}
Start-Process -FilePath "$extractFolder\setup.exe" -ArgumentList $install_args -wait

# Cleaning up downloaded files
Write-Host "Cleaning up downloaded files..."
Remove-Item $nvidiaTempFolder -Recurse -Force

Write-Host @"
{
    "didUpdate": "true",
    "oldVersion": $(ConvertTo-Json $currentVersion),
    "newVersion": $(ConvertTo-Json $latestVersion),
    "cleanInstall": $(ConvertTo-Json $cleanInstall),
    "minimalInstall": $(ConvertTo-Json $minimalInstall)
}
"@