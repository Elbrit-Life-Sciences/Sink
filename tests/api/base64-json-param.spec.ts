import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch } from '../utils'
import { decodeBase64Json } from '../../server/utils/base64-json'

describe('Base64 JSON URL Parameter', () => {
  const testSlug = 'test-base64-json'
  const testUrl = 'https://example.com'
  const testData = { foo: 'bar', test: 123, urltoken: 'dGVzdC10b2tlbg==' }
  const base64JsonData = btoa(JSON.stringify(testData))
  
  // Setup: Create a test link
  beforeAll(async () => {
    const response = await fetch('/api/link/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NUXT_SITE_TOKEN}`
      },
      body: JSON.stringify({
        slug: testSlug,
        url: testUrl
      })
    })
    expect(response.status).toBe(201)
  })
  
  // Cleanup: Delete the test link
  afterAll(async () => {
    const response = await fetch(`/api/link/${testSlug}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.NUXT_SITE_TOKEN}`
      }
    })
    expect(response.status).toBe(200)
  })
  
  it('should correctly decode base64 JSON data', () => {
    const decoded = decodeBase64Json(base64JsonData)
    expect(decoded).toEqual(testData)
  })
  
  it('should redirect with base64 JSON parameters', async () => {
    const response = await fetch(`/${testSlug}/${base64JsonData}`, {
      redirect: 'manual'
    })
    
    expect(response.status).toBe(302)
    const location = response.headers.get('location')
    expect(location).toContain(testUrl)
    expect(location).toContain('foo=bar')
    expect(location).toContain('test=123')
    expect(location).toContain('urltoken=dGVzdC10b2tlbg==')
  })
  
  it('should handle invalid base64 data gracefully', async () => {
    const invalidBase64 = 'invalid-base64-data'
    const response = await fetch(`/${testSlug}/${invalidBase64}`, {
      redirect: 'manual'
    })
    
    // Should still redirect to the target URL even with invalid base64
    expect(response.status).toBe(302)
    const location = response.headers.get('location')
    expect(location).toBe(testUrl)
  })
  
  it('should merge query parameters with base64 JSON data', async () => {
    const response = await fetch(`/${testSlug}/${base64JsonData}?additional=param`, {
      redirect: 'manual'
    })
    
    expect(response.status).toBe(302)
    const location = response.headers.get('location')
    expect(location).toContain('foo=bar')
    expect(location).toContain('test=123')
    expect(location).toContain('additional=param')
  })
  
  it('should prioritize base64 JSON data over query parameters', async () => {
    const response = await fetch(`/${testSlug}/${base64JsonData}?foo=queryvalue`, {
      redirect: 'manual'
    })
    
    expect(response.status).toBe(302)
    const location = response.headers.get('location')
    expect(location).toContain('foo=bar') // Should use the value from JSON data
    expect(location).not.toContain('foo=queryvalue')
  })
})
