import type { LinkSchema } from '@@/schemas/link'
import type { z } from 'zod'
import { parsePath, withQuery } from 'ufo'

export default eventHandler(async (event) => {
  const { pathname: slug } = parsePath(event.path.replace(/^\/|\/$/g, '')) // remove leading and trailing slashes
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
      
      // Check if the link has expired and has an expiry redirect URL
      const currentTime = Math.floor(Date.now() / 1000)
      if (link.expiration && currentTime > link.expiration && link.expiryRedirectUrl) {
        // If link has expired and has an expiry redirect URL, use that instead
        const expiryTarget = redirectWithQuery ? withQuery(link.expiryRedirectUrl, getQuery(event)) : link.expiryRedirectUrl
        return sendRedirect(event, expiryTarget, +useRuntimeConfig(event).redirectStatusCode)
      }
      
      const query = getQuery(event)
      const urltoken = query.urltoken as string | undefined
      if (urltoken) {
        try {
          // Decode base64 to get the date string
          const decodedDate = atob(urltoken)
          
          // Parse the date (yyyy-mm-dd format)
          const tokenDate = new Date(decodedDate)
          const currentDate = new Date()
          
          // Reset time portion to compare just the dates
          currentDate.setHours(0, 0, 0, 0)
          tokenDate.setHours(0, 0, 0, 0)
          
          // If current date is after token date, URL is invalid
          if (currentDate > tokenDate) {
            // If there's an expiry redirect URL, use that
            if (link.expiryRedirectUrl) {
              const expiryTarget = redirectWithQuery ? withQuery(link.expiryRedirectUrl, getQuery(event)) : link.expiryRedirectUrl
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
          console.error('Failed to process urltoken:', error)
          // Optional: Return error for invalid token format
            return createError({
              statusCode: 410,
              statusMessage: 'Invalid Link',
              message: 'Invalid urltoken.'
            })
        }
      }
      const target = redirectWithQuery ? withQuery(link.url, getQuery(event)) : link.url
      return sendRedirect(event, target, +useRuntimeConfig(event).redirectStatusCode)
    }
  }
})
