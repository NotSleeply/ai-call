Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(800, 800)
$g = [System.Drawing.Graphics]::FromImage($bmp)

# 背景
$g.Clear([System.Drawing.Color]::FromArgb(26, 26, 46))

# 标题背景
$brush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22, 33, 62))
$g.FillRectangle($brush1, 50, 50, 700, 120)

# 标题
$font1 = New-Object System.Drawing.Font('Arial', 48, [System.Drawing.FontStyle]::Bold)
$brushRed = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(233, 69, 96))
$g.DrawString('ClawBoard', $font1, $brushRed, 70, 65)

# 副标题
$font2 = New-Object System.Drawing.Font('Arial', 26)
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.DrawString('AI 驱动的本地剪贴板管理器', $font2, $brushWhite, 70, 130)

# 分隔线
$g.FillRectangle($brushRed, 50, 200, 700, 3)

# 特性
$font3 = New-Object System.Drawing.Font('Arial', 22)
$g.DrawString([char]0x2713 + ' 全量记录 - 所有复制内容自动存档', $font3, $brushWhite, 50, 260)
$g.DrawString([char]0x2713 + ' 语义搜索 - 用自然语言快速查找', $font3, $brushWhite, 50, 320)
$g.DrawString([char]0x2713 + ' 永久收藏 - 重要内容标记不丢失', $font3, $brushWhite, 50, 380)
$g.DrawString([char]0x2713 + ' 本地 AI - 数据完全存储在本地', $font3, $brushWhite, 50, 440)

# 技术栈
$font4 = New-Object System.Drawing.Font('Arial', 26, [System.Drawing.FontStyle]::Bold)
$g.DrawString('技术栈: Electron + Ollama + SQLite', $font4, $brushRed, 50, 520)

# 开源地址
$brushGreen = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(78, 204, 163))
$font5 = New-Object System.Drawing.Font('Arial', 30, [System.Drawing.FontStyle]::Bold)
$g.DrawString('github.com/NotSleeply/ClawBoard', $font5, $brushGreen, 50, 600)

# 底部说明
$font6 = New-Object System.Drawing.Font('Arial', 18)
$brushGray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 160, 160))
$g.DrawString('OpenClaw 自主开发项目', $font6, $brushGray, 50, 680)
$g.DrawString('让每次复制都有迹可循', $font6, $brushGray, 50, 720)

$bmp.Save('C:\Users\Administrator\.qclaw\workspace\clawboard_cover.png')
$g.Dispose()
$bmp.Dispose()
Write-Output 'Image created'