// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from './index'

describe('encryption', () => {
  const secret = 'a'.repeat(64) // 32 bytes hex

  it('encrypts and decrypts a string', async () => {
    const plaintext = 'sk-test-api-key-12345'
    const ciphertext = await encrypt(plaintext, secret)
    expect(ciphertext).not.toBe(plaintext)
    const result = await decrypt(ciphertext, secret)
    expect(result).toBe(plaintext)
  })

  it('produces different ciphertext each time (random IV)', async () => {
    const plaintext = 'same-input'
    const c1 = await encrypt(plaintext, secret)
    const c2 = await encrypt(plaintext, secret)
    expect(c1).not.toBe(c2)
  })

  it('throws on tampered ciphertext', async () => {
    const ciphertext = await encrypt('hello', secret)
    const tampered = ciphertext.slice(0, -4) + 'xxxx'
    await expect(decrypt(tampered, secret)).rejects.toThrow()
  })
})
