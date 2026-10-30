import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SlipList from "@/app/components/SlipList"
import DashboardCharts from "@/app/components/DashboardCharts"
import DashboardMonthSelect from "@/app/components/DashboardMonthSelect"
import {
    buildCanonicalSupplierMap,
    formatMonthKey,
    getRawSlipSupplier,
    getSlipMonthKey,
} from "@/lib/suppliers"
import { formatAmount, sharedCurrency } from "@/lib/money"
import { Store, ArrowRight, Plus } from "lucide-react"
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

    const monthTotalsMap = new Map<string, { total: number; count: number }>()

    for (const slip of allSlips) {
        const monthKey = getSlipMonthKey(slip)
        const entry = monthTotalsMap.get(monthKey) || { total: 0, count: 0 }
        entry.total += slip.amountAfterTax || 0
        entry.count += 1
        monthTotalsMap.set(monthKey, entry)
    }

    const sortedMonthKeysDesc = Array.from(monthTotalsMap.keys()).sort((a, b) =>
        b.localeCompare(a)
    )

    // Filter slips by `activeMonth` if a month is selected on the dashboard
    const scopedSlips = activeMonth
        ? allSlips.filter((s) => getSlipMonthKey(s) === activeMonth)
        : allSlips

    const totalSlips = scopedSlips.length
    const totalValue = scopedSlips.reduce((sum, slip) => sum + (slip.amountAfterTax || 0), 0)

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

    const currency = sharedCurrency(scopedSlips.map((slip) => slip.currency))
    const monthOptions = sortedMonthKeysDesc.map((mKey) => ({
        value: mKey,
        label: `${formatMonthKey(mKey, 'long')} (${monthTotalsMap.get(mKey)!.count})`,
    }))
    const displayedSlips = scopedSlips.slice(0, 6)
    const supplierHref = activeMonth
        ? `/dashboard/suppliers?month=${encodeURIComponent(activeMonth)}`
        : '/dashboard/suppliers'

    return (
        <div>
            <header className="flex flex-col gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold mb-1 text-brand-navy">
                        Welcome back, {session.user.name || 'User'}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {activeMonth
                            ? formatMonthKey(activeMonth, 'long')
                            : 'Spend, categories, and a short look at suppliers.'}
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                        href="/dashboard/suppliers"
                        className="btn btn-sm btn-outline border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white rounded-xl normal-case min-h-11"
                    >
                        <Store size={16} />
                        Suppliers
                    </Link>
                    <Link
                        href="/dashboard/create"
                        className="btn btn-sm bg-brand-navy hover:bg-[#0d2e4d] text-white border-none rounded-xl normal-case min-h-11"
                    >
                        <Plus size={16} />
                        New slip
                    </Link>
                </div>
            </header>

            <DashboardMonthSelect months={monthOptions} activeMonth={activeMonth} />

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h2 className="text-xs font-medium text-gray-500 mb-1">Spend</h2>
                        <div className="text-xl font-bold text-brand-navy font-mono break-words">
                            {formatAmount(totalValue, currency)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            {totalSlips} {totalSlips === 1 ? 'slip' : 'slips'}
                        </div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h2 className="text-xs font-medium text-gray-500 mb-1">Top category</h2>
                        <div className="text-lg font-bold text-gray-900 truncate">
                            {topCategoryEntry ? topCategoryEntry.name : 'None'}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">
                            {topCategoryEntry ? formatAmount(topCategoryEntry.value, currency) : 'No categories'}
                        </div>
                    </div>
                </div>
            </div>

            <DashboardCharts categoryData={categoryData} currency={currency} />

            <section className="mb-8">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="text-base font-bold text-brand-navy m-0">Top suppliers</h2>
                    <Link href={supplierHref} className="text-sm text-brand-teal font-medium inline-flex items-center gap-1 min-h-11">
                        View all <ArrowRight size={14} />
                    </Link>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
                    {topSuppliers.slice(0, 3).map((supplier) => (
                        <Link
                            key={supplier.name}
                            href={`/dashboard/suppliers?supplier=${encodeURIComponent(supplier.name)}${
                                activeMonth ? `&month=${encodeURIComponent(activeMonth)}` : ''
                            }`}
                            className="flex items-center justify-between gap-3 p-4 min-h-11"
                        >
                            <span className="font-semibold text-brand-navy truncate">{supplier.name}</span>
                            <span className="font-mono text-sm text-brand-navy shrink-0">
                                {formatAmount(supplier.amount, currency)}
                                <span className="text-gray-400 font-sans"> · {supplier.count}</span>
                            </span>
                        </Link>
                    ))}
                    {topSuppliers.length === 0 && (
                        <p className="p-4 text-sm text-gray-400">No suppliers in this period.</p>
                    )}
                </div>
            </section>

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
