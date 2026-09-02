# 图钉标注系统后端接口契约

> 本文为「党建数字化平台」跨页面图钉标注功能的后端接口契约，便于后续接入 NestJS + Prisma 实现服务端持久化与多人协作。

---

## 1. 数据模型（Prisma 建议）

```prisma
model Annotation {
  id        String   @id @default(uuid())
  pageUrl   String   @map("page_url")
  posX      Float    @map("pos_x")
  posY      Float    @map("pos_y")
  content   String?  // 首条评论内容
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  replies AnnotationReply[]

  @@index([pageUrl])
  @@map("annotations")
}

model AnnotationReply {
  id          String   @id @default(uuid())
  annotationId String  @map("annotation_id")
  content     String
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")

  annotation Annotation @relation(fields: [annotationId], references: [id], onDelete: Cascade)

  @@map("annotation_replies")
}
```

---

## 2. REST API

### 2.1 获取页面标注列表

```http
GET /api/annotations?pageUrl={pageUrl}
Authorization: Bearer <token>
```

**响应：**

```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "pageUrl": "/dashboard.html",
      "posX": 0.45,
      "posY": 0.32,
      "content": "这里的数据口径需要确认",
      "createdBy": "张建国",
      "createdAt": "2024-01-31T14:30:00.000Z",
      "replies": [
        {
          "id": "uuid",
          "content": "已确认，按最新口径统计",
          "createdBy": "李明华",
          "createdAt": "2024-01-31T15:00:00.000Z"
        }
      ]
    }
  ]
}
```

### 2.2 创建标注

```http
POST /api/annotations
Authorization: Bearer <token>
Content-Type: application/json

{
  "pageUrl": "/dashboard.html",
  "posX": 0.45,
  "posY": 0.32,
  "content": "这里的数据口径需要确认"
}
```

### 2.3 添加回复

```http
POST /api/annotations/:id/replies
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "已确认，按最新口径统计"
}
```

### 2.4 删除标注

```http
DELETE /api/annotations/:id
Authorization: Bearer <token>
```

### 2.5 删除回复

```http
DELETE /api/annotations/:id/replies/:replyId
Authorization: Bearer <token>
```

---

## 3. WebSocket 实时协作（可选）

用于多端同步标注变化，推荐 Socket.IO 或原生 WebSocket。

### 事件定义

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `annotation:join` | C→S | 加入页面房间，如 `{ pageUrl: '/dashboard.html' }` |
| `annotation:create` | S→C | 新标注广播 |
| `annotation:reply` | S→C | 新回复广播 |
| `annotation:delete` | S→C | 标注/回复删除广播 |

### 广播示例

```json
{
  "type": "annotation:create",
  "payload": {
    "id": "uuid",
    "pageUrl": "/dashboard.html",
    "posX": 0.45,
    "posY": 0.32,
    "content": "这里的数据口径需要确认",
    "createdBy": "张建国",
    "createdAt": "2024-01-31T14:30:00.000Z",
    "replies": []
  }
}
```

---

## 4. 前端集成说明

当前前端实现位于 `common.js` 的 `initAnnotations()` 中，本地使用 `localStorage` 存储。接入后端时，替换以下函数即可：

- `getPageAnnotations()` → `GET /api/annotations?pageUrl=...`
- `savePageAnnotations()` → 不再整体保存，改为调用创建/回复/删除接口
- 新增标注后 POST `/api/annotations`
- 新增回复后 POST `/api/annotations/:id/replies`

建议保留 `currentUser` 从登录态获取，替换硬编码的 `'当前用户'`。

---

## 5. 权限建议

- 查看：所有登录用户可见本页面标注
- 创建/回复：普通用户可创建和回复
- 删除：仅标注创建者或管理员可删除
- 审计：重要操作可记录操作日志
