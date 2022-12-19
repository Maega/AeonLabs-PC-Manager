# -------------------------------------------------------------------------
#             Download latest AMD Auto-Detect driver installer
#                 ! This script is currently unfinished !
# -------------------------------------------------------------------------

# Checking name of current video card
#$videoController = Get-WmiObject -Class Win32_VideoController | Select-Object -First 1
#Write-Host $videoController.Name

# Getting URL to AMD Auto-Detect minimal installer
$link = Invoke-WebRequest -Uri "http://www.amd.com/en/support" -Method GET -UseBasicParsing
$link -match "href=`"https://drivers.amd.com/drivers/installer/(.*)`"" | Out-Null
$downloadUrl = "https://drivers.amd.com/drivers/installer/$($matches[1])"

# Create a new temp folder NVIDIA
$tempDir = "$env:temp\AMD_Driver"
New-Item -Path $tempDir -ItemType Directory 2>&1 | Out-Null

# Downloading the installer
$dlFile = "$tempDir\driver.exe"

#Start-BitsTransfer -Source $downloadUrl -Destination $dlFile -CustomHeaders @{"Referer"="https://www.amd.com/en/support"}
#Invoke-WebRequest -Uri $downloadUrl -OutFile $dlFile -Headers @{Referer="https://www.amd.com/en/support"} -Verbose

$webclient = New-Object System.Net.WebClient
$webclient.Headers.Add("Referer", "https://www.amd.com/en/support")
$webclient.DownloadFile($downloadUrl, $dlFile)

Write-Output "Download has finished!"