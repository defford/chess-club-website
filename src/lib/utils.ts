import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts the first name from a full name (case-insensitive)
 * Handles edge cases like empty strings, multiple spaces, etc.
 */
export function getFirstName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') {
    return ''
  }
  // Split by space and take the first non-empty token
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 0 ? parts[0].toLowerCase() : ''
}

/**
 * Checks if two names match by first name (case-insensitive)
 */
export function matchByFirstName(name1: string, name2: string): boolean {
  const firstName1 = getFirstName(name1)
  const firstName2 = getFirstName(name2)
  
  if (!firstName1 || !firstName2) {
    return false
  }
  
  return firstName1 === firstName2
}
