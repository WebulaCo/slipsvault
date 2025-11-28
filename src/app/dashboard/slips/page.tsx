import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SlipList from "@/app/components/SlipList"
import SearchInput from "@/app/components/SearchInput"
import ExportButton from "@/app/components/ExportButton"
import { Filter, Calendar, ArrowUpDown, ChevronLeft, Plus, Search, SlidersHorizontal, ChevronRight, Receipt } from "lucide-react"
import Link from "next/link"
import AllSlipsList from "./AllSlipsList"

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
                <div className="flex items-center gap-2 text-brand-teal">
                    <Link href="/dashboard" className="flex items-center gap-1 font-medium">
                        <ChevronLeft size={20} />
                        Dashboard
                    </Link>
                </div>
                <h1 className="text-xl font-bold text-brand-navy">All Slips</h1>
                <Link href="/dashboard/create" className="w-10 h-10 bg-brand-navy rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#0d2e4d] transition-colors">
                    <Plus size={24} />
                </Link>
            </header>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by merchant, tag..."
                    className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-brand-teal focus:border-transparent"
                    defaultValue={query}
                />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
                <button className="flex items-center gap-2 bg-brand-teal text-white px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shadow-sm">
                    <SlidersHorizontal size={16} />
                    Filter
                </button>
                <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                    Date: All time
                </button>
                <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                    Amount
                </button>
            </div>

            {/* Slips List Grouped by Month */}
            <AllSlipsList slipsByMonth={slipsByMonth} />
        </div>
    )
}
