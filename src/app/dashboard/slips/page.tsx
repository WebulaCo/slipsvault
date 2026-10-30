import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SlipList from "@/app/components/SlipList"
import SlipFilters from "@/app/components/SlipFilters"
import { resolveCategoryFilter } from "@/lib/categories"
import {
    buildCanonicalSupplierMap,
    formatMonthKey,
    getRawSlipSupplier,
    getSlipMonthKey,
    isSameSupplier,
} from "@/lib/suppliers"
import { ChevronLeft, Plus, Store } from "lucide-react"
import Link from "next/link"

interface AllSlipsPageProps {
    searchParams: Promise<{
        q?: string
        start?: string
        end?: string
        month?: string
        supplier?: string
        category?: string
        tag?: string
        contributor?: string
    }>
}

export default async function AllSlipsPage({ searchParams }: AllSlipsPageProps) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null
    }

    const { q, start, end, month, supplier, category, tag, contributor } = await searchParams
    const query = (q || '').trim().toLowerCase()
    const activeCategory = category || tag || ''
    const activeSupplier = supplier && supplier !== 'all' ? supplier : ''
    const activeMonth = month && month !== 'all' ? month : ''

    const isCompanyView =
        (session.user.role === 'COMPANY_ADMIN' ||
            session.user.role === 'ACCOUNTANT' ||
            session.user.role === 'ADMIN') &&
        session.user.companyId

    const baseScope: any = isCompanyView
        ? { user: { companyId: session.user.companyId } }
        : { userId: session.user.id }

    const allSlips = await prisma.slip.findMany({
        where: baseScope,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
            photos: true,
            tags: true,
            user: true,
        },
    })

    // Build canonical supplier list and available months from all slips in scope
    const rawSupplierNames = allSlips.map((s) => getRawSlipSupplier(s))
    const canonicalMap = buildCanonicalSupplierMap(rawSupplierNames)
    const getCanonicalSupplier = (slip: (typeof allSlips)[number]): string => {
        const raw = getRawSlipSupplier(slip)
        return canonicalMap.get(raw.toLowerCase()) || raw
    }

    const suppliers = Array.from(new Set(allSlips.map(getCanonicalSupplier))).sort((a, b) =>
        a.localeCompare(b)
    )

    const monthCountsMap = new Map<string, number>()
    for (const s of allSlips) {
        const mKey = getSlipMonthKey(s)
        monthCountsMap.set(mKey, (monthCountsMap.get(mKey) || 0) + 1)
    }

    const availableMonths = Array.from(monthCountsMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([mKey, count]) => ({
            value: mKey,
            label: formatMonthKey(mKey, 'long'),
            count,
        }))

    const targetCategories =
        activeCategory && activeCategory !== 'All' && activeCategory !== 'all'
            ? resolveCategoryFilter(activeCategory).map((c) => c.toLowerCase())
            : []

    const startTime = start ? new Date(start).getTime() : null
    const endTime = end ? new Date(end).getTime() : null

    const slips = allSlips.filter((slip) => {
        if (contributor && contributor !== 'all' && isCompanyView) {
            if (slip.userId !== contributor) return false
        }

        if (activeSupplier) {
            const canonSup = getCanonicalSupplier(slip)
            const rawSup = getRawSlipSupplier(slip)
            if (
                canonSup.toLowerCase() !== activeSupplier.toLowerCase() &&
                !isSameSupplier(canonSup, activeSupplier) &&
                !isSameSupplier(rawSup, activeSupplier)
            ) {
                return false
            }
        }

        if (activeMonth) {
            if (getSlipMonthKey(slip) !== activeMonth) return false
        } else if (startTime || endTime) {
            const effDate = slip.date ? new Date(slip.date) : new Date(slip.createdAt)
            const effTime = effDate.getTime()
            if (startTime && effTime < startTime) return false
            if (endTime && effTime > endTime) return false
        }

        if (targetCategories.length > 0) {
            const hasMatchingTag = slip.tags.some((t) =>
                targetCategories.includes(t.name.toLowerCase())
            )
            if (!hasMatchingTag) return false
        }

        if (query) {
            const haystack = [
                getCanonicalSupplier(slip),
                slip.title || '',
                slip.place || '',
                slip.summary || '',
                slip.content || '',
                ...slip.tags.map((t) => t.name),
            ]
                .join(' ')
                .toLowerCase()
            if (!haystack.includes(query)) return false
        }

        return true
    })

    let companyUsers: any[] = []
    if (isCompanyView) {
        companyUsers = await prisma.user.findMany({
            where: { companyId: session.user.companyId },
            select: { id: true, name: true, email: true },
        })
    }

    const isFiltered = !!(
        query ||
        start ||
        end ||
        activeMonth ||
        activeSupplier ||
        targetCategories.length > 0 ||
        (contributor && contributor !== 'all')
    )

    const totalSpend = slips.reduce((sum, s) => sum + (s.amountAfterTax || 0), 0)
    const averageSpend = slips.length > 0 ? totalSpend / slips.length : 0

    return (
        <div className="pb-20">
            {/* Header */}
            <header className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-brand-teal">
                    <Link href="/dashboard" className="flex items-center gap-1 font-medium">
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                </div>
                <h1 className="text-xl font-bold text-brand-navy">All Slips &amp; Search</h1>
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard/suppliers"
                        className="btn btn-sm btn-outline border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white rounded-full normal-case hidden sm:inline-flex items-center gap-1.5"
                    >
                        <Store size={16} />
                        Suppliers Spend
                    </Link>
                    <Link
                        href="/dashboard/create"
                        className="w-10 h-10 bg-brand-navy rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#0d2e4d] transition-colors"
                    >
                        <Plus size={24} />
                    </Link>
                </div>
            </header>

            {/* Filter Chips */}
            <SlipFilters
                companyUsers={companyUsers}
                isCompanyView={!!isCompanyView}
                suppliers={suppliers}
                availableMonths={availableMonths}
            />

            {/* Spend Summary Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                        {activeSupplier
                            ? `Spend at ${activeSupplier}`
                            : isFiltered
                            ? 'Filtered Spend Summary'
                            : 'Total Vault Spend'}
                        {activeMonth ? ` • ${formatMonthKey(activeMonth, 'long')}` : ''}
                    </div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-2xl font-bold text-brand-navy font-mono">
                            R{totalSpend.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500">
                            across <strong>{slips.length}</strong>{' '}
                            {slips.length === 1 ? 'slip' : 'slips'}
                            {slips.length > 0 && ` (avg R${averageSpend.toFixed(2)})`}
                        </span>
                    </div>
                </div>
                <Link
                    href={
                        activeMonth
                            ? `/dashboard/suppliers?month=${encodeURIComponent(activeMonth)}`
                            : '/dashboard/suppliers'
                    }
                    className="btn btn-sm bg-brand-teal/10 hover:bg-brand-teal text-brand-teal hover:text-white border-none rounded-xl normal-case flex items-center gap-2 self-start sm:self-center"
                >
                    <Store size={16} />
                    View Breakdown by Supplier
                </Link>
            </div>

            {/* Slips List */}
            <SlipList slips={slips} isFiltered={isFiltered} />
        </div>
    )
}
