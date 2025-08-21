export default defineAppConfig({
  title: 'Elbrit URL Shortener',
  email: 'info@elbrit.org',
  github: 'https://github.com/ccbikai/sink',
  description: 'Professional URL shortening service for Elbrit Life Sciences.',
  image: 'https://sink.cool/banner.png',
  previewTTL: 300, // 5 minutes
  slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  reserveSlug: [
    'dashboard',
  ],
})
