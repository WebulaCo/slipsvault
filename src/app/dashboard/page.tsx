import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SlipList from "@/app/components/SlipList"
import DashboardCharts from "@/app/components/DashboardCharts"
import { Calendar, Filter } from "lucide-react"

export default async function DashboardPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null // Middleware handles redirect
    }

    // Determine access level
    const isCompanyView = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ACCOUNTANT' || session.user.role === 'ADMIN') && session.user.companyId

    const whereClause = isCompanyView
        ? { user: { companyId: session.user.companyId } }
        : { userId: session.user.id }

    // Fetch recent slips (limit to 4 for the "Recent Uploads" view)
    const recentSlips = await prisma.slip.findMany({
        where: whereClause,
        orderBy: {
            createdAt: 'desc'
        },
        take: 4,
        include: {
            photos: true,
            tags: true,
            user: true
        }
    })

    // Fetch all slips for analytics
    const allSlips = await prisma.slip.findMany({
        where: whereClause,
        select: { amountAfterTax: true, tags: true, createdAt: true }
    })

    // Calculate Stats
    const totalSlips = allSlips.length
    const totalValue = allSlips.reduce((sum, slip) => sum + (slip.amountAfterTax || 0), 0)
    const averageValue = totalSlips > 0 ? totalValue / totalSlips : 0

    // Calculate Top Tag
    // Calculate Top Tag
    const tagCounts: Record<string, number> = {}
    const tagAmounts: Record<string, number> = {}

    allSlips.forEach(slip => {
        slip.tags.forEach(tag => {
            tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1
            tagAmounts[tag.name] = (tagAmounts[tag.name] || 0) + (slip.amountAfterTax || 0)
        })
    })
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    // Prepare Chart Data
    const categoryData = Object.entries(tagAmounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6) // Top 6 categories

    // Group by Month for Timeline
    const timelineMap: Record<string, number> = {}
    allSlips.forEach(slip => {
        const date = new Date(slip.createdAt)
        const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) // e.g., "Nov 25"
        timelineMap[key] = (timelineMap[key] || 0) + (slip.amountAfterTax || 0)
    })

    const timelineData = Object.entries(timelineMap)
        .map(([name, value]) => ({ name, value }))
        // Sort by date roughly (this is a simple sort, might need better logic for cross-year)
        .reverse()

    return (
        <div>
            <header className="mb-6">
                <h1 className="text-xl font-bold mb-1">
                    Welcome back, {session.user.name || 'User'}
                    {session.user.companyName && <span className="text-brand-teal"> from {session.user.companyName}</span>}!
                </h1>
                <p className="text-gray-500 text-sm">Here's an overview of your recent activity.</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Total Slips</h3>
                        <div className="text-2xl font-bold text-gray-900">{totalSlips}</div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Total Value</h3>
                        <div className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Average Slip</h3>
                        <div className="text-2xl font-bold text-gray-900">${averageValue.toFixed(2)}</div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Top Category</h3>
                        <div className="text-2xl font-bold text-gray-900 capitalize truncate" title={topTag}>{topTag}</div>
                    </div>
                </div>
            </div>

            <DashboardCharts categoryData={categoryData} timelineData={timelineData} />

            <section className="mb-20 md:mb-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold m-0 text-brand-navy">Recent Uploads</h2>
                    <a href="/dashboard/slips" className="text-brand-teal hover:underline font-medium text-sm">View All</a>
                </div>

                <SlipList slips={recentSlips} />
            </section>

            {/* Floating Action Button */}
            <a
                href="/dashboard/create"
                className="fixed bottom-20 right-4 md:hidden w-14 h-14 bg-brand-navy rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#0d2e4d] transition-colors z-40"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </a>
        </div>
    )
}

