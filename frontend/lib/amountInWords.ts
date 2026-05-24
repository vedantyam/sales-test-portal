const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
}

function threeDigits(n: number): string {
  if (n >= 100) {
    const h = Math.floor(n / 100)
    const rest = n % 100
    return ONES[h] + ' Hundred' + (rest ? ' ' + twoDigits(rest) : '')
  }
  return twoDigits(n)
}

export function amountInWords(amount: number): string {
  const n = Math.round(amount)
  if (n === 0) return 'Indian Rupee Zero Only'

  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000

  let words = ''
  if (crore) words += threeDigits(crore) + ' Crore '
  if (lakh) words += threeDigits(lakh) + ' Lakh '
  if (thousand) words += threeDigits(thousand) + ' Thousand '
  if (rest) words += threeDigits(rest)

  return 'Indian Rupee ' + words.trim() + ' Only'
}

export function fmtInr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
