'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'

interface TopBarProps {
    user: { name?: string | null, email?: string | null }
}

export default function TopBar({ user }: TopBarProps) {
    return (
        <div className="fixed top-0 left-0 right-0 bg-white z-50 md:hidden px-4 py-3 flex justify-between items-center border-b border-gray-100">
            <div className="flex items-center gap-2">
                <div className="bg-blue-500 text-white font-bold rounded px-2 py-1 text-sm">
                    SV
                </div>
                <span className="font-bold text-lg text-gray-900">SlipsVault</span>
            </div>
            <div className="flex items-center gap-4">
                <Link href="/dashboard/search" className="text-gray-500">
                    <Search size={24} />
                </Link>
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-medium">
                    {user.name?.[0] || 'U'}
                </div>
            </div>
        </div>
    )
}
