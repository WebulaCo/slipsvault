import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SlipList from "@/app/components/SlipList"
import SearchInput from "@/app/components/SearchInput"
import ExportButton from "@/app/components/ExportButton"
import { Filter, Calendar, ArrowUpDown, ChevronLeft, Plus, Search, SlidersHorizontal, ChevronRight, Receipt } from "lucide-react"
import Link from "next/link"

interface AllSlipsPageProps {
    searchParams: Promise<{
        q?: string
        start?: string
        end?: string
        category?: string
    }>
}

export default async function AllSlipsPage({ searchParams }: AllSlipsPageProps) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null
    }

    const { q, start, end, category } = await searchParams
    const query = q || ''

    const whereClause: any = {
        userId: session.user.id
    }

    if (query) {
        whereClause.OR = [
            { title: { contains: query } },
            { place: { contains: query } },
            { tags: { some: { name: { contains: query } } } }
        ]
    }

    if (start || end) {
        whereClause.date = {}
        if (start) whereClause.date.gte = new Date(start)
        if (end) whereClause.date.lte = new Date(end)
    }

    if (category && category !== 'All') {
        // Assuming Category maps to a Tag for now, as per the filter UI
        whereClause.tags = {
            some: {
                name: {
                    equals: category
                }
            }
        }
    }

    const slips = await prisma.slip.findMany({
        where: whereClause,
        orderBy: {
            date: 'desc' // Order by date instead of createdAt
        },
        include: {
            photos: true,
            tags: true
        }
    })

    // Group slips by month
    const slipsByMonth: Record<string, typeof slips> = {}
    slips.forEach(slip => {
        const date = new Date(slip.date || slip.createdAt)
        const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
        if (!slipsByMonth[monthYear]) {
            slipsByMonth[monthYear] = []
        }
        slipsByMonth[monthYear].push(slip)
    })

    return (
        <div className="pb-20">
            {/* Header */}
            <header className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-blue-600">
                    <Link href="/dashboard" className="flex items-center gap-1 font-medium">
                        <ChevronLeft size={20} />
                        Dashboard
                    </Link>
                </div>
                <h1 className="text-xl font-bold text-gray-900">All Slips</h1>
                <Link href="/dashboard/create" className="text-gray-900">
                    <Plus size={24} />
                </Link>
            </header>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by merchant, tag..."
                    className="w-full bg-gray-100 border-none rounded-lg py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    defaultValue={query}
                />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                    <SlidersHorizontal size={16} />
                    Filter
                </button>
                <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                    Date: All time
                </button>
                <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                    Amount
                </button>
            </div>

            {/* Slips List Grouped by Month */}
            <div className="space-y-6">
                {Object.entries(slipsByMonth).map(([month, monthSlips]) => (
                    <div key={month}>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{month}</h2>
                        <div className="bg-gray-50 rounded-xl overflow-hidden">
                            {monthSlips.map((slip, index) => (
                                <Link
                                    key={slip.id}
                                    href={`/dashboard/slips/${slip.id}`}
                                    className={`block p-4 hover:bg-gray-100 transition-colors ${index !== monthSlips.length - 1 ? 'border-b border-gray-100' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail */}
                                        <div className="flex-shrink-0">
                                            {slip.photos.length > 0 ? (
                                                <div className="w-12 h-12 rounded-lg bg-white overflow-hidden border border-gray-100">
                                                    <img
                                                        src={slip.photos[0].url.startsWith('http') ? slip.photos[0].url : `/uploads/${slip.photos[0].url.split('/').pop()}`}
                                                        alt={slip.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                                                    <Receipt size={20} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Middle: Title & Date */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate text-base">{slip.title}</h3>
                                            <div className="text-sm text-gray-500 mt-0.5">
                                                {slip.date ? new Date(slip.date).toLocaleDateString() : '-'}
                                            </div>
                                        </div>

                                        {/* Right: Amount & Tag & Chevron */}
                                        <div className="text-right flex-shrink-0 flex items-center gap-3">
                                            <div>
                                                <div className="font-bold text-gray-900 text-base">
                                                    ${slip.amountAfterTax?.toFixed(2)}
                                                </div>
                                                {slip.tags && slip.tags.length > 0 && (
                                                    <div className="mt-1 flex justify-end">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                            {slip.tags[0].name}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronRight size={20} className="text-gray-400" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
