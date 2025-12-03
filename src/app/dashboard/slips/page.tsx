import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SlipList from "@/app/components/SlipList"
import SearchInput from "@/app/components/SearchInput"
import ExportButton from "@/app/components/ExportButton"
import { Filter, Calendar, ArrowUpDown, ChevronLeft, Plus, SlidersHorizontal, ChevronRight, Receipt } from "lucide-react"
import Link from "next/link"


interface AllSlipsPageProps {
    searchParams: Promise<{
        q?: string
        start?: string
        end?: string
        category?: string
        contributor?: string
    }>
}

export default async function AllSlipsPage({ searchParams }: AllSlipsPageProps) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null
    }

    const { q, start, end, category, contributor } = await searchParams
    const query = q || ''

    const isCompanyView = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ACCOUNTANT' || session.user.role === 'ADMIN') && session.user.companyId

    const whereClause: any = isCompanyView
        ? { user: { companyId: session.user.companyId } }
        : { userId: session.user.id }

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

    if (contributor && isCompanyView) {
        whereClause.userId = contributor
    }

    const slips = await prisma.slip.findMany({
        where: whereClause,
        orderBy: {
            date: 'desc' // Order by date instead of createdAt
        },
        include: {
            photos: true,
            tags: true,
            user: true
        }
    })

    let companyUsers: any[] = []
    if (isCompanyView) {
        companyUsers = await prisma.user.findMany({
            where: { companyId: session.user.companyId },
            select: { id: true, name: true, email: true }
        })
    }

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
            <div className="mb-4">
                <SearchInput />
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
                {isCompanyView && (
                    <div className="dropdown">
                        <div tabIndex={0} role="button" className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border ${contributor ? 'bg-brand-teal/10 text-brand-teal border-brand-teal' : 'bg-white border-gray-200 text-gray-700'}`}>
                            Contributor: {contributor ? companyUsers.find(u => u.id === contributor)?.name || 'Unknown' : 'All'}
                        </div>
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                            <li><Link href="/dashboard/slips">All Contributors</Link></li>
                            {companyUsers.map(user => (
                                <li key={user.id}>
                                    <Link href={`/dashboard/slips?contributor=${user.id}`}>
                                        {user.name || user.email}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Slips List */}
            <SlipList slips={slips} />
        </div>
    )
}
