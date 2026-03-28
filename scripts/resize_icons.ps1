Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Hritwiz\.gemini\antigravity\brain\170f79fc-818a-4c43-8d38-89fb64a3f84b\agentbridge_icon_1774722930650.png"
$outDir = "c:\Users\Hritwiz\OneDrive\Actual Files\CODING\Projects\agentbridge\icons"

$src = [System.Drawing.Image]::FromFile($srcPath)

foreach ($size in @(16, 48, 128)) {
    $dest = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($src, 0, 0, $size, $size)
    $outPath = Join-Path $outDir "icon$size.png"
    $dest.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    Write-Output "Created icon$size.png"
}

$src.Dispose()
