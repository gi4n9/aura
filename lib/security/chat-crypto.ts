import crypto from "crypto";

// Secret key derivation (256 bits)
const SECRET = process.env.CHAT_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "aura-default-encryption-salt-key-2026";
const KEY = crypto.createHash("sha256").update(SECRET).digest(); // 32 bytes

const PREFIX = "enc:v1:";

/**
 * Encrypts plain text message content using AES-256-GCM
 * Output format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptMessage(plainText: string): string {
    if (!plainText) return plainText;
    
    // Do not re-encrypt if already encrypted
    if (plainText.startsWith(PREFIX)) {
        return plainText;
    }

    try {
        const iv = crypto.randomBytes(12); // 12 bytes IV for AES-GCM
        const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
        
        let encrypted = cipher.update(plainText, "utf8", "hex");
        encrypted += cipher.final("hex");
        
        const authTag = cipher.getAuthTag().toString("hex"); // 16 bytes tag
        
        return `${PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error("[chat-crypto] Encryption error:", error);
        return plainText; // Fallback to plain text on error
    }
}

/**
 * Decrypts chat message content encrypted with AES-256-GCM.
 * Seamlessly returns original plain text if the message is unencrypted (legacy data).
 */
export function decryptMessage(content: string): string {
    if (!content || typeof content !== "string" || !content.startsWith(PREFIX)) {
        return content;
    }

    try {
        const parts = content.slice(PREFIX.length).split(":");
        if (parts.length !== 3) {
            return content;
        }

        const [ivHex, authTagHex, encryptedHex] = parts;
        if (!ivHex || !authTagHex || !encryptedHex) {
            return content;
        }

        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");

        const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (error: any) {
        // Safe fallback if key changed or authentication tag failed
        console.warn("[chat-crypto] Decryption authentication key mismatch:", error?.message || error);
        return "[Tin nhắn mã hóa bảo mật]";
    }
}
