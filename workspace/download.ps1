Remove-Item 'C:\Users\Administrator\Desktop\crayon_shinchan.jpg' -ErrorAction SilentlyContinue

$urls = @(
    'https://微博图片API',
    'https://gss0.bdstatic.com/94o3dSag_xI4khGk9WK1HFllhTvw/space/wapimage?itemId=340860441'
)

# 用更简单的方式尝试
try {
    Write-Host "Trying anime-pictures..."
    $r = Invoke-WebRequest -Uri 'https://anime-pictures.net/images/2014/05/06/33355/preview_66688_0.jpeg' -TimeoutSec 15 -UseBasicParsing
    if ($r.StatusCode -eq 200 -and $r.Content.Length -gt 3000) {
        [System.IO.File]::WriteAllBytes('C:\Users\Administrator\Desktop\crayon_shinchan.jpg', $r.Content)
        Write-Host "OK! Size: $($r.Content.Length)"
        exit
    }
} catch {
    Write-Host "anime-pictures failed"
}

try {
    Write-Host "Trying via proxy..."
    $r = Invoke-WebRequest -Uri 'https://images.alphacoders.com/115/1158722.png' -TimeoutSec 15 -UseBasicParsing
    if ($r.StatusCode -eq 200 -and $r.Content.Length -gt 3000) {
        [System.IO.File]::WriteAllBytes('C:\Users\Administrator\Desktop\crayon_shinchan.png', $r.Content)
        Write-Host "OK! Size: $($r.Content.Length)"
        exit
    }
} catch {
    Write-Host "alphacoders failed"
}

Write-Host "All sources failed"
