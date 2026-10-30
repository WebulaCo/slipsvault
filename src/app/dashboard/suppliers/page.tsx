import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SupplierFiltersBar from "@/app/components/SupplierFiltersBar"
import Link from "next/link"
import { ChevronLeft, Store, Receipt, Calendar, ArrowRight, TrendingUp } from "lucide-react"

interface SuppliersPageProps {
    searchParams: Promise<{
        month?: string
        supplier?: string
        q?: string
    }>
}

function getMonthKey(date: Date): string {
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
}

function formatMonthLabel(yyyyMm: string): string {
    const [y, m] = yyyyMm.split('-').map(Number)
    if (!y || !m) return yyyyMm
    return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', {
        month: 'long',
        year: 'numeric',
    })
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null
    }

    const { month, supplier, q } = await searchParams
    const activeMonth = month && month !== 'all' ? month : ''
    const activeSupplier = supplier && supplier !== 'all' ? supplier : ''
    const searchQuery = (q || '').trim().toLowerCase()

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
        orderBy: { date: 'desc' },
        include: {
            tags: true,
        },
    })

    // Collect all distinct suppliers and all available months across the vault
    const supplierNamesMap = new Map<string, string>()
    const monthSet = new Set<string>()

    const now = new Date()
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
    monthSet.add(thisMonthKey)
    monthSet.add(lastMonthKey)

    for (const slip of allSlips) {
        const rawSupplier = (slip.place || slip.title || 'Unspecified Supplier').trim()
        const normKey = rawSupplier.toLowerCase()
        if (!supplierNamesMap.has(normKey)) {
            supplierNamesMap.set(normKey, rawSupplier)
        }
        const effectiveDate = slip.date ? new Date(slip.date) : new Date(slip.createdAt)
        if (!isNaN(effectiveDate.getTime())) {
            monthSet.add(getMonthKey(effectiveDate))
        }
    }

    const allSupplierNames = Array.from(supplierNamesMap.values()).sort((a, b) =>
        a.localeCompare(b)
    )

    const availableMonths = Array.from(monthSet)
        .sort((a, b) => b.localeCompare(a))
        .map((m) => ({
            value: m,
            label: formatMonthLabel(m),
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
            const rawSupplier = (slip.place || slip.title || 'Unspecified Supplier').trim()
            if (rawSupplier.toLowerCase() !== activeSupplier.toLowerCase()) continue
            const effectiveDate = slip.date ? new Date(slip.date) : new Date(slip.createdAt)
            const mKey = !isNaN(effectiveDate.getTime()) ? getMonthKey(effectiveDate) : 'Unknown'
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
                monthLabel: formatMonthLabel(mKey),
                total: stats.total,
                count: stats.count,
            })
        }
    }

    // Filter slips for the active period & supplier filter
    const filteredSlips = allSlips.filter((slip) => {
        const rawSupplier = (slip.place || slip.title || 'Unspecified Supplier').trim()
        if (activeSupplier && rawSupplier.toLowerCase() !== activeSupplier.toLowerCase()) {
            return false
        }
        if (searchQuery && !rawSupplier.toLowerCase().includes(searchQuery)) {
            return false
        }
        if (activeMonth) {
            const effectiveDate = slip.date ? new Date(slip.date) : new Date(slip.createdAt)
            if (isNaN(effectiveDate.getTime()) || getMonthKey(effectiveDate) !== activeMonth) {
                return false
            }
        }
        return true
    })

    // Aggregate by supplier
    interface SupplierSummary {
        name: string
        slipCount: number
        totalSpend: number
        averageSpend: number
        lastDate: Date | null
        categories: string[]
    }

    const groupMap = new Map<
        string,
        {
            name: string
            slipCount: number
            totalSpend: number
            lastDate: Date | null
            categorySet: Set<string>
        }
    >()

    for (const slip of filteredSlips) {
        const rawSupplier = (slip.place || slip.title || 'Unspecified Supplier').trim()
        const key = rawSupplier.toLowerCase()
        const displayName = supplierNamesMap.get(key) || rawSupplier

        let group = groupMap.get(key)
        if (!group) {
            group = {
                name: displayName,
                slipCount: 0,
                totalSpend: 0,
                lastDate: null,
                categorySet: new Set<string>(),
            }
            groupMap.set(key, group)
        }

        group.slipCount += 1
        group.totalSpend += slip.amountAfterTax || 0

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
            slipCount: g.slipCount,
            totalSpend: g.totalSpend,
            averageSpend: g.slipCount > 0 ? g.totalSpend / g.slipCount : 0,
            lastDate: g.lastDate,
            categories: Array.from(g.categorySet),
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)

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
                        Suppliers & Monthly Spend
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
            />

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">
                            {activeMonth ? `Spend (${formatMonthLabel(activeMonth)})` : 'Total Spend'}
                        </h3>
                        <div className="text-2xl font-bold text-brand-navy font-mono">
                            R{grandTotalSpend.toFixed(2)}
                        </div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Active Suppliers</h3>
                        <div className="text-2xl font-bold text-gray-900">
                            {supplierSummaries.length}
                        </div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Total Slips</h3>
                        <div className="text-2xl font-bold text-gray-900">
                            {totalFilteredSlips}
                        </div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Top Supplier</h3>
                        <div
                            className="text-lg font-bold text-brand-teal truncate"
                            title={topSupplier ? `${topSupplier.name} (R${topSupplier.totalSpend.toFixed(2)})` : 'N/A'}
                        >
                            {topSupplier ? topSupplier.name : 'N/A'}
                        </div>
                        {topSupplier && (
                            <div className="text-xs text-gray-500 font-mono">
                                R{topSupplier.totalSpend.toFixed(2)}
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
                                Click any month below to filter or view slips for that month
                            </p>
                        </div>
                        <Link
                            href={`/dashboard/slips?supplier=${encodeURIComponent(activeSupplier)}${
                                activeMonth ? `&month=${encodeURIComponent(activeMonth)}` : ''
                            }`}
                            className="btn btn-xs bg-brand-navy text-white hover:bg-[#0d2e4d] border-none rounded-lg normal-case"
                        >
                            View All {activeSupplier} Slips
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {selectedSupplierMonthly.map((item) => {
                            const isSelectedMonth = activeMonth === item.monthKey
                            return (
                                <Link
                                    key={item.monthKey}
                                    href={`/dashboard/suppliers?supplier=${encodeURIComponent(activeSupplier)}&month=${encodeURIComponent(item.monthKey)}`}
                                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                                        isSelectedMonth
                                            ? 'border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal'
                                            : 'border-gray-100 hover:border-brand-teal/40 bg-gray-50/60'
                                    }`}
                                >
                                    <div>
                                        <div className="text-xs font-semibold text-gray-600 flex items-center gap-1">
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

            {/* Suppliers List / Table */}
            {supplierSummaries.length === 0 ? (
                <div className="card bg-white border-2 border-dashed border-gray-200 p-12 text-center rounded-xl">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Store size={30} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">No supplier spend found</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                        No slips match your selected supplier or month filter. Try choosing &ldquo;All Months&rdquo; or resetting your filters.
                    </p>
                    <Link href="/dashboard/suppliers" className="btn btn-outline btn-sm mx-auto">
                        Reset Supplier Filters
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Mobile Cards View */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {supplierSummaries.map((sup) => {
                            const sharePct =
                                grandTotalSpend > 0
                                    ? Math.min(100, Math.round((sup.totalSpend / grandTotalSpend) * 100))
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
                                                    activeMonth ? `&month=${encodeURIComponent(activeMonth)}` : ''
                                                }`}
                                                className="font-bold text-brand-navy hover:text-brand-teal transition-colors"
                                            >
                                                {sup.name}
                                            </Link>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {sup.slipCount} {sup.slipCount === 1 ? 'slip' : 'slips'} • Avg R
                                                {sup.averageSpend.toFixed(2)}
                                                {sup.lastDate &&
                                                    ` • Last: ${sup.lastDate.toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: '2-digit',
                                                    })}`}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-mono font-bold text-lg text-brand-navy">
                                                R{sup.totalSpend.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-400">{sharePct}% of total</div>
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
                                            Monthly history
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
                                    <th>Categories</th>
                                    <th className="text-center">Slips</th>
                                    <th className="text-right">Average Slip</th>
                                    <th className="text-right">Total Spent</th>
                                    <th className="w-36">% of Spend</th>
                                    <th>Last Slip</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {supplierSummaries.map((sup) => {
                                    const sharePct =
                                        grandTotalSpend > 0
                                            ? Math.min(100, Math.round((sup.totalSpend / grandTotalSpend) * 100))
                                            : 0
                                    const slipsHref = `/dashboard/slips?supplier=${encodeURIComponent(sup.name)}${
                                        activeMonth ? `&month=${encodeURIComponent(activeMonth)}` : ''
                                    }`

                                    return (
                                        <tr key={sup.name} className="hover">
                                            <td className="font-bold text-brand-navy">
                                                <Link
                                                    href={`/dashboard/suppliers?supplier=${encodeURIComponent(sup.name)}${
                                                        activeMonth ? `&month=${encodeURIComponent(activeMonth)}` : ''
                                                    }`}
                                                    className="hover:text-brand-teal hover:underline flex items-center gap-2"
                                                >
                                                    <Store size={16} className="text-brand-teal shrink-0" />
                                                    <span>{sup.name}</span>
                                                </Link>
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
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center font-medium">{sup.slipCount}</td>
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
                                            <td className="whitespace-nowrap font-mono text-xs text-gray-500">
                                                {sup.lastDate
                                                    ? sup.lastDate.toLocaleDateString('en-GB', {
                                                          day: '2-digit',
                                                          month: '2-digit',
                                                          year: '2-digit',
                                                      })
                                                    : '-'}
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
            )}
        </div>
    )
}
