/**
 * Formats a height string with proper fraction display
 * Converts decimal parts to fractions (e.g., 6'1".5 to 6'1½")
 */
export function formatHeightWithFractions(height: string): string {
  if (!height) return "Not set"

  // Regular expression to match height patterns like 6'1", 6'1.5", 6'1".5, etc.
  const heightRegex = /(\d+)'(\d+)(?:"|″)?(?:\.(\d+))?/
  const match = height.match(heightRegex)

  if (!match) return height // Return original if no match

  const feet = match[1]
  const inches = match[2]
  const fraction = match[3]

  // If there's no fraction, return the standard format
  if (!fraction) {
    return `${feet}'${inches}"`
  }

  // Convert decimal to fraction
  let fractionChar = ""
  if (fraction === "5" || fraction === "50") {
    fractionChar = "½"
  } else if (fraction === "25" || fraction === "2" || fraction === "3") {
    fractionChar = "¼"
  } else if (fraction === "75" || fraction === "7" || fraction === "8") {
    fractionChar = "¾"
  } else if (fraction === "33" || fraction === "3") {
    fractionChar = "⅓"
  } else if (fraction === "66" || fraction === "6" || fraction === "67") {
    fractionChar = "⅔"
  }

  return `${feet}'${inches} ${fractionChar}"`
}
