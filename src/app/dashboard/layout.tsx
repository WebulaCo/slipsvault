import Sidebar from '@/app/components/Sidebar'
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

    return (
        <div className="min-h-screen bg-base-100">
            <Sidebar user={session.user} tags={tags} />
            <main className="md:ml-80 p-4 md:p-8 min-h-screen pt-16 md:pt-8">
                <div className="container mx-auto max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    )
}
