export const ENTERPRISE_TEAM = [
  'Shreyansh',
  'Rajat',
  'Sanjay',
]

export const EXCLUDED_MEMBERS = [
  'Harshit',
]

export const LOW_PERFORMER_WATCHLIST = [
  'Kunal',
  'Nikita',
  'Nikita Jaiswal',
  'Saurabh',
  'Saurabh Prashar',
  'AbhiLove',
  'AbhiLove Chauhan',
  'Pawan',
  'Pawan Kumar Singh',
  'Neha Singh',
]

export function getStatus(connectPercent: number, connected: number): string {
  if (connectPercent >= 50) return 'Excellent'
  if (connectPercent >= 25 && connected > 0) return 'Good'
  return 'Low'
}

export function nameMatches(fullName: string, checkNames: string[]): boolean {
  const lower = fullName.toLowerCase()
  return checkNames.some(n => lower.includes(n.toLowerCase()) || n.toLowerCase().includes(lower))
}
