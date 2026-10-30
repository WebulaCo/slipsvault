import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SlipList from "@/app/components/SlipList"
import DashboardCharts from "@/app/components/DashboardCharts"
import {
    buildCanonicalSupplierMap,
    formatMonthKey,
    getRawSlipSupplier,
    getSlipMonthKey,
} from "@/lib/suppliers"
import { Calendar, Store, Tag, Receipt, ArrowRight, X, Plus } from "lucide-react"
import Link from "next/link"

interface DashboardPageProps {
    searchParams: Promise<{
        month?: string
    }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null // Middleware handles redirect
    }

    const { month } = await searchParams
    const activeMonth = month && month !== 'all' ? month : ''

    // Determine access level
    const isCompanyView =
        (session.user.role === 'COMPANY_ADMIN' ||
            session.user.role === 'ACCOUNTANT' ||
            session.user.role === 'ADMIN') &&
        session.user.companyId

    const whereClause = isCompanyView
        ? { user: { companyId: session.user.companyId } }
        : { userId: session.user.id }

    // Fetch all slips for analytics and recent list
    const allSlips = await prisma.slip.findMany({
        where: whereClause,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
            photos: true,
            tags: true,
            user: true,
        },
    })

    if (allSlips.length === 0) {
        return (
            <div>
                <header className="mb-8">
                    <h1 className="text-2xl font-bold mb-2 text-brand-navy">
                        Welcome to Slips Vault, {session.user.name || 'User'}!
                    </h1>
                    <p className="text-gray-600">Let&apos;s get your financial tracking started.</p>
                </header>

                <div className="card bg-white border-2 border-dashed border-brand-teal/20 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm">
                    <div className="w-24 h-24 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-6 text-brand-teal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-brand-navy mb-3">Your vault is empty</h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                        Upload your first slip to unlock powerful AI insights, expense tracking, and secure storage. It only takes a few seconds!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/dashboard/create" className="btn bg-brand-teal hover:bg-[#2a8c8e] text-white border-none px-8 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                            <Plus size={20} />
                            Upload First Slip
                        </Link>
                    </div>

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="font-bold text-brand-navy mb-1">📸 Snap &amp; Store</div>
                            <div className="text-xs text-gray-500">Take a photo of any receipt and we&apos;ll store it securely forever.</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="font-bold text-brand-navy mb-1">🤖 AI Analysis</div>
                            <div className="text-xs text-gray-500">Our AI automatically extracts dates, amounts, and merchants.</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="font-bold text-brand-navy mb-1">📊 Smart Insights</div>
                            <div className="text-xs text-gray-500">Get instant analytics on your spending habits.</div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Build canonical supplier mapping across all slips
    const rawSupplierNames = allSlips.map((s) => getRawSlipSupplier(s))
    const canonicalSupplierMap = buildCanonicalSupplierMap(rawSupplierNames)
    const getCanonicalSupplier = (slip: (typeof allSlips)[number]) => {
        const raw = getRawSlipSupplier(slip)
        return canonicalSupplierMap.get(raw.toLowerCase()) || raw
    }

    // Group all slips by canonical YYYY-MM month key for timeline & monthly breakdown
    const monthTotalsMap = new Map<
        string,
        {
            monthKey: string
            total: number
            count: number
            categories: Record<string, number>
            suppliers: Record<string, number>
        }
    >()
    const allCategoriesSet = new Set<string>()
    const globalTagAmounts: Record<string, number> = {}

    for (const slip of allSlips) {
        const monthKey = getSlipMonthKey(slip)
        const amount = slip.amountAfterTax || 0
        const supplierName = getCanonicalSupplier(slip)

        let entry = monthTotalsMap.get(monthKey)
        if (!entry) {
            entry = {
                monthKey,
                total: 0,
                count: 0,
                categories: {},
                suppliers: {},
            }
            monthTotalsMap.set(monthKey, entry)
        }

        entry.total += amount
        entry.count += 1
        entry.suppliers[supplierName] = (entry.suppliers[supplierName] || 0) + amount

        if (slip.tags.length > 0) {
            const amountPerTag = amount / slip.tags.length
            for (const tag of slip.tags) {
                entry.categories[tag.name] = (entry.categories[tag.name] || 0) + amountPerTag
                globalTagAmounts[tag.name] = (globalTagAmounts[tag.name] || 0) + amountPerTag
                allCategoriesSet.add(tag.name)
            }
        } else {
            entry.categories['Uncategorized'] = (entry.categories['Uncategorized'] || 0) + amount
            globalTagAmounts['Uncategorized'] = (globalTagAmounts['Uncategorized'] || 0) + amount
            allCategoriesSet.add('Uncategorized')
        }
    }

    const sortedCategories = Array.from(allCategoriesSet).sort(
        (a, b) => (globalTagAmounts[b] || 0) - (globalTagAmounts[a] || 0)
    )

    // Sort months chronologically (oldest -> newest) for the bar chart
    const sortedMonthKeysAsc = Array.from(monthTotalsMap.keys()).sort((a, b) =>
        a.localeCompare(b)
    )
    // And newest -> oldest for the monthly filter pills & table
    const sortedMonthKeysDesc = [...sortedMonthKeysAsc].reverse()

    const timelineData = sortedMonthKeysAsc.map((mKey) => {
        const entry = monthTotalsMap.get(mKey)!
        const row: { monthKey: string; name: string; total: number; [k: string]: any } = {
            monthKey: mKey,
            name: formatMonthKey(mKey, 'short'),
            total: Number(entry.total.toFixed(2)),
        }
        for (const cat of sortedCategories) {
            row[cat] = Number((entry.categories[cat] || 0).toFixed(2))
        }
        return row
    })

    // Filter slips by `activeMonth` if a month is selected on the dashboard
    const scopedSlips = activeMonth
        ? allSlips.filter((s) => getSlipMonthKey(s) === activeMonth)
        : allSlips

    const totalSlips = scopedSlips.length
    const totalValue = scopedSlips.reduce((sum, slip) => sum + (slip.amountAfterTax || 0), 0)
    const averageValue = totalSlips > 0 ? totalValue / totalSlips : 0

    // Calculate Category & Supplier breakdown for the active scope
    const scopedTagAmounts: Record<string, number> = {}
    const scopedSupplierStats: Record<string, { amount: number; count: number }> = {}

    for (const slip of scopedSlips) {
        const amount = slip.amountAfterTax || 0
        const supName = getCanonicalSupplier(slip)
        if (!scopedSupplierStats[supName]) {
            scopedSupplierStats[supName] = { amount: 0, count: 0 }
        }
        scopedSupplierStats[supName].amount += amount
        scopedSupplierStats[supName].count += 1

        if (slip.tags.length > 0) {
            const perTag = amount / slip.tags.length
            for (const tag of slip.tags) {
                scopedTagAmounts[tag.name] = (scopedTagAmounts[tag.name] || 0) + perTag
            }
        } else {
            scopedTagAmounts['Uncategorized'] = (scopedTagAmounts['Uncategorized'] || 0) + amount
        }
    }

    const categoryData = Object.entries(scopedTagAmounts)
        .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7)

    const topCategoryEntry = categoryData[0] || null
    const topSuppliers = Object.entries(scopedSupplierStats)
        .map(([name, stats]) => ({
            name,
            amount: stats.amount,
            count: stats.count,
        }))
        .sort((a, b) => b.amount - a.amount)

    const topSupplierEntry = topSuppliers[0] || null
    const displayedSlips = scopedSlips.slice(0, 6)

    return (
        <div>
            {/* Header & Quick Actions */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold mb-1 text-brand-navy">
                        Welcome back, {session.user.name || 'User'}
                        {session.user.companyName && (
                            <span className="text-brand-teal"> from {session.user.companyName}</span>
                        )}
                        !
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {activeMonth
                            ? `Showing spend & insights for ${formatMonthKey(activeMonth, 'long')}`
                            : "Here's an overview of your spending by month, supplier, and category."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard/suppliers"
                        className="btn btn-sm btn-outline border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white rounded-xl normal-case flex items-center gap-1.5"
                    >
                        <Store size={16} />
                        Suppliers Spend
                    </Link>
                    <Link
                        href="/dashboard/create"
                        className="btn btn-sm bg-brand-navy hover:bg-[#0d2e4d] text-white border-none rounded-xl normal-case flex items-center gap-1.5"
                    >
                        <Plus size={16} />
                        New Slip
                    </Link>
                </div>
            </header>

            {/* Month Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3.5 mb-6 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1 mr-1">
                        <Calendar size={14} className="text-brand-teal" />
                        Period:
                    </span>
                    <Link
                        href="/dashboard"
                        className={`btn btn-xs rounded-full normal-case ${
                            !activeMonth
                                ? 'bg-brand-navy text-white border-brand-navy hover:bg-brand-navy'
                                : 'btn-outline border-gray-200 text-gray-600 hover:border-brand-navy'
                        }`}
                    >
                        All Time ({allSlips.length})
                    </Link>
                    {sortedMonthKeysDesc.map((mKey) => {
                        const mEntry = monthTotalsMap.get(mKey)!
                        const isSelected = activeMonth === mKey
                        return (
                            <Link
                                key={mKey}
                                href={
                                    isSelected
                                        ? '/dashboard'
                                        : `/dashboard?month=${encodeURIComponent(mKey)}`
                                }
                                className={`btn btn-xs rounded-full normal-case ${
                                    isSelected
                                        ? 'bg-brand-teal text-white border-brand-teal hover:bg-brand-teal'
                                        : 'btn-outline border-gray-200 text-gray-600 hover:border-brand-teal'
                                }`}
                            >
                                {formatMonthKey(mKey, 'short')} ({mEntry.count})
                            </Link>
                        )
                    })}
                </div>
                {activeMonth && (
                    <Link
                        href="/dashboard"
                        className="btn btn-xs btn-ghost text-red-500 hover:bg-red-50 rounded-full normal-case flex items-center gap-1"
                    >
                        <X size={13} />
                        Clear Month Filter
                    </Link>
                )}
            </div>

            {/* KPI Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">
                            {activeMonth ? `Spend (${formatMonthKey(activeMonth, 'short')})` : 'Total Spend'}
                        </h3>
                        <div className="text-2xl font-bold text-brand-navy font-mono">
                            R{totalValue.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            {totalSlips} {totalSlips === 1 ? 'slip' : 'slips'} • Avg R{averageValue.toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Top Supplier</h3>
                        <div
                            className="text-lg font-bold text-brand-teal truncate"
                            title={topSupplierEntry ? topSupplierEntry.name : 'N/A'}
                        >
                            {topSupplierEntry ? topSupplierEntry.name : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">
                            {topSupplierEntry
                                ? `R${topSupplierEntry.amount.toFixed(2)} (${topSupplierEntry.count} ${
                                      topSupplierEntry.count === 1 ? 'slip' : 'slips'
                                  })`
                                : 'No supplier data'}
                        </div>
                    </div>
                </div>

                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Top Category</h3>
                        <div
                            className="text-lg font-bold text-gray-900 truncate"
                            title={topCategoryEntry ? topCategoryEntry.name : 'N/A'}
                        >
                            {topCategoryEntry ? topCategoryEntry.name : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">
                            {topCategoryEntry ? `R${topCategoryEntry.value.toFixed(2)}` : 'No category data'}
                        </div>
                    </div>
                </div>

                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Active Suppliers</h3>
                        <div className="text-2xl font-bold text-gray-900">{topSuppliers.length}</div>
                        <Link
                            href={
                                activeMonth
                                    ? `/dashboard/suppliers?month=${encodeURIComponent(activeMonth)}`
                                    : '/dashboard/suppliers'
                            }
                            className="text-xs text-brand-teal hover:underline font-medium mt-0.5 inline-flex items-center gap-1"
                        >
                            View all suppliers <ArrowRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <DashboardCharts
                categoryData={categoryData}
                timelineData={timelineData}
                categories={sortedCategories}
                activeMonth={activeMonth}
            />

            {/* Monthly Breakdown & Top Suppliers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Spend Grouped by Month */}
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-base font-bold text-brand-navy flex items-center gap-2">
                                    <Calendar size={18} className="text-brand-teal" />
                                    Spend Grouped by Month
                                </h2>
                                <p className="text-xs text-gray-400">
                                    Click any month to inspect its suppliers and slips
                                </p>
                            </div>
                            <Link
                                href="/dashboard/suppliers?view=monthly"
                                className="text-xs font-medium text-brand-teal hover:underline flex items-center gap-1"
                            >
                                Monthly Suppliers <ArrowRight size={12} />
                            </Link>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {sortedMonthKeysDesc.map((mKey) => {
                                const mEntry = monthTotalsMap.get(mKey)!
                                const topSupInMonth = Object.entries(mEntry.suppliers).sort(
                                    (a, b) => b[1] - a[1]
                                )[0]
                                const isSelected = activeMonth === mKey

                                return (
                                    <div
                                        key={mKey}
                                        className={`py-3 px-2 rounded-lg transition-colors flex items-center justify-between gap-3 ${
                                            isSelected ? 'bg-brand-teal/5' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={
                                                        isSelected
                                                            ? '/dashboard'
                                                            : `/dashboard?month=${encodeURIComponent(mKey)}`
                                                    }
                                                    className="font-bold text-brand-navy hover:text-brand-teal text-sm"
                                                >
                                                    {formatMonthKey(mKey, 'long')}
                                                </Link>
                                                <span className="badge badge-xs bg-gray-100 text-gray-600 border-none">
                                                    {mEntry.count} {mEntry.count === 1 ? 'slip' : 'slips'}
                                                </span>
                                            </div>
                                            {topSupInMonth && (
                                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                                    Top supplier: <strong>{topSupInMonth[0]}</strong> (R
                                                    {topSupInMonth[1].toFixed(2)})
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <div className="font-mono font-bold text-brand-navy text-sm">
                                                    R{mEntry.total.toFixed(2)}
                                                </div>
                                            </div>
                                            <Link
                                                href={`/dashboard/suppliers?month=${encodeURIComponent(mKey)}`}
                                                className="btn btn-xs btn-ghost text-brand-teal hover:bg-brand-teal/10 normal-case"
                                                title="View suppliers for this month"
                                            >
                                                Suppliers
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Top Suppliers in Selected Period */}
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-base font-bold text-brand-navy flex items-center gap-2">
                                    <Store size={18} className="text-brand-teal" />
                                    Top Suppliers {activeMonth ? `(${formatMonthKey(activeMonth, 'short')})` : ''}
                                </h2>
                                <p className="text-xs text-gray-400">
                                    Automatically grouped across matching merchant branches
                                </p>
                            </div>
                            <Link
                                href={
                                    activeMonth
                                        ? `/dashboard/suppliers?month=${encodeURIComponent(activeMonth)}`
                                        : '/dashboard/suppliers'
                                }
                                className="text-xs font-medium text-brand-teal hover:underline flex items-center gap-1"
                            >
                                View All <ArrowRight size={12} />
                            </Link>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {topSuppliers.slice(0, 6).map((sup) => {
                                const pct =
                                    totalValue > 0
                                        ? Math.min(100, Math.round((sup.amount / totalValue) * 100))
                                        : 0
                                return (
                                    <div
                                        key={sup.name}
                                        className="py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <Link
                                                    href={`/dashboard/suppliers?supplier=${encodeURIComponent(sup.name)}${
                                                        activeMonth ? `&month=${encodeURIComponent(activeMonth)}` : ''
                                                    }`}
                                                    className="font-bold text-brand-navy hover:text-brand-teal text-sm truncate"
                                                >
                                                    {sup.name}
                                                </Link>
                                                <span className="font-mono font-bold text-brand-navy text-sm shrink-0 ml-2">
                                                    R{sup.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="bg-brand-teal h-1.5 rounded-full"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400 shrink-0">
                                                    {sup.count} {sup.count === 1 ? 'slip' : 'slips'} ({pct}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent / Filtered Slips */}
            <section className="mb-20 md:mb-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold m-0 text-brand-navy">
                        {activeMonth
                            ? `Slips in ${formatMonthKey(activeMonth, 'long')}`
                            : 'Recent Uploads'}
                    </h2>
                    <Link
                        href={
                            activeMonth
                                ? `/dashboard/slips?month=${encodeURIComponent(activeMonth)}`
                                : '/dashboard/slips'
                        }
                        className="text-brand-teal hover:underline font-medium text-sm"
                    >
                        View All ({scopedSlips.length})
                    </Link>
                </div>

                <SlipList slips={displayedSlips} isFiltered={!!activeMonth} />
            </section>

            {/* Floating Action Button */}
            <Link
                href="/dashboard/create"
                className="fixed bottom-24 right-4 md:hidden w-14 h-14 bg-brand-navy rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#0d2e4d] transition-colors z-50"
            >
                <Plus size={24} />
            </Link>
        </div>
    )
}
