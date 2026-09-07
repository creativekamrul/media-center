Add-Type -AssemblyName System.Drawing
$iconBitmap = [System.Drawing.Bitmap]::new(256, 256)
$iconGraphics = [System.Drawing.Graphics]::FromImage($iconBitmap)
$iconGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$iconGraphics.Clear([System.Drawing.Color]::Transparent)
$iconBackground = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#e5bfa4'))
$iconForeground = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#29322a'))
function Draw-RoundedRect($graphics, $brush, $x, $y, $width, $height, $radius) {
  $shapePath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $shapePath.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $shapePath.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $shapePath.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $shapePath.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $shapePath.CloseFigure()
  $graphics.FillPath($brush, $shapePath)
  $shapePath.Dispose()
}
Draw-RoundedRect $iconGraphics $iconBackground 0 0 256 256 58
foreach ($bar in @(@(53,101,54), @(85,68,120), @(117,43,170), @(149,82,92), @(181,101,54))) { Draw-RoundedRect $iconGraphics $iconForeground $bar[0] $bar[1] 16 $bar[2] 8 }
$iconStream = [System.IO.MemoryStream]::new()
$iconBitmap.Save($iconStream, [System.Drawing.Imaging.ImageFormat]::Png)
$iconPng = $iconStream.ToArray()
$iconFile = [System.IO.File]::Create((Join-Path $PSScriptRoot '..\build\icon.ico'))
$iconWriter = [System.IO.BinaryWriter]::new($iconFile)
$iconWriter.Write([UInt16]0); $iconWriter.Write([UInt16]1); $iconWriter.Write([UInt16]1)
$iconWriter.Write([byte]0); $iconWriter.Write([byte]0); $iconWriter.Write([byte]0); $iconWriter.Write([byte]0)
$iconWriter.Write([UInt16]1); $iconWriter.Write([UInt16]32); $iconWriter.Write([UInt32]$iconPng.Length); $iconWriter.Write([UInt32]22); $iconWriter.Write($iconPng)
$iconWriter.Dispose(); $iconStream.Dispose(); $iconGraphics.Dispose(); $iconBitmap.Dispose(); $iconBackground.Dispose(); $iconForeground.Dispose()
