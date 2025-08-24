import type { LinkSchema } from '@@/schemas/link'
import type { z } from 'zod'
import { parsePath, withQuery } from 'ufo'
import { decodeBase64Json, mergeParams } from '../utils/base64-json'

export default eventHandler(async (event) => {
  // Remove leading and trailing slashes
  const cleanPath = event.path.replace(/^\/|\/$/g, '')
  
  // Split path to extract slug and optional base64 JSON data
  // Handle case where path might contain query parameters
  const pathParts = cleanPath.split('/')
  
  // Extract the slug, ensuring we don't include query parameters
  let slug = pathParts[0]
  // Remove any query parameters from slug if present
  if (slug && slug.includes('?')) {
    slug = slug.split('?')[0]
  }
  
  // Handle base64JsonData which might also contain query parameters
  let base64JsonData = null
  if (pathParts.length > 1) {
    base64JsonData = pathParts[1]
    // Remove any query parameters from base64JsonData if present
    if (base64JsonData && base64JsonData.includes('?')) {
      base64JsonData = base64JsonData.split('?')[0]
    }
  }
  
  const { slugRegex, reserveSlug } = useAppConfig(event)
  const { homeURL, linkCacheTtl, redirectWithQuery, caseSensitive } = useRuntimeConfig(event)
  const { cloudflare } = event.context

  if (event.path === '/' && homeURL)
    return sendRedirect(event, homeURL)

  if (slug && !reserveSlug.includes(slug) && slugRegex.test(slug) && cloudflare) {
    const { KV } = cloudflare.env

    let link: z.infer<typeof LinkSchema> | null = null

    const getLink = async (key: string) =>
      await KV.get(`link:${key}`, { type: 'json', cacheTtl: linkCacheTtl })

    const lowerCaseSlug = slug.toLowerCase()
    link = await getLink(caseSensitive ? slug : lowerCaseSlug)

    // fallback to original slug if caseSensitive is false and the slug is not found
    if (!caseSensitive && !link && lowerCaseSlug !== slug) {
      console.log('original slug fallback:', `slug:${slug} lowerCaseSlug:${lowerCaseSlug}`)
      link = await getLink(slug)
    }

    if (link) {
      event.context.link = link
      try {
        await useAccessLog(event)
      }
      catch (error) {
        console.error('Failed write access log:', error)
      }
      
      // Decode base64 JSON data if present
      let jsonData = null
      if (base64JsonData) {
        jsonData = decodeBase64Json(base64JsonData)
      }
      
      // Get query parameters
      const query = getQuery(event)
      
      // Merge JSON data with query parameters (JSON data takes precedence)
      // Exclude ex_date from parameters passed to redirect URL
      const mergedParams = mergeParams(jsonData, query, ['ex_date'])
      
      // Get ex_date from original parameters (before exclusion)
      const originalParams = mergeParams(jsonData, query)
      const expiryDate = originalParams.ex_date as string | undefined
      if (expiryDate) {
        try {
          // Parse the date (yyyy-mm-ddTHH:mm format)
          const tokenDate = new Date(expiryDate)
          const currentDate = new Date()
          
          // Reset time portion to compare just the dates
          // currentDate.setHours(0, 0, 0, 0)
          // tokenDate.setHours(0, 0, 0, 0)
          
          // If current date is after token date, URL is invalid
          if (currentDate > tokenDate) {
            // If there's an expiry redirect URL, use that
            if (link.expiryRedirectUrl) {
              const expiryTarget = redirectWithQuery ? withQuery(link.expiryRedirectUrl, mergedParams) : link.expiryRedirectUrl
              return sendRedirect(event, expiryTarget, +useRuntimeConfig(event).redirectStatusCode)
            }
            // Otherwise return an error
            return createError({
              statusCode: 410,
              statusMessage: 'Link Expired',
              message: 'This link has expired.'
            })
          }
        }
        catch (error) {
          console.error('Failed to process expiryDate:', error)
          // Optional: Return error for invalid token format
            return createError({
              statusCode: 410,
              statusMessage: 'Invalid Link',
              message: 'Invalid Token.'
            })
        }
      }
      const target = redirectWithQuery ? withQuery(link.url, mergedParams) : link.url
      return sendRedirect(event, target, +useRuntimeConfig(event).redirectStatusCode)
    }
  }
})
