/**
 * Supplier normalization, fuzzy/brand matching, and monthly grouping utilities.
 * Ensures that slips from the same supplier (e.g. "Engen" and "Engen Blouberg Motors",
 * or "Woolworths" and "Woolworths Food Gardens") are detected as the same supplier
 * during scanning and grouped accurately on the Dashboard and Suppliers views.
 */

const LEGAL_AND_BRANCH_NOISE = new Set([
    'pty',
    'ltd',
    'limited',
    'cc',
    'inc',
    'corp',
    'llc',
    'sa',
    'rsa',
    'south',
    'africa',
    'the',
    'and',
    'ta',
    't/a',
    'trading',
    'as',
    'store',
    'branch',
    'motors',
    'garage',
    'service',
    'station',
    'convenience',
    'centre',
    'center',
    'mall',
    'square',
    'hyper',
    'supermarket',
    'retail',
    'wholesalers',
    'wholesale',
    'holdings',
    'group',
])

const GENERIC_TITLES = new Set([
    'slip',
    'receipt',
    'tax invoice',
    'invoice',
    'cash sale',
    'pos purchase',
    'purchase',
    'unknown',
    'unspecified',
])

/**
 * Normalizes a supplier string into lowercase alphanumeric tokens,
 * stripping punctuation and legal suffixes like "(Pty) Ltd".
 */
export function tokenizeSupplierName(raw: string): string[] {
    if (!raw) return []
    const cleaned = raw
        .toLowerCase()
        .replace(/\(pty\)\s*ltd/gi, ' ')
        .replace(/\bt\/a\b/gi, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .trim()

    if (!cleaned) return []
    return cleaned.split(/\s+/).filter(Boolean)
}

/**
 * Extracts core brand tokens by removing common branch/legal suffixes
 * while always preserving at least the first meaningful token(s).
 */
export function getCoreBrandTokens(raw: string): string[] {
    const tokens = tokenizeSupplierName(raw)
    if (tokens.length === 0) return []
    if (tokens.length === 1) return tokens

    const filtered = tokens.filter((t, idx) => idx === 0 || !LEGAL_AND_BRANCH_NOISE.has(t))
    return filtered.length > 0 ? filtered : [tokens[0]]
}

/**
 * Simple Levenshtein distance for catching 1-2 character OCR typos
 * (e.g. "Woolworth" vs "Woolworths", "Checkrs" vs "Checkers").
 */
export function levenshteinDistance(a: string, b: string): number {
    const s = a.toLowerCase()
    const t = b.toLowerCase()
    if (s === t) return 0
    if (s.length === 0) return t.length
    if (t.length === 0) return s.length

    const dp: number[][] = Array.from({ length: s.length + 1 }, () =>
        new Array(t.length + 1).fill(0)
    )
    for (let i = 0; i <= s.length; i++) dp[i][0] = i
    for (let j = 0; j <= t.length; j++) dp[0][j] = j

    for (let i = 1; i <= s.length; i++) {
        for (let j = 1; j <= t.length; j++) {
            const cost = s[i - 1] === t[j - 1] ? 0 : 1
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            )
        }
    }
    return dp[s.length][t.length]
}

/**
 * Determines the raw supplier name from a slip record.
 * In Slips Vault, `title` is "Title / Merchant" (required) and `place` is "Location / Place".
 * Therefore `title` takes priority over `place` unless `title` is empty or a generic placeholder.
 */
export function getRawSlipSupplier(slip: {
    title?: string | null
    place?: string | null
}): string {
    const title = (slip.title || '').trim()
    const place = (slip.place || '').trim()

    if (title && !GENERIC_TITLES.has(title.toLowerCase())) {
        return title
    }
    if (place) {
        return place
    }
    return title || 'Unspecified Supplier'
}

/**
 * Checks whether two supplier names refer to the same underlying supplier/merchant.
 */
export function isSameSupplier(nameA: string, nameB: string): boolean {
    const a = nameA.trim()
    const b = nameB.trim()
    if (!a || !b) return false
    if (a.toLowerCase() === b.toLowerCase()) return true

    const tokensA = tokenizeSupplierName(a)
    const tokensB = tokenizeSupplierName(b)
    if (tokensA.length === 0 || tokensB.length === 0) return false

    const joinedA = tokensA.join(' ')
    const joinedB = tokensB.join(' ')
    if (joinedA === joinedB) return true

    const coreA = getCoreBrandTokens(a).join(' ')
    const coreB = getCoreBrandTokens(b).join(' ')
    if (coreA && coreB && coreA === coreB) return true

    // Single-word typo check for brands >= 5 chars (e.g. "Woolworth" vs "Woolworths")
    if (
        tokensA.length === 1 &&
        tokensB.length === 1 &&
        Math.min(joinedA.length, joinedB.length) >= 5
    ) {
        if (levenshteinDistance(joinedA, joinedB) <= 1) return true
    }

    // Prefix brand match: e.g. "Engen" vs "Engen Blouberg Motors"
    // or "Woolworths" vs "Woolworths Food Gardens"
    const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB
    const longer = tokensA.length <= tokensB.length ? tokensB : tokensA

    if (
        shorter.length >= 1 &&
        shorter[0].length >= 4 &&
        !GENERIC_TITLES.has(shorter[0]) &&
        shorter.every((tok, idx) => longer[idx] === tok)
    ) {
        return true
    }

    // Shared multi-token brand prefix (first 2 tokens identical, e.g. "Pick n Pay ..." or "Builders Warehouse ...")
    if (
        tokensA.length >= 2 &&
        tokensB.length >= 2 &&
        tokensA[0] === tokensB[0] &&
        tokensA[1] === tokensB[1] &&
        tokensA[0].length >= 3
    ) {
        return true
    }

    return false
}

export interface SupplierMatchResult {
    canonicalName: string
    extractedLocation?: string
    matchType: 'exact' | 'normalized' | 'prefix_or_fuzzy'
}

/**
 * Given a newly scanned or typed merchant/place string and the list of existing suppliers
 * in the vault, detects if it matches an already-scanned supplier.
 * Also extracts any trailing branch/location suffix so it can be placed in `Location / Place`.
 */
export function findMatchingExistingSupplier(
    candidate: string,
    existingSuppliers: string[]
): SupplierMatchResult | null {
    const raw = (candidate || '').trim()
    if (!raw || existingSuppliers.length === 0) return null

    // 1. Exact case-insensitive match
    const exact = existingSuppliers.find(
        (s) => s.trim().toLowerCase() === raw.toLowerCase()
    )
    if (exact) {
        return {
            canonicalName: exact.trim(),
            matchType: 'exact',
        }
    }

    // Sort existing suppliers shortest-first so canonical root names (like "Engen" or "Woolworths")
    // are preferred over longer branch-specific names.
    const sortedExisting = [...existingSuppliers]
        .map((s) => s.trim())
        .filter(Boolean)
        .sort((a, b) => a.length - b.length)

    // 2. Check `isSameSupplier`
    for (const existing of sortedExisting) {
        if (isSameSupplier(raw, existing)) {
            let extractedLocation: string | undefined
            const lowerRaw = raw.toLowerCase()
            const lowerExisting = existing.toLowerCase()
            if (lowerRaw.startsWith(lowerExisting) && raw.length > existing.length) {
                const remainder = raw
                    .slice(existing.length)
                    .replace(/^[\s\-,:/]+/, '')
                    .trim()
                if (remainder.length >= 2) {
                    extractedLocation = remainder
                }
            }

            const coreRaw = getCoreBrandTokens(raw).join(' ')
            const coreExisting = getCoreBrandTokens(existing).join(' ')
            return {
                canonicalName: existing,
                extractedLocation,
                matchType: coreRaw === coreExisting ? 'normalized' : 'prefix_or_fuzzy',
            }
        }
    }

    return null
}

/**
 * Given a list of raw supplier names from all slips in the vault, builds a canonical map
 * that groups variant supplier names (e.g. "Engen" and "Engen Blouberg Motors") under the
 * shortest/cleanest canonical supplier name ("Engen").
 */
export function buildCanonicalSupplierMap(rawNames: string[]): Map<string, string> {
    const uniqueClean = Array.from(
        new Set(rawNames.map((n) => (n || '').trim()).filter(Boolean))
    )

    // Sort shortest first so base brand names ("Engen") become the canonical representative
    const sorted = [...uniqueClean].sort((a, b) => a.length - b.length || a.localeCompare(b))
    const canonicalClusters: string[] = []
    const rawToCanonical = new Map<string, string>()

    for (const name of sorted) {
        const matchedCanonical = canonicalClusters.find((canon) =>
            isSameSupplier(name, canon)
        )
        if (matchedCanonical) {
            rawToCanonical.set(name.toLowerCase(), matchedCanonical)
        } else {
            canonicalClusters.push(name)
            rawToCanonical.set(name.toLowerCase(), name)
        }
    }

    return rawToCanonical
}

/**
 * Consistently extracts a UTC `YYYY-MM` month key from a slip's date or createdAt.
 * Using UTC prevents midnight `YYYY-MM-01T00:00:00.000Z` dates from shifting into the
 * previous month when rendered in negative-offset server timezones.
 */
export function getSlipMonthKey(slip: {
    date?: Date | string | null
    createdAt?: Date | string | null
}): string {
    const rawDate = slip.date || slip.createdAt
    if (!rawDate) return 'Unknown'
    const d = rawDate instanceof Date ? rawDate : new Date(rawDate)
    if (isNaN(d.getTime())) return 'Unknown'

    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
}

/**
 * Formats a `YYYY-MM` key into a human-friendly label (e.g. "Nov 2025" or "November 2025").
 */
export function formatMonthKey(
    yyyyMm: string,
    style: 'short' | 'long' = 'long'
): string {
    if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm || 'Unknown'
    const [year, month] = yyyyMm.split('-').map(Number)
    const d = new Date(Date.UTC(year, month - 1, 15))
    return d.toLocaleDateString('en-ZA', {
        month: style,
        year: 'numeric',
        timeZone: 'UTC',
    })
}
