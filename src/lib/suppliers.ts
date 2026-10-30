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

/** Short everyday words that must not swallow other merchants. */
const WEAK_BRAND_TOKENS = new Set(['cafe', 'fuel', 'food', 'shop'])

const ALIAS_PHRASES: Array<[string, string]> = [
    ['pick n pay', 'pick n pay'],
    ['dis chem', 'dischem'],
    ['dischem', 'dischem'],
    ['pnp', 'pick n pay'],
    ['kfc', 'kfc'],
    ['bp', 'bp'],
]

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
        .replace(/['’`]/g, '')
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

function aliasKey(raw: string): string | null {
    const joined = tokenizeSupplierName(raw).join(' ')
    if (!joined) return null
    for (const [phrase, key] of ALIAS_PHRASES) {
        if (joined === phrase || joined.startsWith(`${phrase} `)) return key
    }
    return null
}

function isWeakBrandToken(token: string): boolean {
    return WEAK_BRAND_TOKENS.has(token) || GENERIC_TITLES.has(token) || LEGAL_AND_BRANCH_NOISE.has(token)
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

    const aliasA = aliasKey(a)
    const aliasB = aliasKey(b)
    if (aliasA && aliasA === aliasB) return true

    const coreA = getCoreBrandTokens(a).join(' ')
    const coreB = getCoreBrandTokens(b).join(' ')
    if (coreA && coreB && coreA === coreB && !isWeakBrandToken(tokensA[0]) && !isWeakBrandToken(tokensB[0])) {
        return true
    }

    // One-character typos only for longer single-word brands (Woolworth / Woolworths).
    if (
        tokensA.length === 1 &&
        tokensB.length === 1 &&
        Math.min(joinedA.length, joinedB.length) >= 8 &&
        Math.abs(joinedA.length - joinedB.length) <= 1 &&
        levenshteinDistance(joinedA, joinedB) <= 1
    ) {
        return true
    }

    // Prefix brand match: e.g. "Engen" vs "Engen Blouberg Motors"
    const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB
    const longer = tokensA.length <= tokensB.length ? tokensB : tokensA

    if (
        shorter.length >= 1 &&
        shorter[0].length >= 5 &&
        !isWeakBrandToken(shorter[0]) &&
        shorter.every((tok, idx) => longer[idx] === tok)
    ) {
        return true
    }

    // Same distinctive first token: "Engen Blouberg" and "Engen Hermanus".
    if (
        tokensA[0] === tokensB[0] &&
        tokensA[0].length >= 5 &&
        !isWeakBrandToken(tokensA[0])
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
 * Groups variant supplier names. The label for a group is the name that appears
 * most often. Ties prefer fewer words, then the shorter string.
 */
export function buildCanonicalSupplierMap(rawNames: string[]): Map<string, string> {
    const counts = new Map<string, number>()
    const displayByKey = new Map<string, string>()

    for (const raw of rawNames) {
        const name = (raw || '').trim()
        if (!name) continue
        const key = name.toLowerCase()
        counts.set(key, (counts.get(key) || 0) + 1)
        if (!displayByKey.has(key)) displayByKey.set(key, name)
    }

    const clusters: string[][] = []
    for (const name of displayByKey.values()) {
        const cluster = clusters.find((members) =>
            members.some((member) => isSameSupplier(name, member))
        )
        if (cluster) cluster.push(name)
        else clusters.push([name])
    }

    const rawToCanonical = new Map<string, string>()
    for (const members of clusters) {
        const winner = [...members].sort((a, b) => {
            const countDiff = (counts.get(b.toLowerCase()) || 0) - (counts.get(a.toLowerCase()) || 0)
            if (countDiff !== 0) return countDiff
            const tokenDiff = tokenizeSupplierName(a).length - tokenizeSupplierName(b).length
            if (tokenDiff !== 0) return tokenDiff
            return a.length - b.length || a.localeCompare(b)
        })[0]
        for (const member of members) {
            rawToCanonical.set(member.toLowerCase(), winner)
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

/** Escape a user-supplied name so it can be placed inside a RegExp literally. */
export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Remove a leading supplier name from a location string.
 * The name is escaped, so characters like "(" cannot throw or change the pattern.
 */
export function stripSupplierPrefix(rawPlace: string, supplierName: string): string {
    const place = (rawPlace || '').trim()
    const name = (supplierName || '').trim()
    if (!place || !name) return place
    if (place.toLowerCase() === name.toLowerCase()) return place

    const pattern = new RegExp(`^${escapeRegExp(name)}\\s*`, 'i')
    const stripped = place.replace(pattern, '').replace(/^[\s\-,:/]+/, '').trim()
    return stripped || place
}

const LEGAL_SUFFIX_TOKENS = new Set([
    'pty',
    'ltd',
    'limited',
    'cc',
    'inc',
    'corp',
    'llc',
    'sa',
    'rsa',
    'the',
    'and',
    'ta',
    'trading',
    'as',
])

/**
 * Branch text that lived after the clean supplier name in a slip title.
 * Legal leftovers such as "(Pty) Ltd" are not a branch.
 */
export function extractBranchSuffix(title: string, cleanName: string): string | null {
    const rawTitle = (title || '').trim()
    const clean = (cleanName || '').trim()
    if (!rawTitle || !clean) return null
    if (!rawTitle.toLowerCase().startsWith(clean.toLowerCase())) return null
    if (rawTitle.length <= clean.length) return null

    const remainder = rawTitle.slice(clean.length).replace(/^[\s\-,:/]+/, '').trim()
    if (remainder.length < 2) return null

    const tokens = tokenizeSupplierName(remainder)
    if (tokens.length === 0 || tokens.every((token) => LEGAL_SUFFIX_TOKENS.has(token))) {
        return null
    }
    return remainder
}

function placeSharesBranch(place: string, branch: string): boolean {
    const placeTokens = new Set(tokenizeSupplierName(place))
    return tokenizeSupplierName(branch).some((token) => token.length >= 4 && placeTokens.has(token))
}

export interface PlannedSupplierRename {
    title: string
    place: string | null
    changed: boolean
}

/**
 * Plan a title cleanup without dropping a branch that lived in the title.
 * A real suburb already stored in place is kept. The branch is added beside it
 * when place does not already mention it. Otherwise the branch moves into place.
 */
export function planSupplierRename(
    slip: { title?: string | null; place?: string | null },
    cleanName: string
): PlannedSupplierRename {
    const clean = (cleanName || '').trim()
    const title = (slip.title || '').trim()
    const place = (slip.place || '').trim()
    const branch = extractBranchSuffix(title, clean)

    let nextPlace = place
    const placeIsRealSuburb =
        place.length > 0 &&
        place.toLowerCase() !== title.toLowerCase() &&
        place.toLowerCase() !== clean.toLowerCase()

    if (branch) {
        if (!placeIsRealSuburb) {
            nextPlace = branch
        } else if (!placeSharesBranch(place, branch)) {
            nextPlace = `${branch}, ${place}`
        }
    }

    return {
        title: clean,
        place: nextPlace || null,
        changed: title !== clean || (place || '') !== (nextPlace || ''),
    }
}

export function namesMatchingSupplier(
    names: string[],
    cleanName: string
): { accepted: string[]; rejected: string[] } {
    const clean = (cleanName || '').trim()
    const accepted: string[] = []
    const rejected: string[] = []
    const seen = new Set<string>()

    for (const raw of names) {
        const name = (raw || '').trim()
        if (!name) continue
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        if (!clean || !(name.toLowerCase() === clean.toLowerCase() || isSameSupplier(name, clean))) {
            rejected.push(name)
            continue
        }
        accepted.push(name)
    }

    return { accepted, rejected }
}

export type MergeScope =
    | { kind: 'own'; userId: string }
    | { kind: 'company'; companyId: string }
    | { kind: 'forbidden'; reason: string }

/**
 * Own slips only, unless a company admin explicitly opts into the whole company.
 * Contributors, accountants, and plain users never receive company scope.
 */
export function resolveMergeScope(input: {
    role?: string | null
    userId: string
    companyId?: string | null
    includeCompanyMembers?: boolean
}): MergeScope {
    if (input.role === 'ACCOUNTANT') {
        return { kind: 'forbidden', reason: 'Accountants cannot modify slips' }
    }

    const isCompanyAdmin =
        (input.role === 'COMPANY_ADMIN' || input.role === 'ADMIN') && !!input.companyId

    if (input.includeCompanyMembers && isCompanyAdmin && input.companyId) {
        return { kind: 'company', companyId: input.companyId }
    }

    return { kind: 'own', userId: input.userId }
}
