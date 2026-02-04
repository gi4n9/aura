# 🚀 Hướng dẫn Deploy Edge Function cho Chat

## Tổng quan

Edge Function giúp giảm latency gửi tin nhắn từ **200-500ms** xuống còn **20-50ms** bằng cách chạy code ở server gần người dùng nhất (Singapore).

## Cấu trúc file

```
supabase/
├── config.toml           # Cấu hình Supabase CLI
└── functions/
    └── send-message/
        └── index.ts      # Edge Function code (Deno runtime)
```

## Bước 1: Cài đặt Supabase CLI

```powershell
# Cài via npm (recommended)
npm install -g supabase

# Hoặc via Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## Bước 2: Đăng nhập Supabase

```powershell
supabase login
```

Mở link trong browser và authorize.

## Bước 3: Link project

```powershell
cd c:\CODE\Phenikaa\AuraStreaming\aura

# Link đến project của bạn
supabase link --project-ref jeauhbdwsdwovrdovrre
```

## Bước 4: Deploy Edge Function

```powershell
supabase functions deploy send-message
```

## Bước 5: Kiểm tra deployment

```powershell
# List all functions
supabase functions list

# Xem logs
supabase functions logs send-message
```

## Test Edge Function

### Test bằng curl:

```powershell
curl -X POST "https://jeauhbdwsdwovrdovrre.supabase.co/functions/v1/send-message" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_ANON_KEY" `
  -d '{"conversationId":"xxx","content":"Hello","senderId":"user-id"}'
```

### Test trong browser console:

```javascript
fetch('https://jeauhbdwsdwovrdovrre.supabase.co/functions/v1/send-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'your-conv-id',
    content: 'Test message',
    senderId: 'your-user-id'
  })
}).then(r => r.json()).then(console.log)
```

## Cấu hình Environment Variables

Edge Function tự động có access đến:
- `SUPABASE_URL` - URL của project
- `SUPABASE_ANON_KEY` - Anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin access)

## Xử lý lỗi thường gặp

### Lỗi CORS

Đảm bảo Edge Function trả về `Access-Control-Allow-Origin` header.

### Lỗi 401 Unauthorized

Edge Function yêu cầu JWT verification. Gửi access token trong header:
```
Authorization: Bearer <access_token>
```

### Lỗi 403 Forbidden

User không phải participant của conversation. Kiểm tra bảng `ConversationParticipant`.

## Fallback Strategy

Code hiện tại đã có fallback:
1. Thử Edge Function trước (nhanh)
2. Nếu fail → Dùng Server Action (chậm hơn nhưng ổn định)

## Monitoring

Xem performance trong Supabase Dashboard:
1. Vào https://supabase.com/dashboard
2. Chọn project
3. Vào Edge Functions → Logs

## Chi phí

- **Free tier**: 500,000 invocations/tháng
- **Pro tier**: 2,000,000 invocations/tháng + $2/million sau đó
