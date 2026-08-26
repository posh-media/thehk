# Generate THE-HK icon and splash assets from the source logo.
# Requires Windows PowerShell with .NET System.Drawing.

Param(
    [string]$Source = "C:\Users\Welcome Sir\Desktop\Projects\The-HK\the-hk\assets\HK logo.png",
    [string]$OutDir = "C:\Users\Welcome Sir\Desktop\Projects\The-HK\the-hk\assets"
)

Add-Type -AssemblyName System.Drawing

$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0D0D0D")

function New-Bitmap($w, $h, $transparent = $false) {
    if ($transparent) {
        return New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    }
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear($bgColor)
    $g.Dispose()
    return $bmp
}

function Draw-LogoCentered($g, $src, $targetW, $targetH, $paddingFactor = 0.15) {
    $availableW = $targetW * (1 - $paddingFactor * 2)
    $availableH = $targetH * (1 - $paddingFactor * 2)
    $scale = [Math]::Min($availableW / $src.Width, $availableH / $src.Height)
    $newW = [int]($src.Width * $scale)
    $newH = [int]($src.Height * $scale)
    $x = [int](($targetW - $newW) / 2)
    $y = [int](($targetH - $newH) / 2)

    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($src, $x, $y, $newW, $newH)
}

function Save-Png($bmp, $path) {
    $dir = Split-Path $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function New-Monochrome($src) {
    # Convert to black while preserving alpha
    $matrix = New-Object System.Drawing.Imaging.ColorMatrix
    $matrix.Matrix00 = 0
    $matrix.Matrix11 = 0
    $matrix.Matrix22 = 0
    $matrix.Matrix33 = 1  # alpha stays
    $matrix.Matrix40 = 0
    $matrix.Matrix41 = 0
    $matrix.Matrix42 = 0
    $matrix.Matrix44 = 1
    $attrs = New-Object System.Drawing.Imaging.ImageAttributes
    $attrs.SetColorMatrix($matrix)
    return $attrs
}

$logo = [System.Drawing.Image]::FromFile($Source)

# 1. Main app icon (iOS/Android legacy) - 1024x1024 on dark bg
$icon = New-Bitmap 1024 1024
$g = [System.Drawing.Graphics]::FromImage($icon)
Draw-LogoCentered $g $logo 1024 1024
$g.Dispose()
Save-Png $icon "$OutDir\icon.png"
$icon.Dispose()

# 2. Favicon - 512x512
$favicon = New-Bitmap 512 512
$g = [System.Drawing.Graphics]::FromImage($favicon)
Draw-LogoCentered $g $logo 512 512
$g.Dispose()
Save-Png $favicon "$OutDir\favicon.png"
$favicon.Dispose()

# 3. Splash icon - 1024x1024
$splashIcon = New-Bitmap 1024 1024
$g = [System.Drawing.Graphics]::FromImage($splashIcon)
Draw-LogoCentered $g $logo 1024 1024
$g.Dispose()
Save-Png $splashIcon "$OutDir\splash-icon.png"
$splashIcon.Dispose()

# 4. Full splash screen - 1284x2778
$splash = New-Bitmap 1284 2778
$g = [System.Drawing.Graphics]::FromImage($splash)
Draw-LogoCentered $g $logo 1284 2778 0.25
$g.Dispose()
Save-Png $splash "$OutDir\splash.png"
$splash.Dispose()

# 5. Android adaptive foreground - 432x432 transparent
$fg = New-Bitmap 432 432 $true
$g = [System.Drawing.Graphics]::FromImage($fg)
Draw-LogoCentered $g $logo 432 432
$g.Dispose()
Save-Png $fg "$OutDir\android-icon-foreground.png"
$fg.Dispose()

# 6. Android adaptive background - 512x512 solid brand color
$bg = New-Bitmap 512 512
Save-Png $bg "$OutDir\android-icon-background.png"
$bg.Dispose()

# 7. Android adaptive monochrome - 432x432 transparent black shape
$mono = New-Bitmap 432 432 $true
$g = [System.Drawing.Graphics]::FromImage($mono)
$attrs = New-Monochrome $logo
$scale = 0.7 * 432 / [Math]::Max($logo.Width, $logo.Height)
$newW = [int]($logo.Width * $scale)
$newH = [int]($logo.Height * $scale)
$x = [int]((432 - $newW) / 2)
$y = [int]((432 - $newH) / 2)
$dest = [System.Drawing.Rectangle]::new($x, $y, $newW, $newH)
$srcRect = [System.Drawing.Rectangle]::new(0, 0, $logo.Width, $logo.Height)
$g.DrawImage($logo, $dest, $srcRect.X, $srcRect.Y, $srcRect.Width, $srcRect.Height, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
$g.Dispose()
Save-Png $mono "$OutDir\android-icon-monochrome.png"
$mono.Dispose()

$logo.Dispose()

Write-Output "Assets generated in $OutDir"
