'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Search, Settings, LogOut, PlusCircle, Hash, Menu, X } from 'lucide-react'
import { signOut } from 'next-auth/react'

interface SidebarProps {
    user: { name?: string | null, email?: string | null }
    tags: { id: string, name: string }[]
}

export default function Sidebar({ user, tags }: SidebarProps) {
    const pathname = usePathname()

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'All Slips', href: '/dashboard/slips', icon: Receipt },
        { name: 'Search', href: '/dashboard/search', icon: Search },
    ]

    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                className="btn btn-square btn-ghost fixed top-2 left-2 z-50 md:hidden"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Menu size={24} />
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed top-0 left-0 h-screen bg-base-200 border-r border-base-300 z-50
                    w-80 p-4 flex flex-col transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-content font-bold text-xl">
                        SV
                    </div>
                    <span className="text-xl font-bold">SlipsVault</span>
                    <button
                        className="btn btn-square btn-ghost btn-sm ml-auto md:hidden"
                        onClick={() => setIsOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <Link
                    href="/dashboard/create"
                    className="btn btn-primary w-full mb-6"
                    onClick={() => setIsOpen(false)}
                >
                    <PlusCircle size={20} />
                    Upload New Slip
                </Link>

                <ul className="menu bg-base-200 w-full p-0 gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={isActive ? 'active' : ''}
                                >
                                    <item.icon size={20} />
                                    {item.name}
                                </Link>
                            </li>
                        )
                    })}
                </ul>

                {tags.length > 0 && (
                    <div className="mt-8 flex-1 overflow-y-auto">
                        <h3 className="px-4 text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2">
                            Tags
                        </h3>
                        <ul className="menu bg-base-200 w-full p-0 gap-1 menu-sm">
                            {tags.map((tag) => (
                                <li key={tag.id}>
                                    <Link
                                        href={`/dashboard/slips?tag=${encodeURIComponent(tag.name)}`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Hash size={16} />
                                        {tag.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="border-t border-base-300 pt-4 mt-auto">
                    <Link href="/dashboard/settings" className="flex items-center gap-3 mb-4 px-2 hover:bg-base-300 rounded-lg py-2 transition-colors">
                        <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-10">
                                <span className="text-xs">{user.name?.[0] || 'U'}</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-semibold truncate">
                                {user.name || 'User'}
                            </p>
                            <p className="text-xs text-base-content/70 truncate">
                                {user.email}
                            </p>
                        </div>
                    </Link>

                    <button
                        onClick={() => signOut()}
                        className="btn btn-ghost btn-sm w-full justify-start gap-3 text-base-content/70 hover:text-error"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside >
        </>
    )
}
