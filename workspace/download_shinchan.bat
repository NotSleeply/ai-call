@echo off
chcp 65001 >nul
echo 正在下载蜡笔小新图片到桌面...
echo.

:: 使用PowerShell下载图片
powershell -Command "Invoke-WebRequest -Uri 'https://i.imgur.com/8X9ZQYh.jpg' -OutFile '%USERPROFILE%\Desktop\蜡笔小新.jpg' -UseBasicParsing"

if exist "%USERPROFILE%\Desktop\蜡笔小新.jpg" (
    echo 下载成功！图片已保存到桌面：蜡笔小新.jpg
) else (
    echo 下载失败，尝试备用链接...
    powershell -Command "Invoke-WebRequest -Uri 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' -OutFile '%USERPROFILE%\Desktop\蜡笔小新.jpg' -UseBasicParsing"
)

echo.
echo 按任意键退出...
pause >nul
