import Sidebar from '@/app/components/Sidebar'
import TopBar from '@/app/components/TopBar'
import MobileNav from '@/app/components/MobileNav'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect('/login')
    }

    const tags = await prisma.tag.findMany({
        where: {
            userId: session.user.id,
            slips: { some: {} } // Only fetch tags that have at least one slip
        },
        orderBy: {
            slips: {
                _count: 'desc' // Sort by popularity (most slips first)
            }
        }
    })

    const unreadNotificationsCount = await prisma.notification.count({
        where: {
            userId: session.user.id,
            read: false
        }
    })

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Top Bar */}
            <TopBar user={session.user} />

            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar user={session.user} tags={tags} unreadNotificationsCount={unreadNotificationsCount} />
            </div>

            {/* Main Content */}
            <main className="md:ml-80 p-4 md:p-8 min-h-screen pt-20 pb-24 md:pt-8 md:pb-8">
                <div className="container mx-auto max-w-7xl">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <MobileNav unreadNotificationsCount={unreadNotificationsCount} />
        </div>
    )
}
