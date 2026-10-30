export function sharedCurrency(currencies: Array<string | null | undefined>): string | null {
    const unique = Array.from(
        new Set(currencies.map((currency) => (currency || '').trim()).filter(Boolean))
    )
    return unique.length === 1 ? unique[0] : null
}

export function formatAmount(amount: number, currency: string | null): string {
    const formatted = amount.toFixed(2)
    return currency ? `${currency}${formatted}` : formatted
}
