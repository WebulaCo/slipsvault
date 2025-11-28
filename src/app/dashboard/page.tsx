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

    // Fetch recent slips (limit to 4 for the "Recent Uploads" view)
    const recentSlips = await prisma.slip.findMany({
        where: {
            userId: session.user.id
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 4,
        include: {
            photos: true,
            tags: true
        }
    })

    // Fetch all slips for analytics
    const allSlips = await prisma.slip.findMany({
        where: { userId: session.user.id },
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
            <header className="mb-10">
                <h1 className="text-4xl font-bold mb-2">Welcome back, {session.user.name || 'User'}!</h1>
                <p className="text-muted-foreground text-lg">Here's an overview of your recent activity.</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Slips</h3>
                        <div className="text-3xl font-bold">{totalSlips}</div>
                    </div>
                </div>
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Value</h3>
                        <div className="text-3xl font-bold">${totalValue.toFixed(2)}</div>
                    </div>
                </div>
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Average Slip</h3>
                        <div className="text-3xl font-bold">${averageValue.toFixed(2)}</div>
                    </div>
                </div>
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Top Category</h3>
                        <div className="text-3xl font-bold capitalize truncate" title={topTag}>{topTag}</div>
                    </div>
                </div>
            </div>

            <DashboardCharts categoryData={categoryData} timelineData={timelineData} />

            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold m-0">Recent Uploads</h2>
                    <a href="/dashboard/slips" className="text-primary hover:underline font-medium text-sm">View All</a>
                </div>

                <SlipList slips={recentSlips} />
            </section>
        </div>
    )
}

