# Monetizable 社交平台上传素材

直接上传 PNG 文件；SVG 为可编辑源文件。沿用网站的蓝紫色牛角手柄 logo，头像已预留圆形裁切空间。没有修改网站或发布到社交账号。

| 用途 | 文件 | 像素尺寸 |
|---|---|---|
| X 头像 | x-avatar-400x400.png | 400 × 400 |
| X 横幅 | x-banner-1500x500.png | 1500 × 500 |
| Instagram 头像（建议上传此高清版） | instagram-avatar-1080x1080.png | 1080 × 1080 |
| Instagram 头像小尺寸备选 | instagram-avatar-320x320.png | 320 × 320 |
| Instagram 品牌封面帖子 | instagram-brand-cover-1080x1080.png | 1080 × 1080 |
| Instagram Story | instagram-story-1080x1920.png | 1080 × 1920 |
| LinkedIn 头像 / 公司 logo | linkedin-avatar-400x400.png | 400 × 400 |
| LinkedIn 个人主页横幅 | linkedin-personal-banner-1584x396.png | 1584 × 396 |
| LinkedIn 公司主页横幅 | linkedin-company-banner-1512x256.png | 1512 × 256 |
| LinkedIn 公司主页高清横幅备选 | linkedin-company-banner-hires-4200x700.png | 4200 × 700 |
| 透明 logo | logo-transparent-1024x1024.png | 1024 × 1024 |
| 头像母版 | avatar-master-1024x1024.png | 1024 × 1024 |

Instagram 没有独立的主页 banner 上传位置。品牌封面可以用作置顶帖子；Story 可以用于品牌介绍。
横幅左侧留出空间避免头像遮挡。上传时选择完整图片，先检查平台实际裁切预览；不同设备会裁切不同范围。
所有 PNG 均小于 3 MB。PREVIEW.png 为总览，不能替代各平台上传文件。

## 尺寸资料（2026-10-11 查阅）

- X 官方：https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo
- LinkedIn 个人主页：https://www.linkedin.com/help/linkedin/answer/a568217/?lang=en-US
- LinkedIn 公司主页：https://www.linkedin.com/help/linkedin/answer/a570368
- LinkedIn 官方不同语言页面的公司封面规格目前存在差异；西班牙语页面列出 1512 × 256，英语页面列出 4200 × 700，所以两种均提供：https://www.linkedin.com/help/linkedin/answer/a564330/especificaciones-de-imagen-para-tus-paginas-de-linkedin-y-de-empleo?lang=es
- Instagram 1080 方形头像是本素材包的高清导出尺寸，不代表官方强制尺寸。

## 源文件

logo-original.svg 为现有品牌原始图标；其余 SVG 是对应上传素材的可编辑版本。
build-kit.cjs 保存了导出脚本。在项目根目录运行 `node public/brand/social-kit/build-kit.cjs` 可重新生成素材（使用项目安装的 sharp）。
