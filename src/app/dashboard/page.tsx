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
        select: { amountAfterTax: true, tags: true, createdAt: true, date: true }
    })

    // Calculate Stats
    const totalSlips = allSlips.length
    const totalValue = allSlips.reduce((sum, slip) => sum + (slip.amountAfterTax || 0), 0)
    const averageValue = totalSlips > 0 ? totalValue / totalSlips : 0

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

    // Group by Month for Timeline (Stacked)
    const timelineMap: Record<string, Record<string, number>> = {}
    const allCategories = new Set<string>()

    allSlips.forEach(slip => {
        // Use slip date if available, otherwise fallback to createdAt
        const date = slip.date ? new Date(slip.date) : new Date(slip.createdAt)
        const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) // e.g., "Nov 25"

        if (!timelineMap[key]) {
            timelineMap[key] = {}
        }

        // Distribute amount across tags (or assign to 'Uncategorized' if no tags)
        if (slip.tags.length > 0) {
            const amountPerTag = (slip.amountAfterTax || 0) / slip.tags.length
            slip.tags.forEach(tag => {
                timelineMap[key][tag.name] = (timelineMap[key][tag.name] || 0) + amountPerTag
                allCategories.add(tag.name)
            })
        } else {
            timelineMap[key]['Uncategorized'] = (timelineMap[key]['Uncategorized'] || 0) + (slip.amountAfterTax || 0)
            allCategories.add('Uncategorized')
        }
    })

    const timelineData = Object.entries(timelineMap)
        .map(([name, values]) => ({ name, ...values }))
        // Sort by date. Since keys are "MMM YY", we need to parse them to sort correctly.
        .sort((a, b) => {
            const dateA = new Date(Date.parse(`01 ${a.name.replace(' ', ' 20')}`)) // Hacky parsing "Nov 25" -> "Nov 2025"
            const dateB = new Date(Date.parse(`01 ${b.name.replace(' ', ' 20')}`))
            return dateA.getTime() - dateB.getTime()
        })

    // Sort categories to match the pie chart order (by total value) + others
    const sortedCategories = Array.from(allCategories).sort((a, b) => {
        const valA = tagAmounts[a] || 0
        const valB = tagAmounts[b] || 0
        return valB - valA
    })

    if (totalSlips === 0) {
        return (
            <div>
                <header className="mb-8">
                    <h1 className="text-2xl font-bold mb-2 text-brand-navy">
                        Welcome to Slips Vault, {session.user.name || 'User'}!
                    </h1>
                    <p className="text-gray-600">Let's get your financial tracking started.</p>
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
                        <a href="/dashboard/create" className="btn bg-brand-teal hover:bg-[#2a8c8e] text-white border-none px-8 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            Upload First Slip
                        </a>
                    </div>

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="font-bold text-brand-navy mb-1">📸 Snap & Store</div>
                            <div className="text-xs text-gray-500">Take a photo of any receipt and we'll store it securely forever.</div>
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
                        <div className="text-2xl font-bold text-gray-900">R{totalValue.toFixed(2)}</div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Average Slip</h3>
                        <div className="text-2xl font-bold text-gray-900">R{averageValue.toFixed(2)}</div>
                    </div>
                </div>
                <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                    <div className="card-body p-4">
                        <h3 className="text-xs font-medium text-gray-500 mb-1">Top Category</h3>
                        <div className="text-2xl font-bold text-gray-900 capitalize truncate" title={topTag}>{topTag}</div>
                    </div>
                </div>
            </div>

            <DashboardCharts
                categoryData={categoryData}
                timelineData={timelineData}
                categories={sortedCategories}
            />

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
                className="fixed bottom-24 right-4 md:hidden w-14 h-14 bg-brand-navy rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#0d2e4d] transition-colors z-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </a>
        </div>
    )
}

