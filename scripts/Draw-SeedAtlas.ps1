Add-Type -AssemblyName System.Drawing
$atlasData = Get-Content -Raw -Encoding UTF8 -LiteralPath 'workdesk/seed-atlas.json' | ConvertFrom-Json
$bitmap = [System.Drawing.Bitmap]::new(1240,860)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f3eb'))
$font = [System.Drawing.Font]::new('Yu Gothic UI',11)
$small = [System.Drawing.Font]::new('Yu Gothic UI',9)
$title = [System.Drawing.Font]::new('Yu Gothic UI',19)
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#304c3e'))
$muted = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#7e8b75'))
$graphics.DrawString('IF100 — Seedごとに異なる世界',$title,$ink,28,18)
$graphics.DrawString('同じ生成規則 / 16 × 16 / 標高・湿度・気温から生成（初期状態）',$small,$muted,30,55)
$labels = @('大陸と長い水系','湿潤な森林と雨林','乾燥した大陸','寒冷な大陸','いくつもの島','山脈と森林','蛇行する水系','多様な気候帯')
for ($k=0; $k -lt $atlasData.worlds.Count; $k++) {
 $world = $atlasData.worlds[$k]
 $ox=28+($k%4)*307
 $oy=95+[math]::Floor($k/4)*359
 $my=$oy+32
 $graphics.DrawString("Seed $($world.seed) · $($labels[$k])",$font,$ink,[single]$ox,[single]$oy)
 foreach ($tile in $world.cells) {
  $tx=[int]($ox+$tile.x*17)
  $ty=[int]($my+$tile.y*17)
  $col=[int]$atlasData.palette.PSObject.Properties[$tile.biome].Value.color
  $brush=[System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(($col -shr 16)-band 255,($col -shr 8)-band 255,$col -band 255))
  $graphics.FillRectangle($brush,$tx,$ty,17,17)
  $brush.Dispose()
  if ($tile.terrain -eq 'mountain') {
   $points=[System.Drawing.PointF[]]@([System.Drawing.PointF]::new($tx+2,$ty+14),[System.Drawing.PointF]::new($tx+8,$ty+2),[System.Drawing.PointF]::new($tx+15,$ty+14))
   $graphics.FillPolygon([System.Drawing.Brushes]::SlateGray,$points)
   $snow=[System.Drawing.PointF[]]@([System.Drawing.PointF]::new($tx+6,$ty+6),[System.Drawing.PointF]::new($tx+8,$ty+2),[System.Drawing.PointF]::new($tx+10,$ty+6))
   $graphics.FillPolygon([System.Drawing.Brushes]::WhiteSmoke,$snow)
  } elseif ($tile.forest -gt .3 -and $tile.terrain -notin @('sea','river')) {
   $points=[System.Drawing.PointF[]]@([System.Drawing.PointF]::new($tx+4,$ty+12),[System.Drawing.PointF]::new($tx+8,$ty+4),[System.Drawing.PointF]::new($tx+13,$ty+12))
   $graphics.FillPolygon([System.Drawing.Brushes]::DarkOliveGreen,$points)
  }
  if ($tile.biome -eq 'desert') { $graphics.DrawLine([System.Drawing.Pens]::Tan,$tx+3,$ty+12,$tx+8,$ty+10); $graphics.DrawLine([System.Drawing.Pens]::Tan,$tx+8,$ty+10,$tx+13,$ty+12) }
  if ($tile.biome -eq 'tundra') { $graphics.FillEllipse([System.Drawing.Brushes]::WhiteSmoke,$tx+7,$ty+7,2,2) }
 }
 $riverPen=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#5c9ab3'),2)
 foreach ($riverPath in $world.geography.riverPaths) {
  for ($j=1; $j -lt $riverPath.Count; $j++) {
   $a=$world.cells[$riverPath[$j-1]]; $b=$world.cells[$riverPath[$j]]
   $graphics.DrawLine($riverPen,[single]($ox+$a.x*17+8),[single]($my+$a.y*17+8),[single]($ox+$b.x*17+8),[single]($my+$b.y*17+8))
  }
 }
 $riverPen.Dispose()
 foreach ($tile in $world.cells) { if ($tile.stage -gt 0) {
  $tx=[int]($ox+$tile.x*17);$ty=[int]($my+$tile.y*17)
  $graphics.FillRectangle([System.Drawing.Brushes]::OldLace,$tx+5,$ty+8,7,6)
  $points=[System.Drawing.PointF[]]@([System.Drawing.PointF]::new($tx+4,$ty+8),[System.Drawing.PointF]::new($tx+8,$ty+4),[System.Drawing.PointF]::new($tx+13,$ty+8))
  $graphics.FillPolygon([System.Drawing.Brushes]::Sienna,$points)
 }}
 $sea=($world.cells | Where-Object terrain -eq 'sea').Count
 $settlements=($world.cells | Where-Object stage -gt 0).Count
 $description="海 $([math]::Round($sea/256*100))% / 水系 $($world.geography.riverPaths.Count)本 / 集落 $settlements"
 $graphics.DrawString($description,$small,$muted,[single]$ox,[single]($my+282))
}
$graphics.DrawString('診断用の地形アトラス。ゲーム内はPhaser Graphicsで描画し、画像ファイルを使用しません。',$small,$muted,30,825)
$bitmap.Save((Join-Path (Get-Location) 'workdesk/seed-atlas.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose();$bitmap.Dispose();$font.Dispose();$small.Dispose();$title.Dispose();$ink.Dispose();$muted.Dispose()
