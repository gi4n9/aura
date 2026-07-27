# Implementation Plan - Chat Message Encryption at Rest

We will implement **AES-256-GCM** encryption for chat message content stored in the database (`DirectMessage.content`). This ensures sensitive chat data is encrypted at rest in PostgreSQL, while remaining transparently accessible to authorized users and system functions.

## User Review Required

> [!IMPORTANT]
> - **Encryption Scheme**: Messages are encrypted using **AES-256-GCM** before being inserted into the database.
> - **Encryption Key**: Derived via SHA-256 from `process.env.CHAT_ENCRYPTION_KEY` (or fallback to `process.env.NEXTAUTH_SECRET` / `SUPABASE_SERVICE_ROLE_KEY`).
> - **Backward Compatibility**: Any existing unencrypted messages in the database (legacy or seed messages) will be recognized automatically (via prefix checking `enc:v1:...`) and read as plain text without breaking or corrupting data.

## Proposed Changes

### Core Security & Encryption Module

#### [NEW] [chat-crypto.ts](file:///f:/aura/aura/lib/security/chat-crypto.ts)
- Create AES-256-GCM helper module using Node.js `crypto`.
- Exports:
  - `encryptMessage(plainText: string): string` -> returns `enc:v1:<iv>:<tag>:<ciphertext>`
  - `decryptMessage(encryptedOrPlainText: string): string` -> checks `enc:v1:` prefix; if not encrypted, returns as-is; otherwise decrypts and returns plaintext.

---

### Supabase Edge Function

#### [MODIFY] [index.ts](file:///f:/aura/aura/supabase/functions/send-message/index.ts)
- Implement matching Web Crypto API (`crypto.subtle`) AES-256-GCM encryption in Deno.
- Encrypt message `content` before inserting into `DirectMessage` table.

---

### Server Actions & Chat APIs

#### [MODIFY] [chat.ts](file:///f:/aura/aura/app/actions/chat.ts)
- `sendMessage`: Encrypt message content before saving via Prisma, return decrypted message.
- `getConversations`: Decrypt `lastMessage.content` for each conversation.
- `getMessages`: Decrypt content for each returned `DirectMessage`.
- `getMessageById`: Decrypt message content.

#### [MODIFY] [group-summary/route.ts](file:///f:/aura/aura/app/api/chat/group-summary/route.ts)
- Decrypt `unreadMessages` content before passing into Groq AI summary prompt.

#### [MODIFY] [group-bot/route.ts](file:///f:/aura/aura/app/api/chat/group-bot/route.ts)
- Decrypt retrieved vector RAG message contents before building Groq prompt.
- Encrypt `@AuraBot` response content before saving to `db.directMessage.create`.

---

### Client Components (Realtime Decryption)

#### [MODIFY] [MessagesInterface.tsx](file:///f:/aura/aura/app/components/chat/MessagesInterface.tsx)
- On Supabase Realtime `INSERT` event, if `newMsg.content` is encrypted, use `getMessageById(newMsg.id)` to retrieve the server-decrypted message content.

#### [MODIFY] [InstructorMessagesInterface.tsx](file:///f:/aura/aura/app/components/chat/InstructorMessagesInterface.tsx)
- Handle Realtime `INSERT` event by fetching decrypted message via `getMessageById(newMsg.id)`.

---

## Verification Plan

### Automated Tests
- Run TypeScript type checker:
  ```bash
  npx tsc --noEmit
  ```
- Run a scratch verification script to test:
  1. Plain text encryption & decryption round-trip.
  2. Legacy unencrypted message fallback behavior.

### Manual Verification
- Test sending messages via UI and checking database value format (`enc:v1:...`).
- Verify messages load and render cleanly in group chat and direct messages.
