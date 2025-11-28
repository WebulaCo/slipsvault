'use client'

import { useSession, signOut } from 'next-auth/react'
import { User, Settings as SettingsIcon, LogOut, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
    const { data: session } = useSession()

    return (
        <div className="min-h-screen bg-[#1a1f2e] text-white p-4 pb-24">
            <header className="flex items-center gap-4 mb-8 pt-4">
                <h1 className="text-2xl font-bold">Settings</h1>
            </header>

            {/* Profile Card */}
            <div className="bg-[#252a3a] rounded-xl p-4 mb-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold">
                    {session?.user?.name?.[0] || 'U'}
                </div>
                <div>
                    <h2 className="font-bold text-lg">{session?.user?.name || 'User'}</h2>
                    <p className="text-gray-400 text-sm">{session?.user?.email}</p>
                </div>
            </div>

            {/* Menu Items */}
            <div className="bg-[#252a3a] rounded-xl overflow-hidden mb-6">
                <Link href="/dashboard/account" className="flex items-center justify-between p-4 border-b border-gray-700 hover:bg-[#2f3545] transition-colors">
                    <div className="flex items-center gap-3">
                        <User size={20} className="text-gray-400" />
                        <span>Account</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-500" />
                </Link>
                <Link href="/dashboard/preferences" className="flex items-center justify-between p-4 hover:bg-[#2f3545] transition-colors">
                    <div className="flex items-center gap-3">
                        <SettingsIcon size={20} className="text-gray-400" />
                        <span>Preferences</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-500" />
                </Link>
            </div>

            {/* Logout Button */}
            <button
                onClick={() => signOut()}
                className="w-full bg-[#252a3a] text-red-400 font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#2f3545] transition-colors"
            >
                <LogOut size={20} />
                Logout
            </button>
        </div>
    )
}
