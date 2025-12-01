import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import InviteUserForm from '../settings/InviteUserForm'
import UserList from './UserList'

export default async function PreferencesPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null
    }

    const isCompanyAdmin = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ADMIN') && session.user.companyId

    let companyUsers: any[] = []
    if (isCompanyAdmin && session.user.companyId) {
        companyUsers = await prisma.user.findMany({
            where: {
                companyId: session.user.companyId
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    }

    return (
        <div className="min-h-screen bg-brand-light flex flex-col">
            {/* Header */}
            <div className="bg-brand-navy pt-8 pb-12 px-6 rounded-b-[2.5rem] shadow-lg">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/dashboard/settings" className="text-white/80 hover:text-white transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Company Preferences</h1>
                    </div>
                    {session.user.companyName && (
                        <p className="text-brand-teal font-medium">{session.user.companyName}</p>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 -mt-8">
                <div className="max-w-3xl mx-auto w-full space-y-6">

                    {isCompanyAdmin ? (
                        <>
                            <InviteUserForm />
                            <UserList users={companyUsers} />
                        </>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                            <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🔒</span>
                            </div>
                            <h2 className="text-xl font-bold text-brand-navy mb-2">Access Restricted</h2>
                            <p className="text-gray-500">
                                Only company administrators can access these settings.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
