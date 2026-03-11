# NTUTBox Template API

提供台灣各大學課程節次模板的公開 API，供 [NTUTBox](https://apps.apple.com/app/ntutbox/id6742044903) App 使用。

## API

Base URL: `https://api.ntutbox.com`

### 取得所有學校模板

```
GET /schedule/templates
```

```json
{
  "templates": [
    {
      "id": "ntust",
      "school": "國立臺灣科技大學",
      "name": "臺科大 14 節制",
      "periodCount": 14
    }
  ]
}
```

### 取得單一學校節次定義

```
GET /schedule/templates/:id
```

```json
{
  "id": "ntust",
  "school": "國立臺灣科技大學",
  "name": "臺科大 14 節制",
  "periods": [
    { "id": "1", "startTime": "08:10", "endTime": "09:00" },
    { "id": "2", "startTime": "09:10", "endTime": "10:00" }
  ]
}
```

## 目前支援的學校

| ID | 學校 |
|----|------|
| `ntust` | 國立臺灣科技大學 |
| `ntu` | 國立臺灣大學 |
| `ntnu` | 國立臺灣師範大學 |

> 國立臺北科技大學（NTUT）的節次定義已內建於 App 中，不在此 API 提供。

## 貢獻你的學校模板

歡迎透過 Pull Request 新增學校！步驟：

1. **Fork** 這個 repo
2. 在 `data/templates/` 新增 `{school-id}.json`，格式如下：

```json
{
  "id": "your-school-id",
  "school": "學校全名",
  "name": "顯示名稱（例：○○大學 14 節制）",
  "periods": [
    { "id": "1", "startTime": "08:10", "endTime": "09:00" },
    { "id": "2", "startTime": "09:10", "endTime": "10:00" }
  ]
}
```

3. 在 `data/templates/index.json` 加入對應的摘要項目
4. 開 PR，附上學校官方節次表的來源連結

### 注意事項

- `id` 使用學校英文縮寫小寫（例：`ntu`、`ntust`）
- `periods` 陣列順序即為顯示順序
- 時間格式為 24 小時制 `HH:mm`
- 節次代號請依照學校官方定義（例：`1`-`10`、`A`-`D`）

## 技術架構

- **Runtime:** Cloudflare Workers
- **Storage:** Cloudflare KV
- **CI/CD:** GitHub Actions — PR 自動測試，merge 到 main 自動部署

## 本地開發

```bash
npm install
npm test          # 跑測試
npm run dev       # 啟動本地開發伺服器
npm run seed -- --preview   # 寫入測試資料到本地 KV
```

## License

MIT
