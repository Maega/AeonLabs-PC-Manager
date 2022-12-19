# -------------------------------------------------------------------------
#          Download latest NVIDIA driver for Windows 10/11 x64
# -------------------------------------------------------------------------

# Get latest driver version number from NVIDIA's website
$link = Invoke-WebRequest -Uri 'https://www.nvidia.com/Download/processFind.aspx?psid=101&pfid=816&osid=57&lid=1&whql=1&lang=en-us&ctk=0&dtcid=1' -Method GET -UseBasicParsing
$link -match '<td class="gridItem">([^<]+?)</td>' | Out-Null
$version = $matches[1]

# Generate the download link
$url = "https://international.download.nvidia.com/Windows/$version/$version-desktop-win10-win11-64bit-international-dch-whql.exe"

# Create a new temp folder NVIDIA
$nvidiaTempFolder = "$env:temp\NVIDIA"
New-Item -Path $nvidiaTempFolder -ItemType Directory 2>&1 | Out-Null

# Downloading the installer
$dlFile = "$nvidiaTempFolder\$version.exe"
Write-Host "Downloading the latest version to $dlFile"
Start-BitsTransfer -Source $url -Destination $dlFile

if (!$?) {
    Write-Host "Download failed, trying alternative RP package now..."
    $url = "https://international.download.nvidia.com/Windows/$version/$version-desktop-win10-win11-64bit-international-dch-whql-rp.exe"
    Start-BitsTransfer -Source $url -Destination $dlFile
}

# Extracting setup files
$extractFolder = "$nvidiaTempFolder\$version"

#$filesToExtract = "Display.Driver HDAudio NVI2 PhysX EULA.txt ListDevices.txt setup.cfg setup.exe" # Minimal Install
$filesToExtract = "*" # Full Install

Write-Host "Download finished, extracting the files now..."

# Start extracting...
Start-Process -FilePath ".\7za.exe" -NoNewWindow -ArgumentList "x -bso0 -bsp1 -bse1 -aoa $dlFile $filesToExtract -o""$extractFolder""" -wait

# Delete compressed download file
Remove-Item -Path $dlFile

Write-Host @"
{
    "setupPath": "$extractFolder\setup.exe",
    "downloadUrl": "$url",
    "installType": "full"
}
"@