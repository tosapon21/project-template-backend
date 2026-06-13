# BP Portal New System Registration Guide

เอกสารนี้สรุปขั้นตอนเมื่อต้องการนำระบบใหม่มาเชื่อมกับ BP Portal SSO

## ภาพรวม

ระบบใหม่จะเชื่อมกับ BP Portal ได้ 2 รูปแบบ:

1. Active SSO
   ผู้ใช้ login ที่ BP Portal แล้วกดเข้าใช้งานระบบใหม่จาก BP Portal

2. Login by BP Portal
   ผู้ใช้เปิดระบบใหม่โดยตรง แล้วกดปุ่ม `Login by BP Portal`

ทั้งสอง flow จะใช้ callback endpoint เดียวกันของระบบใหม่:

```text
https://your-system.example.com/sso/callback
```

สำหรับ local dev ของ template นี้:

```text
http://localhost:8085/sso/callback
```

## 1. ลงทะเบียนระบบใน BP Portal

ให้ผู้ดูแล BP Portal เพิ่มระบบใหม่ใน System Registry และกำหนดค่า:

- System name
- System URL หรือ launch URL
- Redirect URI
- Scopes ที่ระบบต้องใช้
- สถานะ active/enabled

Redirect URI ที่ต้อง register:

```text
http://localhost:8085/sso/callback
```

Production ตัวอย่าง:

```text
https://your-system.example.com/sso/callback
```

BP Portal จะออก credentials ให้:

```text
BP_PORTAL_CLIENT_ID=<client id>
BP_PORTAL_CLIENT_SECRET=<client secret>
```

ข้อสำคัญ:

- เก็บ `client_secret` เฉพาะ backend เท่านั้น
- ห้ามใส่ `client_secret` ใน frontend environment
- ห้าม commit `.env`

## 2. ตั้งค่า Backend ของระบบใหม่

เพิ่มค่าใน backend `.env`:

```text
FRONTEND_URL=http://localhost:4202
BP_PORTAL_BASE_URL=http://localhost:8080
BP_PORTAL_CLIENT_ID=<client id from BP Portal>
BP_PORTAL_CLIENT_SECRET=<client secret from BP Portal>
BP_PORTAL_SSO_CALLBACK_PATH=/sso/callback
BP_PORTAL_SSO_SUCCESS_REDIRECT=/home
BP_PORTAL_SSO_FAILURE_REDIRECT=/login?sso_error=1
BP_PORTAL_SSO_DEBUG=false
```

Production ให้เปลี่ยน URL ตาม domain จริง:

```text
FRONTEND_URL=https://your-system.example.com
BP_PORTAL_BASE_URL=https://bp-portal.example.com
```

## 3. ตั้งค่า Frontend ของระบบใหม่

เพิ่มค่าใน frontend environment:

```ts
backendGraphqlURL: 'http://localhost:8085/graphql',
userImageURL: 'http://localhost:8085/user_image',
bpPortalFrontendURL: 'http://localhost:4200',
bpPortalClientId: '<client id from BP Portal>'
```

Production ตัวอย่าง:

```ts
backendGraphqlURL: 'https://your-system-api.example.com/graphql',
userImageURL: 'https://your-system-api.example.com/user_image',
bpPortalFrontendURL: 'https://bp-portal.example.com',
bpPortalClientId: '<client id from BP Portal>'
```

หมายเหตุ:

- `bpPortalClientId` อยู่ frontend ได้
- `BP_PORTAL_CLIENT_SECRET` ห้ามอยู่ frontend

## 4. เตรียมฐานข้อมูลผู้ใช้

ระบบใหม่ควรมี field สำหรับผูกผู้ใช้ BP Portal กับ local user:

```text
bp_portal_user_id
```

คำแนะนำ:

- nullable เพื่อรองรับ user เดิม
- unique index เพื่อป้องกัน BP user เดียวผูกหลาย account
- ใช้ `email` เป็น fallback สำหรับ first-time linking

ตัวอย่าง logic:

1. หา user จาก `bp_portal_user_id`
2. ถ้าไม่พบ และ BP Portal ส่ง `email` มา ให้หา user จาก email
3. ถ้าพบจาก email ให้บันทึก `bp_portal_user_id`
4. ถ้าไม่พบ ให้สร้าง local user ใหม่จาก payload ของ BP Portal
5. ถ้า user ถูก disable ให้ reject login

## 5. Implement Callback Endpoint

ระบบใหม่ต้องมี backend route:

```http
GET /sso/callback?code=<code>&bp_sso_flow=<active|oauth>
```

ห้ามเชื่อข้อมูล user จาก query string โดยตรง

Backend ต้องเอา `code` ไป exchange กับ BP Portal แบบ server-side เท่านั้น

### Active SSO Flow

BP Portal redirect ผู้ใช้มายังระบบใหม่:

```text
http://localhost:8085/sso/callback?code=<code>&bp_sso_flow=active
```

Backend ของระบบใหม่ต้องเรียก:

```http
POST http://localhost:8080/api/v1/sso/exchange-code
Content-Type: application/json
```

Body:

```json
{
  "client_id": "<client id>",
  "client_secret": "<client secret>",
  "code": "<code>"
}
```

### Login by BP Portal Flow

ปุ่ม login ในระบบใหม่ redirect ไป BP Portal:

```text
http://localhost:4200/oauth/login?client_id=<client_id>&redirect_uri=http%3A%2F%2Flocalhost%3A8085%2Fsso%2Fcallback&state=<state>
```

ข้อสำคัญ:

- `redirect_uri` ต้องเป็น URL ที่ register ไว้แบบ exact
- ไม่ต้องใส่ `bp_sso_flow=oauth` ใน `redirect_uri`
- BP Portal จะ append `bp_sso_flow=oauth` ตอน callback กลับมาเอง

BP Portal redirect กลับ:

```text
http://localhost:8085/sso/callback?code=<code>&bp_sso_flow=oauth&state=<state>
```

Backend ของระบบใหม่ต้องเรียก:

```http
POST http://localhost:8080/oauth/exchange
```

แล้วนำ `access_token` ที่ได้ไป verify:

```http
POST http://localhost:8080/api/v1/verify-token
```

## 6. สร้าง Session ของระบบใหม่

หลังจาก exchange สำเร็จ ระบบใหม่ต้อง:

1. map หรือ create local user
2. สร้าง session/JWT/token ของระบบตัวเอง
3. redirect ผู้ใช้เข้า application

ห้าม reuse session ของ BP Portal โดยตรง

## 7. Error Handling

ถ้า exchange fail:

- ห้ามสร้าง local session
- redirect ไปหน้า login พร้อม error ที่ปลอดภัย

ตัวอย่าง:

```text
/login?sso_error=invalid_code
/login?sso_error=code_expired
/login?sso_error=invalid_client
/login?sso_error=account_disabled
/login?sso_error=wrong_flow
```

ถ้าต้อง debug ชั่วคราว ให้เปิด:

```text
BP_PORTAL_SSO_DEBUG=true
```

ควร log ได้เฉพาะ:

- endpoint ที่เรียก
- flow ที่ใช้
- callback URL
- HTTP status
- response body จาก BP Portal
- มี `client_id`, `client_secret`, `code` หรือไม่

ห้าม log ค่า `client_secret`

## 8. Test Cases

ทดสอบอย่างน้อย:

1. Missing code

```text
GET /sso/callback
```

Expected: ไม่สร้าง session และ redirect ไป failure page

2. Active SSO success

Login ที่ BP Portal แล้ว launch ระบบใหม่

Expected: BP Portal redirect มา `/sso/callback?code=...&bp_sso_flow=active` และ login สำเร็จ

3. Login button success

เปิดระบบใหม่แล้วกด `Login by BP Portal`

Expected: ไป BP Portal login แล้ว callback กลับมาพร้อม `bp_sso_flow=oauth`

4. Reused code

เรียก callback URL เดิมซ้ำ

Expected: BP Portal ตอบ `INVALID_CODE` หรือ equivalent และระบบใหม่ไม่สร้าง session ใหม่

5. Expired code

รอ code หมดอายุแล้วค่อย callback

Expected: `CODE_EXPIRED`

6. Invalid client secret

ตั้ง secret ผิดชั่วคราว

Expected: `INVALID_CLIENT`

7. Existing user linking

มี local user email เดียวกันแต่ยังไม่มี `bp_portal_user_id`

Expected: login ครั้งแรก link `bp_portal_user_id`, ครั้งถัดไปหา user จาก `bp_portal_user_id`

## Checklist

### BP Portal

- [ ] เพิ่มระบบใน System Registry แล้ว
- [ ] ตั้ง system/app เป็น active แล้ว
- [ ] Register redirect URI แล้ว: `http://localhost:8085/sso/callback`
- [ ] กำหนด launch URL สำหรับ Active SSO แล้ว
- [ ] กำหนด scopes ที่ต้องใช้แล้ว เช่น `profile`, `employee`, `org`
- [ ] ได้ `client_id` แล้ว
- [ ] ได้ `client_secret` แล้ว และส่งให้ backend owner แบบปลอดภัย
- [ ] Active SSO callback ส่ง `bp_sso_flow=active`
- [ ] OAuth callback ส่ง `bp_sso_flow=oauth`

### Backend

- [ ] ใส่ `BP_PORTAL_BASE_URL`
- [ ] ใส่ `BP_PORTAL_CLIENT_ID`
- [ ] ใส่ `BP_PORTAL_CLIENT_SECRET`
- [ ] ใส่ `FRONTEND_URL`
- [ ] `.env` อยู่ใน `.gitignore`
- [ ] มี route `GET /sso/callback`
- [ ] `active` เรียก `/api/v1/sso/exchange-code`
- [ ] `oauth` เรียก `/oauth/exchange` และ `/api/v1/verify-token`
- [ ] ไม่ log `client_secret`
- [ ] สร้าง local session/JWT ของระบบตัวเอง
- [ ] ไม่สร้าง session เมื่อ exchange fail
- [ ] Run migration เพิ่ม `bp_portal_user_id`

### Frontend

- [ ] ใส่ `bpPortalFrontendURL`
- [ ] ใส่ `bpPortalClientId`
- [ ] ปุ่ม `Login by BP Portal` redirect ไป `/oauth/login`
- [ ] `redirect_uri` ที่ส่งคือ callback URL ที่ register ไว้แบบ exact
- [ ] ไม่ใส่ `client_secret` ใน frontend
- [ ] มี route สำหรับ finalize session หลัง backend สร้าง token

### Verification

- [ ] Login by BP Portal จากระบบใหม่สำเร็จ
- [ ] Active SSO launch จาก BP Portal สำเร็จ
- [ ] Reused code fail อย่างปลอดภัย
- [ ] Expired code fail อย่างปลอดภัย
- [ ] Invalid client fail อย่างปลอดภัย
- [ ] Existing local user ถูก link ด้วย `bp_portal_user_id`
