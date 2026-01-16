/**
 * E2EE (End-to-End Encryption) Module for Private Chat
 * 
 * SECURITY OVERVIEW:
 * - Uses X25519 (ECDH) for key exchange
 * - Uses AES-256-GCM for message encryption
 * - Uses HKDF for key derivation
 * - Private keys stored in IndexedDB (never sent to server)
 * - All encryption happens client-side
 * 
 * LIMITATIONS:
 * - No forward secrecy (same key pair for all messages)
 * - No key verification UI (trust-on-first-use)
 * - Clearing browser storage loses access to encrypted messages
 */

// ============ CONSTANTS ============

const DB_NAME = 'e2ee_keys'
const DB_VERSION = 1
const STORE_NAME = 'keypair'
const KEY_ID = 'user_keypair'

// ============ TYPES ============

export interface E2EEKeyPair {
    publicKey: CryptoKey
    privateKey: CryptoKey
}

export interface ExportedKeyPair {
    publicKeyBase64: string
    privateKeyRaw: ArrayBuffer // Never export this to server
}

export interface EncryptedMessage {
    ciphertext: string  // Base64 encoded
    nonce: string       // Base64 encoded (12 bytes for GCM)
}

// ============ UTILITY FUNCTIONS ============

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer as ArrayBuffer
}

/**
 * Encode string to Uint8Array (UTF-8)
 */
function encodeText(text: string): Uint8Array {
    return new TextEncoder().encode(text)
}

/**
 * Decode Uint8Array to string (UTF-8)
 */
function decodeText(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes)
}

// ============ INDEXEDDB STORAGE ============

/**
 * Open the IndexedDB database for key storage
 */
function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(new Error('Failed to open IndexedDB'))

        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
    })
}

/**
 * Store the key pair in IndexedDB
 * Private key is stored as raw JWK, never leaves browser
 */
export async function storeKeyPair(keyPair: E2EEKeyPair): Promise<void> {
    const db = await openDatabase()

    // Export keys for storage
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey)
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)

        const data = {
            id: KEY_ID,
            publicKeyRaw: arrayBufferToBase64(publicKeyRaw),
            privateKeyJwk: privateKeyJwk,
            createdAt: new Date().toISOString()
        }

        const request = store.put(data)
        request.onerror = () => reject(new Error('Failed to store key pair'))
        request.onsuccess = () => resolve()

        transaction.oncomplete = () => db.close()
    })
}

/**
 * Load the key pair from IndexedDB
 * Returns null if no key pair exists
 */
export async function loadKeyPair(): Promise<E2EEKeyPair | null> {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(KEY_ID)

        request.onerror = () => reject(new Error('Failed to load key pair'))

        request.onsuccess = async () => {
            const data = request.result
            if (!data) {
                resolve(null)
                return
            }

            try {
                // Re-import the keys
                const publicKeyRaw = base64ToArrayBuffer(data.publicKeyRaw)
                const publicKey = await crypto.subtle.importKey(
                    'raw',
                    publicKeyRaw,
                    { name: 'X25519' },
                    true,
                    []
                )

                const privateKey = await crypto.subtle.importKey(
                    'jwk',
                    data.privateKeyJwk,
                    { name: 'X25519' },
                    true,
                    ['deriveBits']
                )

                resolve({ publicKey, privateKey })
            } catch (error) {
                console.error('Failed to import stored keys:', error)
                resolve(null)
            }
        }

        transaction.oncomplete = () => db.close()
    })
}

// ============ KEY GENERATION ============

/**
 * Generate a new X25519 key pair
 * The public key will be uploaded to the server
 * The private key stays in IndexedDB only
 */
export async function generateKeyPair(): Promise<E2EEKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
        { name: 'X25519' },
        true, // extractable
        ['deriveBits']
    ) as CryptoKeyPair

    return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
    }
}

/**
 * Export public key to Base64 string for server storage
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('raw', publicKey)
    return arrayBufferToBase64(raw)
}

/**
 * Import a public key from Base64 string (from server)
 */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
    const raw = base64ToArrayBuffer(base64)
    return crypto.subtle.importKey(
        'raw',
        raw,
        { name: 'X25519' },
        true,
        []
    )
}

// ============ KEY DERIVATION ============

/**
 * Derive a shared secret using ECDH (X25519)
 * This combines our private key with their public key
 */
async function deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
): Promise<ArrayBuffer> {
    return crypto.subtle.deriveBits(
        { name: 'X25519', public: publicKey },
        privateKey,
        256 // 32 bytes
    )
}

/**
 * Derive an AES-256 encryption key from the shared secret using HKDF
 */
async function deriveEncryptionKey(sharedSecret: ArrayBuffer): Promise<CryptoKey> {
    // Import the shared secret as HKDF key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'HKDF' },
        false,
        ['deriveKey']
    )
    // Salt and info as ArrayBuffer for proper typing
    const salt = new TextEncoder().encode('e2ee-chat-salt')
    const info = new TextEncoder().encode('e2ee-chat-key')

    // Derive AES-256-GCM key using HKDF
    return crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: salt.buffer as ArrayBuffer,
            info: info.buffer as ArrayBuffer
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )
}

/**
 * Get the AES encryption key for a conversation
 * Combines our private key with their public key
 */
export async function getConversationKey(
    ourPrivateKey: CryptoKey,
    theirPublicKey: CryptoKey
): Promise<CryptoKey> {
    const sharedSecret = await deriveSharedSecret(ourPrivateKey, theirPublicKey)
    return deriveEncryptionKey(sharedSecret)
}

// ============ ENCRYPTION / DECRYPTION ============

/**
 * Encrypt a message using AES-256-GCM
 * Returns base64-encoded ciphertext with nonce prepended
 */
export async function encryptMessage(
    aesKey: CryptoKey,
    plaintext: string
): Promise<string> {
    // Generate random 12-byte nonce (IV) for GCM
    const nonce = crypto.getRandomValues(new Uint8Array(12))

    // Encrypt the message
    const plaintextBytes = encodeText(plaintext)
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        aesKey,
        plaintextBytes.buffer as ArrayBuffer
    )

    // Combine nonce + ciphertext and encode as base64
    // Format: [12 bytes nonce][ciphertext]
    const combined = new Uint8Array(nonce.length + ciphertext.byteLength)
    combined.set(nonce, 0)
    combined.set(new Uint8Array(ciphertext), nonce.length)

    return arrayBufferToBase64(combined.buffer as ArrayBuffer)
}

/**
 * Decrypt a message using AES-256-GCM
 * Expects base64-encoded ciphertext with nonce prepended
 */
export async function decryptMessage(
    aesKey: CryptoKey,
    encryptedBase64: string
): Promise<string> {
    // Decode the combined nonce + ciphertext
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64))

    // Extract nonce (first 12 bytes) and ciphertext (rest)
    const nonce = combined.slice(0, 12)
    const ciphertext = combined.slice(12)

    // Decrypt the message
    const plaintextBytes = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: nonce },
        aesKey,
        ciphertext
    )

    return decodeText(new Uint8Array(plaintextBytes))
}

// ============ HIGH-LEVEL API ============

/**
 * Ensure a key pair exists, generating one if needed
 * Returns the public key as base64 for server upload
 */
export async function ensureKeyPair(): Promise<{ keyPair: E2EEKeyPair; publicKeyBase64: string; isNew: boolean }> {
    // Try to load existing key pair
    let keyPair = await loadKeyPair()
    let isNew = false

    if (!keyPair) {
        // Generate new key pair
        console.log('[E2EE] Generating new key pair...')
        keyPair = await generateKeyPair()
        await storeKeyPair(keyPair)
        isNew = true
        console.log('[E2EE] Key pair generated and stored')
    } else {
        console.log('[E2EE] Loaded existing key pair from IndexedDB')
    }

    const publicKeyBase64 = await exportPublicKey(keyPair.publicKey)

    return { keyPair, publicKeyBase64, isNew }
}

// Cache for derived conversation keys (avoid re-deriving)
const keyCache = new Map<string, CryptoKey>()

/**
 * Get or derive the encryption key for a conversation
 * Caches the key to avoid re-computation
 */
export async function getOrDeriveConversationKey(
    ourPrivateKey: CryptoKey,
    theirPublicKeyBase64: string
): Promise<CryptoKey> {
    // Check cache first
    if (keyCache.has(theirPublicKeyBase64)) {
        return keyCache.get(theirPublicKeyBase64)!
    }

    // Import their public key and derive shared key
    const theirPublicKey = await importPublicKey(theirPublicKeyBase64)
    const conversationKey = await getConversationKey(ourPrivateKey, theirPublicKey)

    // Cache for future use
    keyCache.set(theirPublicKeyBase64, conversationKey)

    return conversationKey
}

/**
 * Clear the key cache (call when user logs out)
 */
export function clearKeyCache(): void {
    keyCache.clear()
}
