$desktop = [Environment]::GetFolderPath('Desktop')
$savePath = Join-Path $desktop 'crayon_shinchan.jpg'

# 尝试多个免费图片源
$urls = @(
    'https://pixabay.com/img/down/samples/animal-woodpecker-twitter.jpg',
    'https://cdn.pixabay.com/photo/2012/04/13/21/07/shin-chan-35555_1280.png',
    'https://images.pexels.com/photos/1402859/pexels-photo-1402859.jpeg'
)

$success = $false
foreach ($url in $urls) {
    try {
        Write-Host "Trying: $url"
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 20 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            [System.IO.File]::WriteAllBytes($savePath, $response.Content)
            Write-Host "SUCCESS: $savePath"
            $success = $true
            break
        }
    } catch {
        Write-Host "Failed: $($_.Exception.Message)"
    }
}

if (-not $success) {
    Write-Host "All sources failed"
}
