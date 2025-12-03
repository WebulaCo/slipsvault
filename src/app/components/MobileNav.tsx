'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Search, LogOut, Bell } from 'lucide-react'
import { signOut } from 'next-auth/react'

interface MobileNavProps {
    unreadNotificationsCount?: number
}

export default function MobileNav({ unreadNotificationsCount = 0 }: MobileNavProps) {
    const pathname = usePathname()

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'All Slips', href: '/dashboard/slips', icon: Receipt },
        { name: 'Search', href: '/dashboard/slips?mobile_filters=true', icon: Search },
        { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive ? 'text-blue-600' : 'text-gray-500'
                                }`}
                        >
                            <div className="relative">
                                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                {item.name === 'Notifications' && unreadNotificationsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    )
                })}
                <button
                    onClick={() => signOut()}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500"
                >
                    <LogOut size={24} />
                    <span className="text-[10px] font-medium">Logout</span>
                </button>
            </div>
        </div>
    )
}
