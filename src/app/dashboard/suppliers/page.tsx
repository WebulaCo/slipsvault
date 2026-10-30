import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SupplierFiltersBar from "@/app/components/SupplierFiltersBar"
import MergeSuppliersBanner from "@/app/components/MergeSuppliersBanner"
import SlipList from "@/app/components/SlipList"
import {
    buildCanonicalSupplierMap,
    formatMonthKey,
    getRawSlipSupplier,
    getSlipMonthKey,
    isSameSupplier,
    stripSupplierPrefix,
} from "@/lib/suppliers"
import Link from "next/link"
import {
    ChevronLeft,
    Store,
    Receipt,
    Calendar,
    ArrowRight,
    TrendingUp,
    MapPin,
} from "lucide-react"

interface SuppliersPageProps {
    searchParams: Promise<{
        month?: string
        supplier?: string
        q?: string
        view?: string
    }>
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null
    }

    const { month, supplier, q, view } = await searchParams
    const activeMonth = month && month !== 'all' ? month : ''
    const activeSupplier = supplier && supplier !== 'all' ? supplier : ''
    const searchQuery = (q || '').trim().toLowerCase()
    const viewMode = view || 'both' // 'both' | 'suppliers' | 'monthly'

    const isCompanyView =
        (session.user.role === 'COMPANY_ADMIN' ||
            session.user.role === 'ACCOUNTANT' ||
            session.user.role === 'ADMIN') &&
        session.user.companyId

    const whereClause = isCompanyView
        ? { user: { companyId: session.user.companyId } }
        : { userId: session.user.id }

    const allSlips = await prisma.slip.findMany({
        where: whereClause,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
            tags: true,
            photos: true,
            user: true,
        },
    })

    // Build canonical supplier mapping so variant names ("Engen" and "Engen Blouberg Motors")
    // are grouped under the canonical supplier ("Engen")
    const rawSupplierNames = allSlips.map((s) => getRawSlipSupplier(s))
    const canonicalMap = buildCanonicalSupplierMap(rawSupplierNames)

    const getCanonicalSupplier = (slip: (typeof allSlips)[number]): string => {
        const raw = getRawSlipSupplier(slip)
        return canonicalMap.get(raw.toLowerCase()) || raw
    }

    // Names that the matcher already groups. The user picks the clean name later.
    const titlesByCanonical = new Map<string, Set<string>>()
    for (const slip of allSlips) {
        const rawTitle = (slip.title || '').trim()
        if (!rawTitle) continue
        const canon = getCanonicalSupplier(slip)
        const set = titlesByCanonical.get(canon) || new Set<string>()
        set.add(rawTitle)
        titlesByCanonical.set(canon, set)
    }
    const variantGroups = Array.from(titlesByCanonical.values())
        .map((set) => {
            const seen = new Map<string, string>()
            for (const name of set) {
                const key = name.toLowerCase()
                if (!seen.has(key)) seen.set(key, name)
            }
            return { names: Array.from(seen.values()) }
        })
        .filter((group) => group.names.length >= 2)

    // Collect all canonical supplier names and month stats across the vault
    const allSupplierNames = Array.from(new Set(allSlips.map(getCanonicalSupplier))).sort(
        (a, b) => a.localeCompare(b)
    )

    const monthStatsMap = new Map<string, { count: number; total: number }>()
    for (const slip of allSlips) {
        const mKey = getSlipMonthKey(slip)
        const entry = monthStatsMap.get(mKey) || { count: 0, total: 0 }
        entry.count += 1
        entry.total += slip.amountAfterTax || 0
        monthStatsMap.set(mKey, entry)
    }

    const availableMonths = Array.from(monthStatsMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([mKey, stats]) => ({
            value: mKey,
            label: formatMonthKey(mKey, 'long'),
            shortLabel: formatMonthKey(mKey, 'short'),
            count: stats.count,
            total: stats.total,
        }))

    // If a specific supplier is selected, compute their month-by-month spend history across all months
    const selectedSupplierMonthly: {
        monthKey: string
        monthLabel: string
        total: number
        count: number
    }[] = []

    if (activeSupplier) {
        const monthlyMap = new Map<string, { total: number; count: number }>()
        for (const slip of allSlips) {
            const canonSup = getCanonicalSupplier(slip)
            if (!isSameSupplier(canonSup, activeSupplier) && canonSup.toLowerCase() !== activeSupplier.toLowerCase()) {
                continue
            }
            const mKey = getSlipMonthKey(slip)
            const entry = monthlyMap.get(mKey) || { total: 0, count: 0 }
            entry.total += slip.amountAfterTax || 0
            entry.count += 1
            monthlyMap.set(mKey, entry)
        }
        for (const [mKey, stats] of Array.from(monthlyMap.entries()).sort((a, b) =>
            b[0].localeCompare(a[0])
        )) {
            selectedSupplierMonthly.push({
                monthKey: mKey,
                monthLabel: formatMonthKey(mKey, 'long'),
                total: stats.total,
                count: stats.count,
            })
        }
    }

    // Filter slips for the active period, supplier, and search query
    const filteredSlips = allSlips.filter((slip) => {
        const canonSupplier = getCanonicalSupplier(slip)
        const rawTitle = (slip.title || '').trim()
        const rawPlace = (slip.place || '').trim()

        if (activeSupplier) {
            const matchesActive =
                canonSupplier.toLowerCase() === activeSupplier.toLowerCase() ||
                isSameSupplier(canonSupplier, activeSupplier) ||
                isSameSupplier(rawTitle, activeSupplier)
            if (!matchesActive) return false
        }

        if (searchQuery) {
            const searchable = [
                canonSupplier,
                rawTitle,
                rawPlace,
                slip.summary || '',
                ...slip.tags.map((t) => t.name),
            ]
                .join(' ')
                .toLowerCase()
            if (!searchable.includes(searchQuery)) return false
        }

        if (activeMonth) {
            if (getSlipMonthKey(slip) !== activeMonth) {
                return false
            }
        }

        return true
    })

    // 1. Aggregate by Supplier (for the Suppliers Summary table)
    interface SupplierSummary {
        name: string
        locations: string[]
        slipCount: number
        totalSpend: number
        averageSpend: number
        lastDate: Date | null
        categories: string[]
        monthsActive: number
    }

    const groupMap = new Map<
        string,
        {
            name: string
            locationSet: Set<string>
            slipCount: number
            totalSpend: number
            lastDate: Date | null
            categorySet: Set<string>
            monthSet: Set<string>
        }
    >()

    for (const slip of filteredSlips) {
        const canonName = getCanonicalSupplier(slip)
        const key = canonName.toLowerCase()

        let group = groupMap.get(key)
        if (!group) {
            group = {
                name: canonName,
                locationSet: new Set<string>(),
                slipCount: 0,
                totalSpend: 0,
                lastDate: null,
                categorySet: new Set<string>(),
                monthSet: new Set<string>(),
            }
            groupMap.set(key, group)
        }

        group.slipCount += 1
        group.totalSpend += slip.amountAfterTax || 0
        group.monthSet.add(getSlipMonthKey(slip))

        // Extract meaningful location/branch info
        const rawPlace = (slip.place || '').trim()
        if (rawPlace && rawPlace.toLowerCase() !== canonName.toLowerCase()) {
            group.locationSet.add(stripSupplierPrefix(rawPlace, canonName))
        }

        const slipDate = slip.date ? new Date(slip.date) : new Date(slip.createdAt)
        if (!isNaN(slipDate.getTime())) {
            if (!group.lastDate || slipDate > group.lastDate) {
                group.lastDate = slipDate
            }
        }

        for (const t of slip.tags) {
            group.categorySet.add(t.name)
        }
    }

    const supplierSummaries: SupplierSummary[] = Array.from(groupMap.values())
        .map((g) => ({
            name: g.name,
            locations: Array.from(g.locationSet),
            slipCount: g.slipCount,
            totalSpend: g.totalSpend,
            averageSpend: g.slipCount > 0 ? g.totalSpend / g.slipCount : 0,
            lastDate: g.lastDate,
            categories: Array.from(g.categorySet),
            monthsActive: g.monthSet.size,
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)

    // 2. Aggregate by Month -> Suppliers (for the "Grouped by Month" view)
    interface MonthlySupplierBreakdown {
        monthKey: string
        monthLabel: string
        totalSpend: number
        slipCount: number
        suppliers: {
            name: string
            locations: string[]
            categories: string[]
            slipCount: number
            totalSpend: number
        }[]
    }

    const monthlyGroupsMap = new Map<
        string,
        {
            monthKey: string
            totalSpend: number
            slipCount: number
            supplierMap: Map<
                string,
                {
                    name: string
                    locations: Set<string>
                    categories: Set<string>
                    slipCount: number
                    totalSpend: number
                }
            >
        }
    >()

    for (const slip of filteredSlips) {
        const mKey = getSlipMonthKey(slip)
        const canonName = getCanonicalSupplier(slip)
        const sKey = canonName.toLowerCase()
        const amount = slip.amountAfterTax || 0

        let mGroup = monthlyGroupsMap.get(mKey)
        if (!mGroup) {
            mGroup = {
                monthKey: mKey,
                totalSpend: 0,
                slipCount: 0,
                supplierMap: new Map(),
            }
            monthlyGroupsMap.set(mKey, mGroup)
        }

        mGroup.totalSpend += amount
        mGroup.slipCount += 1

        let sEntry = mGroup.supplierMap.get(sKey)
        if (!sEntry) {
            sEntry = {
                name: canonName,
                locations: new Set<string>(),
                categories: new Set<string>(),
                slipCount: 0,
                totalSpend: 0,
            }
            mGroup.supplierMap.set(sKey, sEntry)
        }

        sEntry.slipCount += 1
        sEntry.totalSpend += amount

        const rawPlace = (slip.place || '').trim()
        if (rawPlace && rawPlace.toLowerCase() !== canonName.toLowerCase()) {
            sEntry.locations.add(stripSupplierPrefix(rawPlace, canonName))
        }

        for (const t of slip.tags) {
            sEntry.categories.add(t.name)
        }
    }

    const monthlyBreakdowns: MonthlySupplierBreakdown[] = Array.from(
        monthlyGroupsMap.values()
    )
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
        .map((mg) => ({
            monthKey: mg.monthKey,
            monthLabel: formatMonthKey(mg.monthKey, 'long'),
            totalSpend: mg.totalSpend,
            slipCount: mg.slipCount,
            suppliers: Array.from(mg.supplierMap.values())
                .map((s) => ({
                    name: s.name,
                    locations: Array.from(s.locations),
                    categories: Array.from(s.categories),
                    slipCount: s.slipCount,
                    totalSpend: s.totalSpend,
                }))
                .sort((a, b) => b.totalSpend - a.totalSpend),
        }))

    const grandTotalSpend = supplierSummaries.reduce((sum, s) => sum + s.totalSpend, 0)
    const totalFilteredSlips = supplierSummaries.reduce((sum, s) => sum + s.slipCount, 0)
    const topSupplier = supplierSummaries[0] || null

    return (
        <div className="pb-20">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-brand-teal">
                    <Link href="/dashboard" className="flex items-center gap-1 font-medium">
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                </div>
                <div className="text-center">
                    <h1 className="text-xl font-bold text-brand-navy flex items-center justify-center gap-2">
                        <Store size={22} className="text-brand-teal" />
                        Suppliers &amp; Monthly Spend
                    </h1>
                </div>
                <Link
                    href="/dashboard/slips"
                    className="btn btn-sm btn-outline border-gray-200 text-gray-700 hover:bg-brand-navy hover:text-white rounded-full normal-case"
                >
                    All Slips
                </Link>
            </header>

            {/* Filter Bar */}
            <SupplierFiltersBar
                suppliers={allSupplierNames}
                availableMonths={availableMonths}
                totalSlipsCount={allSlips.length}
            />

            {session.user.role !== 'ACCOUNTANT' && (
                <MergeSuppliersBanner
                    variantGroups={variantGroups}
                    canIncludeCompany={
                        (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ADMIN') &&
                        !!session.user.companyId
                    }
                />
            )}

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">
                            {activeMonth
                                ? `Spend (${formatMonthKey(activeMonth, 'short')})`
                                : 'Total Spend'}
                        </h3>
                        <div className="text-2xl font-bold text-brand-navy font-mono">
                            R{grandTotalSpend.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            {monthlyBreakdowns.length}{' '}
                            {monthlyBreakdowns.length === 1 ? 'month' : 'months'} active
                        </div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Active Suppliers</h3>
                        <div className="text-2xl font-bold text-gray-900">
                            {supplierSummaries.length}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            Grouped across branches
                        </div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Matching Slips</h3>
                        <div className="text-2xl font-bold text-gray-900">
                            {totalFilteredSlips}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            Avg R
                            {totalFilteredSlips > 0
                                ? (grandTotalSpend / totalFilteredSlips).toFixed(2)
                                : '0.00'}{' '}
                            / slip
                        </div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Top Supplier</h3>
                        <div
                            className="text-lg font-bold text-brand-teal truncate"
                            title={
                                topSupplier
                                    ? `${topSupplier.name} (R${topSupplier.totalSpend.toFixed(2)})`
                                    : 'N/A'
                            }
                        >
                            {topSupplier ? topSupplier.name : 'N/A'}
                        </div>
                        {topSupplier && (
                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                                R{topSupplier.totalSpend.toFixed(2)} ({topSupplier.slipCount}{' '}
                                {topSupplier.slipCount === 1 ? 'slip' : 'slips'})
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Single-Supplier Monthly Breakdown Card (shown when a supplier is selected) */}
            {activeSupplier && selectedSupplierMonthly.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-brand-teal/20 p-5 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                            <h2 className="text-base font-bold text-brand-navy flex items-center gap-2">
                                <TrendingUp size={18} className="text-brand-teal" />
                                Monthly Spend History: {activeSupplier}
                            </h2>
                            <p className="text-xs text-gray-500">
                                Click any month below to filter {activeSupplier} slips for that month
                            </p>
                        </div>
                        <Link
                            href={`/dashboard/slips?supplier=${encodeURIComponent(activeSupplier)}${
                                activeMonth ? `&month=${encodeURIComponent(activeMonth)}` : ''
                            }`}
                            className="btn btn-xs bg-brand-navy text-white hover:bg-[#0d2e4d] border-none rounded-lg normal-case"
                        >
                            Open in All Slips
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {selectedSupplierMonthly.map((item) => {
                            const isSelectedMonth = activeMonth === item.monthKey
                            return (
                                <Link
                                    key={item.monthKey}
                                    href={
                                        isSelectedMonth
                                            ? `/dashboard/suppliers?supplier=${encodeURIComponent(activeSupplier)}`
                                            : `/dashboard/suppliers?supplier=${encodeURIComponent(activeSupplier)}&month=${encodeURIComponent(item.monthKey)}`
                                    }
                                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                                        isSelectedMonth
                                            ? 'border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal'
                                            : 'border-gray-100 hover:border-brand-teal/40 bg-gray-50/60'
                                    }`}
                                >
                                    <div>
                                        <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                            <Calendar size={12} className="text-brand-teal" />
                                            {item.monthLabel}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {item.count} {item.count === 1 ? 'slip' : 'slips'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-brand-navy">
                                            R{item.total.toFixed(2)}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}

            {supplierSummaries.length === 0 ? (
                <div className="card bg-white border-2 border-dashed border-gray-200 p-12 text-center rounded-xl">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Store size={30} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">No supplier spend found</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                        No slips match your selected supplier or month filter. Try choosing &ldquo;All Time&rdquo; or resetting your filters.
                    </p>
                    <Link href="/dashboard/suppliers" className="btn btn-outline btn-sm mx-auto">
                        Reset Supplier Filters
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* SECTION 1: Suppliers Summary Table / Cards */}
                    {(viewMode === 'both' || viewMode === 'suppliers') && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-base font-bold text-brand-navy flex items-center gap-2">
                                    <Store size={18} className="text-brand-teal" />
                                    Spend by Supplier{' '}
                                    {activeMonth ? `(${formatMonthKey(activeMonth, 'long')})` : '(All Selected Months)'}
                                </h2>
                                <span className="text-xs text-gray-400">
                                    Click a supplier to inspect monthly history &amp; slips
                                </span>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Mobile Cards View */}
                                <div className="md:hidden divide-y divide-gray-100">
                                    {supplierSummaries.map((sup) => {
                                        const sharePct =
                                            grandTotalSpend > 0
                                                ? Math.min(
                                                      100,
                                                      Math.round((sup.totalSpend / grandTotalSpend) * 100)
                                                  )
                                                : 0
                                        const slipsHref = `/dashboard/slips?supplier=${encodeURIComponent(sup.name)}${
                                            activeMonth ? `&month=${encodeURIComponent(activeMonth)}` : ''
                                        }`

                                        return (
                                            <div key={sup.name} className="p-4 space-y-2.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <Link
                                                            href={`/dashboard/suppliers?supplier=${encodeURIComponent(sup.name)}${
                                                                activeMonth
                                                                    ? `&month=${encodeURIComponent(activeMonth)}`
                                                                    : ''
                                                            }`}
                                                            className="font-bold text-brand-navy hover:text-brand-teal transition-colors"
                                                        >
                                                            {sup.name}
                                                        </Link>
                                                        {sup.locations.length > 0 && (
                                                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                                <MapPin size={11} />
                                                                <span>{sup.locations.join(', ')}</span>
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {sup.slipCount} {sup.slipCount === 1 ? 'slip' : 'slips'} • Avg R
                                                            {sup.averageSpend.toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="font-mono font-bold text-lg text-brand-navy">
                                                            R{sup.totalSpend.toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {sharePct}% of total
                                                        </div>
                                                    </div>
                                                </div>

                                                {sup.categories.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {sup.categories.map((cat) => (
                                                            <span
                                                                key={cat}
                                                                className="bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded text-xs font-medium"
                                                            >
                                                                {cat}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-1">
                                                    <Link
                                                        href={`/dashboard/suppliers?supplier=${encodeURIComponent(sup.name)}`}
                                                        className="text-xs text-brand-teal font-medium hover:underline"
                                                    >
                                                        Monthly breakdown ({sup.monthsActive}{' '}
                                                        {sup.monthsActive === 1 ? 'month' : 'months'})
                                                    </Link>
                                                    <Link
                                                        href={slipsHref}
                                                        className="btn btn-xs btn-outline border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white rounded-lg normal-case flex items-center gap-1"
                                                    >
                                                        <Receipt size={12} />
                                                        View Slips
                                                    </Link>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="table table-zebra w-full">
                                        <thead>
                                            <tr>
                                                <th>Supplier</th>
                                                <th>Locations / Branches</th>
                                                <th>Categories</th>
                                                <th className="text-center">Slips</th>
                                                <th className="text-right">Average Slip</th>
                                                <th className="text-right">Total Spent</th>
                                                <th className="w-36">% of Spend</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {supplierSummaries.map((sup) => {
                                                const sharePct =
                                                    grandTotalSpend > 0
                                                        ? Math.min(
                                                              100,
                                                              Math.round(
                                                                  (sup.totalSpend / grandTotalSpend) * 100
                                                              )
                                                          )
                                                        : 0
                                                const slipsHref = `/dashboard/slips?supplier=${encodeURIComponent(sup.name)}${
                                                    activeMonth
                                                        ? `&month=${encodeURIComponent(activeMonth)}`
                                                        : ''
                                                }`

                                                return (
                                                    <tr key={sup.name} className="hover">
                                                        <td className="font-bold text-brand-navy">
                                                            <Link
                                                                href={`/dashboard/suppliers?supplier=${encodeURIComponent(sup.name)}${
                                                                    activeMonth
                                                                        ? `&month=${encodeURIComponent(activeMonth)}`
                                                                        : ''
                                                                }`}
                                                                className="hover:text-brand-teal hover:underline flex items-center gap-2"
                                                            >
                                                                <Store
                                                                    size={16}
                                                                    className="text-brand-teal shrink-0"
                                                                />
                                                                <span>{sup.name}</span>
                                                            </Link>
                                                        </td>
                                                        <td className="text-xs text-gray-500">
                                                            {sup.locations.length > 0
                                                                ? sup.locations.join(', ')
                                                                : '-'}
                                                        </td>
                                                        <td>
                                                            <div className="flex flex-wrap gap-1">
                                                                {sup.categories.length > 0 ? (
                                                                    sup.categories.map((cat) => (
                                                                        <span
                                                                            key={cat}
                                                                            className="bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded text-xs font-medium"
                                                                        >
                                                                            {cat}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">
                                                                        -
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="text-center font-medium">
                                                            {sup.slipCount}
                                                        </td>
                                                        <td className="text-right font-mono text-sm text-gray-600">
                                                            R{sup.averageSpend.toFixed(2)}
                                                        </td>
                                                        <td className="text-right font-mono font-bold text-brand-navy">
                                                            R{sup.totalSpend.toFixed(2)}
                                                        </td>
                                                        <td>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                        className="bg-brand-teal h-2 rounded-full"
                                                                        style={{ width: `${sharePct}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-gray-500 w-9 text-right font-mono">
                                                                    {sharePct}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <Link
                                                                    href={`/dashboard/suppliers?supplier=${encodeURIComponent(sup.name)}`}
                                                                    className="btn btn-xs btn-ghost text-brand-teal hover:bg-brand-teal/10 normal-case"
                                                                    title="View monthly spend history for this supplier"
                                                                >
                                                                    By Month
                                                                </Link>
                                                                <Link
                                                                    href={slipsHref}
                                                                    className="btn btn-xs btn-outline border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white rounded-lg normal-case inline-flex items-center gap-1"
                                                                >
                                                                    Slips
                                                                    <ArrowRight size={12} />
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: Suppliers Grouped by Month */}
                    {(viewMode === 'both' || viewMode === 'monthly') && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-base font-bold text-brand-navy flex items-center gap-2">
                                    <Calendar size={18} className="text-brand-teal" />
                                    Suppliers Spend Grouped by Month
                                </h2>
                                <span className="text-xs text-gray-400">
                                    {monthlyBreakdowns.length}{' '}
                                    {monthlyBreakdowns.length === 1 ? 'month' : 'months'}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {monthlyBreakdowns.map((mb) => (
                                    <div
                                        key={mb.monthKey}
                                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                                    >
                                        <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-brand-teal" />
                                                <Link
                                                    href={`/dashboard/suppliers?month=${encodeURIComponent(mb.monthKey)}`}
                                                    className="font-bold text-brand-navy hover:text-brand-teal"
                                                >
                                                    {mb.monthLabel}
                                                </Link>
                                                <span className="badge badge-sm bg-white text-gray-600 border-gray-200">
                                                    {mb.slipCount} {mb.slipCount === 1 ? 'slip' : 'slips'} •{' '}
                                                    {mb.suppliers.length}{' '}
                                                    {mb.suppliers.length === 1 ? 'supplier' : 'suppliers'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-bold text-brand-navy">
                                                    R{mb.totalSpend.toFixed(2)}
                                                </span>
                                                <Link
                                                    href={`/dashboard/slips?month=${encodeURIComponent(mb.monthKey)}${
                                                        activeSupplier
                                                            ? `&supplier=${encodeURIComponent(activeSupplier)}`
                                                            : ''
                                                    }`}
                                                    className="text-xs text-brand-teal hover:underline font-medium"
                                                >
                                                    View Month Slips
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-gray-100">
                                            {mb.suppliers.map((sup) => {
                                                const monthShare =
                                                    mb.totalSpend > 0
                                                        ? Math.round((sup.totalSpend / mb.totalSpend) * 100)
                                                        : 0
                                                return (
                                                    <div
                                                        key={`${mb.monthKey}-${sup.name}`}
                                                        className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Link
                                                                    href={`/dashboard/suppliers?supplier=${encodeURIComponent(sup.name)}&month=${encodeURIComponent(mb.monthKey)}`}
                                                                    className="font-semibold text-gray-900 hover:text-brand-teal text-sm"
                                                                >
                                                                    {sup.name}
                                                                </Link>
                                                                {sup.locations.length > 0 && (
                                                                    <span className="text-xs text-gray-400">
                                                                        ({sup.locations.join(', ')})
                                                                    </span>
                                                                )}
                                                                {sup.categories.map((cat) => (
                                                                    <span
                                                                        key={cat}
                                                                        className="bg-yellow-50 text-yellow-700 border border-yellow-100 px-1.5 py-0.5 rounded text-[11px] font-medium"
                                                                    >
                                                                        {cat}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-0.5">
                                                                {sup.slipCount}{' '}
                                                                {sup.slipCount === 1 ? 'slip' : 'slips'} •{' '}
                                                                {monthShare}% of {mb.monthLabel} spend
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="font-mono font-bold text-brand-navy text-sm">
                                                                R{sup.totalSpend.toFixed(2)}
                                                            </span>
                                                            <Link
                                                                href={`/dashboard/slips?supplier=${encodeURIComponent(sup.name)}&month=${encodeURIComponent(mb.monthKey)}`}
                                                                className="btn btn-xs btn-ghost text-gray-500 hover:text-brand-navy normal-case"
                                                            >
                                                                Slips
                                                            </Link>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: Matching Slips List when a specific Supplier or Month is selected */}
                    {(activeSupplier || activeMonth || searchQuery) && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-base font-bold text-brand-navy flex items-center gap-2">
                                    <Receipt size={18} className="text-brand-teal" />
                                    Matching Slips ({filteredSlips.length})
                                </h2>
                            </div>
                            <SlipList slips={filteredSlips} isFiltered={true} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
