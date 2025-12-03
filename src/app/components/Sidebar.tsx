'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Search, Settings, LogOut, PlusCircle, Hash, Menu, X, Bell } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Logo from './Logo'

interface SidebarProps {
    user: { name?: string | null, email?: string | null }
    tags: { id: string, name: string }[]
    unreadNotificationsCount?: number
}

export default function Sidebar({ user, tags, unreadNotificationsCount = 0 }: SidebarProps) {
    const pathname = usePathname()

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'All Slips', href: '/dashboard/slips', icon: Receipt },
        { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ]

    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Mobile Header */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-[60] md:hidden flex items-center px-4 justify-between">
                <Link href="/dashboard" className="block">
                    <Logo showText={true} size={32} />
                </Link>
                <button
                    className="btn btn-square btn-ghost"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Menu size={24} />
                </button>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-50
                    w-80 p-4 flex flex-col transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="flex items-center gap-3 mb-8 px-2">
                    <Link href="/dashboard">
                        <Logo showText={true} size={32} />
                    </Link>
                    <button
                        className="btn btn-square btn-ghost btn-sm ml-auto md:hidden"
                        onClick={() => setIsOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <Link
                    href="/dashboard/create"
                    className="btn bg-brand-navy hover:bg-brand-navy-hover text-white w-full mb-6 border-none"
                    onClick={() => setIsOpen(false)}
                >
                    <PlusCircle size={20} />
                    Upload New Slip
                </Link>

                <ul className="menu bg-white w-full p-0 gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`${isActive ? 'bg-brand-navy text-white hover:bg-brand-navy-hover' : 'text-gray-700 hover:bg-gray-100'} flex justify-between`}
                                >
                                    <div className="flex items-center gap-2">
                                        <item.icon size={20} />
                                        {item.name}
                                    </div>
                                    {item.name === 'Notifications' && unreadNotificationsCount > 0 && (
                                        <span className={`badge badge-sm ${isActive ? 'badge-error text-white' : 'badge-error text-white'}`}>
                                            {unreadNotificationsCount}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        )
                    })}
                </ul>

                {tags.length > 0 && (
                    <div className="mt-8 flex-1 overflow-y-auto">
                        <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Tags
                        </h3>
                        <ul className="menu bg-white w-full p-0 gap-1 menu-sm">
                            {tags.map((tag) => (
                                <li key={tag.id}>
                                    <Link
                                        href={`/dashboard/slips?tag=${encodeURIComponent(tag.name)}`}
                                        onClick={() => setIsOpen(false)}
                                        className="text-gray-600 hover:bg-gray-100 hover:text-brand-navy"
                                    >
                                        <Hash size={16} />
                                        {tag.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="border-t border-gray-200 pt-4 mt-auto">
                    <Link href="/dashboard/settings" className="flex items-center gap-3 mb-4 px-2 hover:bg-gray-100 rounded-lg py-2 transition-colors">
                        <div className="avatar placeholder">
                            <div className="bg-brand-teal text-white rounded-full w-10">
                                <span className="text-xs">{user.name?.[0] || 'U'}</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-semibold truncate text-gray-900">
                                {user.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user.email}
                            </p>
                        </div>
                    </Link>

                    <button
                        onClick={() => signOut()}
                        className="btn btn-ghost btn-sm w-full justify-start gap-3 text-gray-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside >
        </>
    )
}
