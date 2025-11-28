'use client'

import { useSession, signOut } from 'next-auth/react'
import { User, Settings as SettingsIcon, LogOut, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
    const { data: session } = useSession()

    return (
        <div className="min-h-screen bg-brand-light text-gray-900 p-4 pb-24">
            <header className="flex items-center gap-4 mb-8 pt-4">
                <h1 className="text-2xl font-bold text-brand-navy">Settings</h1>
            </header>

            {/* Profile Card */}
            <div className="bg-white rounded-xl p-4 mb-6 flex items-center gap-4 shadow-sm border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-brand-navy flex items-center justify-center text-xl font-bold text-white">
                    {session?.user?.name?.[0] || 'U'}
                </div>
                <div>
                    <h2 className="font-bold text-lg text-brand-navy">{session?.user?.name || 'User'}</h2>
                    <p className="text-gray-500 text-sm">{session?.user?.email}</p>
                </div>
            </div>

            {/* Menu Items */}
            <div className="bg-white rounded-xl overflow-hidden mb-6 shadow-sm border border-gray-100">
                <Link href="/dashboard/account" className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <User size={20} className="text-brand-teal" />
                        <span className="font-medium text-gray-900">Account</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                </Link>
                <Link href="/dashboard/preferences" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <SettingsIcon size={20} className="text-brand-teal" />
                        <span className="font-medium text-gray-900">Preferences</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                </Link>
            </div>

            {/* Logout Button */}
            <button
                onClick={() => signOut()}
                className="w-full bg-white text-red-500 font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm border border-gray-100"
            >
                <LogOut size={20} />
                Logout
            </button>
        </div>
    )
}
