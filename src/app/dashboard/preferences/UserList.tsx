'use client'

import { User as UserIcon, Shield, Mail } from 'lucide-react'

interface User {
    id: string
    name: string | null
    email: string
    role: string
}

interface UserListProps {
    users: User[]
}

export default function UserList({ users }: UserListProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
                    <UserIcon size={20} className="text-brand-teal" />
                    Team Members
                </h2>
            </div>
            <div className="divide-y divide-gray-100">
                {users.map((user) => (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center text-brand-navy font-bold border border-brand-teal/20">
                                {user.name?.[0] || user.email[0].toUpperCase()}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{user.name || 'Unknown'}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                    <Mail size={12} />
                                    {user.email}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${user.role === 'COMPANY_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                    user.role === 'ACCOUNTANT' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                        'bg-green-50 text-green-700 border-green-100'
                                }`}>
                                {user.role.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                ))}
                {users.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No other users in this company yet.
                    </div>
                )}
            </div>
        </div>
    )
}
