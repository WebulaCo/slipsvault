
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'
import InviteUserForm from '../settings/InviteUserForm'
import UserList from './UserList'
import LeaveCompanyButton from './LeaveCompanyButton'
import ResetPasswordForm from './ResetPasswordForm'

export default async function PreferencesPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null
    }

    const isCompanyAdmin = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ADMIN') && session.user.companyId
    const hasCompany = !!session.user.companyId

    let companyName = session.user.companyName
    if (!companyName && session.user.companyId) {
        const company = await prisma.company.findUnique({
            where: { id: session.user.companyId }
        })
        companyName = company?.name || null
    }

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
                    {companyName && (
                        <p className="text-brand-teal font-medium">{companyName}</p>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 -mt-8">
                <div className="max-w-3xl mx-auto w-full space-y-6">

                    {/* My Company Section - Visible to all company members */}
                    {hasCompany && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-2">
                                <Building2 size={20} className="text-brand-teal" />
                                My Company
                            </h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-gray-900">{companyName}</div>
                                    <div className="text-sm text-gray-500">
                                        Role: <span className="capitalize">{session.user.role.replace('_', ' ').toLowerCase()}</span>
                                    </div>
                                </div>
                                <LeaveCompanyButton />
                            </div>
                        </div>
                    )}

                    <ResetPasswordForm />

                    {/* Admin Section */}
                    {isCompanyAdmin && (
                        <>
                            <InviteUserForm />
                            <UserList users={companyUsers} />
                        </>
                    )}

                    {/* No Company State */}
                    {!hasCompany && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                            <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                                <Building2 size={32} className="text-brand-navy" />
                            </div>
                            <h2 className="text-xl font-bold text-brand-navy mb-2">No Company Associated</h2>
                            <p className="text-gray-500 mb-6">
                                You are not currently part of any company. Ask your administrator to invite you.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
