import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SlipList from "@/app/components/SlipList"
import SlipFilters from "@/app/components/SlipFilters"
import { resolveCategoryFilter } from "@/lib/categories"
import { ChevronLeft, Plus, Store, Calendar } from "lucide-react"
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
    const query = q || ''
    const activeCategory = category || tag || ''

    const isCompanyView = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ACCOUNTANT' || session.user.role === 'ADMIN') && session.user.companyId

    const baseScope: any = isCompanyView
        ? { user: { companyId: session.user.companyId } }
        : { userId: session.user.id }

    const andConditions: any[] = [baseScope]

    if (query) {
        andConditions.push({
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { place: { contains: query, mode: 'insensitive' } },
                { summary: { contains: query, mode: 'insensitive' } },
                { tags: { some: { name: { contains: query, mode: 'insensitive' } } } },
            ],
        })
    }

    if (supplier && supplier !== 'all') {
        andConditions.push({
            OR: [
                { title: { equals: supplier, mode: 'insensitive' } },
                { place: { equals: supplier, mode: 'insensitive' } },
                { title: { contains: supplier, mode: 'insensitive' } },
                { place: { contains: supplier, mode: 'insensitive' } },
            ],
        })
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [year, mon] = month.split('-').map(Number)
        const monthStart = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0))
        const monthEnd = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999))
        andConditions.push({
            date: {
                gte: monthStart,
                lte: monthEnd,
            },
        })
    } else if (start || end) {
        const dateFilter: any = {}
        if (start) dateFilter.gte = new Date(start)
        if (end) dateFilter.lte = new Date(end)
        andConditions.push({ date: dateFilter })
    }

    if (activeCategory && activeCategory !== 'All' && activeCategory !== 'all') {
        const targetCategories = resolveCategoryFilter(activeCategory)
        andConditions.push({
            tags: {
                some: {
                    OR: targetCategories.map((catName) => ({
                        name: { equals: catName, mode: 'insensitive' },
                    })),
                },
            },
        })
    }

    if (contributor && contributor !== 'all' && isCompanyView) {
        andConditions.push({ userId: contributor })
    }

    const whereClause = andConditions.length === 1 ? baseScope : { AND: andConditions }

    const [slips, allSupplierRows] = await Promise.all([
        prisma.slip.findMany({
            where: whereClause,
            orderBy: {
                date: 'desc',
            },
            include: {
                photos: true,
                tags: true,
                user: true,
            },
        }),
        prisma.slip.findMany({
            where: baseScope,
            select: {
                title: true,
                place: true,
            },
        }),
    ])

    // Build deduplicated list of supplier names (case-insensitive)
    const supplierMap = new Map<string, string>()
    for (const row of allSupplierRows) {
        const raw = (row.place || row.title || '').trim()
        if (!raw) continue
        const key = raw.toLowerCase()
        if (!supplierMap.has(key)) {
            supplierMap.set(key, raw)
        }
    }
    const suppliers = Array.from(supplierMap.values()).sort((a, b) => a.localeCompare(b))

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
        month ||
        (supplier && supplier !== 'all') ||
        (activeCategory && activeCategory !== 'All' && activeCategory !== 'all') ||
        (contributor && contributor !== 'all')
    )

    const totalSpend = slips.reduce((sum, s) => sum + (s.amountAfterTax || 0), 0)
    const averageSpend = slips.length > 0 ? totalSpend / slips.length : 0

    const formatMonthDisplay = (yyyyMm: string) => {
        const [y, m] = yyyyMm.split('-').map(Number)
        if (!y || !m) return yyyyMm
        return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    }

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
                <h1 className="text-xl font-bold text-brand-navy">All Slips</h1>
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
            />

            {/* Spend Summary Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                        {supplier && supplier !== 'all'
                            ? `Spend at ${supplier}`
                            : isFiltered
                            ? 'Filtered Spend Summary'
                            : 'Total Vault Spend'}
                        {month ? ` • ${formatMonthDisplay(month)}` : ''}
                    </div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-2xl font-bold text-brand-navy font-mono">
                            R{totalSpend.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500">
                            across <strong>{slips.length}</strong> {slips.length === 1 ? 'slip' : 'slips'}
                            {slips.length > 0 && ` (avg R${averageSpend.toFixed(2)})`}
                        </span>
                    </div>
                </div>
                <Link
                    href={month ? `/dashboard/suppliers?month=${encodeURIComponent(month)}` : '/dashboard/suppliers'}
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
