/**
 * Utility functions for handling base64 encoded JSON data
 */

/**
 * Decodes a base64 string to JSON object
 * @param base64String The base64 encoded string
 * @returns Parsed JSON object or null if invalid
 */
export function decodeBase64Json(base64String: string): Record<string, any> | null {
  try {
    // Decode base64 to string
    const jsonString = atob(base64String)
    // Parse JSON string to object
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Failed to decode base64 JSON:', error)
    return null
  }
}

/**
 * Merges JSON data with query parameters
 * JSON data takes precedence over query parameters
 * @param jsonData The JSON data object
 * @param queryParams The query parameters object
 * @param excludeParams Array of parameter names to exclude from the result
 * @returns Merged parameters object
 */
export function mergeParams(
  jsonData: Record<string, any> | null,
  queryParams: Record<string, any>,
  excludeParams: string[] = []
): Record<string, any> {
  if (!jsonData) {
    // If no JSON data, just filter out excluded params from query params
    const filteredParams = { ...queryParams }
    excludeParams.forEach(param => {
      delete filteredParams[param]
    })
    return filteredParams
  }
  
  // Create a new object with query params as base
  const mergedParams = { ...queryParams }
  
  // Override with JSON data (JSON data takes precedence)
  for (const key in jsonData) {
    mergedParams[key] = jsonData[key]
  }
  
  // Remove excluded parameters
  excludeParams.forEach(param => {
    delete mergedParams[param]
  })
  
  return mergedParams
}
