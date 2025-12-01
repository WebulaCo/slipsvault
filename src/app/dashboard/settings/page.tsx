'use client'

import { useSession, signOut } from 'next-auth/react'
import { User, Settings as SettingsIcon, LogOut, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
    const { data: session } = useSession()

    return (
        <div className="min-h-screen bg-brand-light flex flex-col">
            {/* Navy Header Section */}
            <div className="bg-brand-navy pt-8 pb-12 px-6 rounded-b-[2.5rem] shadow-lg">
                <div className="max-w-3xl mx-auto w-full">
                    <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-brand-teal flex items-center justify-center text-2xl font-bold text-white shadow-md border-2 border-white/20">
                            {session?.user?.name?.[0] || 'U'}
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-white">{session?.user?.name || 'User'}</h2>
                            <p className="text-blue-200 text-sm">{session?.user?.email}</p>
                            {session?.user?.companyName && (
                                <p className="text-brand-teal text-xs font-medium mt-1">{session.user.companyName}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 px-4 -mt-6">
                <div className="max-w-3xl mx-auto w-full">

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                        <Link href="/dashboard/account" className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <User size={22} className="text-gray-400 group-hover:text-brand-teal transition-colors" />
                                <span className="font-medium text-gray-700 group-hover:text-brand-navy transition-colors">Account</span>
                            </div>
                            <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-teal transition-colors" />
                        </Link>
                        <Link href="/dashboard/preferences" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-[22px]">
                                    <SettingsIcon size={22} className="text-gray-400 group-hover:text-brand-teal transition-colors" />
                                </div>
                                <span className="font-medium text-gray-700 group-hover:text-brand-navy transition-colors">Preferences</span>
                            </div>
                            <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-teal transition-colors" />
                        </Link>
                    </div>

                    {/* Logout Button */}
                    <div className="pb-8">
                        <button
                            onClick={() => signOut()}
                            className="w-full bg-white text-red-500 font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shadow-sm border border-gray-100"
                        >
                            <LogOut size={20} />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
