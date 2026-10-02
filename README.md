# UNO Party 手机联机版

部署后会得到一个公网 HTTPS 地址。把网址发给好友，好友用 iPhone/安卓手机浏览器点开即可玩，无需安装 App。

## Render 部署
1. 把项目上传到 GitHub。
2. 在 Render 创建 Web Service 并连接仓库。
3. Build Command：`npm install`
4. Start Command：`npm start`
5. 部署完成后，把生成的 `https://...onrender.com` 地址发给好友。

创建房间后点「🔗 邀请」，手机支持分享时会打开系统分享面板，否则复制邀请链接。
邀请链接会自动带房间号。

当前房间和战局保存在服务器内存中，服务器重启后房间会消失；永久战绩/账号系统需要数据库。
