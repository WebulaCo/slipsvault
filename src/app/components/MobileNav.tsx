'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Hash, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

export default function MobileNav() {
    const pathname = usePathname()

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'All Slips', href: '/dashboard/slips', icon: Receipt },
        // We can link to a tags page or just filter by tags. For now, let's keep it consistent with sidebar.
        // The sidebar links to /dashboard/slips?tag=... but here we might want a general tags view.
        // Let's assume there isn't a dedicated tags page yet, so maybe we just link to slips for now or omit if not ready.
        // The design shows "Tags", so let's point to a tags management page or similar. 
        // Since we don't have a tags page, let's point to slips with a hash or similar, or just /dashboard/slips for now.
        // Actually, the sidebar lists specific tags. A "Tags" tab might imply a list of tags. 
        // Let's create a placeholder link for now.
        { name: 'Tags', href: '/dashboard/tags', icon: Hash },
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
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-600' : 'text-gray-500'
                                }`}
                        >
                            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
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
