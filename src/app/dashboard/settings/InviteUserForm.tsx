'use client'

import { useState } from 'react'
import { inviteUser } from '@/app/actions'
import { UserPlus, Mail, User, Shield } from 'lucide-react'

export default function InviteUserForm() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage(null)

        const result = await inviteUser(formData)

        if (result.success) {
            setMessage({ type: 'success', text: 'User invited successfully! Default password: password123' })
            const form = document.getElementById('invite-form') as HTMLFormElement
            form?.reset()
        } else {
            setMessage({ type: 'error', text: result.error || 'Failed to invite user' })
        }
        setLoading(false)
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-brand-teal" />
                Invite Team Member
            </h2>

            {message && (
                <div className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form id="invite-form" action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input name="name" type="text" required className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal focus:border-transparent" placeholder="John Doe" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input name="email" type="email" required className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal focus:border-transparent" placeholder="john@company.com" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <div className="relative">
                        <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select name="role" required className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal focus:border-transparent bg-white">
                            <option value="CONTRIBUTOR">Contributor (Can add/view own slips)</option>
                            <option value="ACCOUNTANT">Accountant (Read-only all slips)</option>
                            <option value="COMPANY_ADMIN">Admin (Full access)</option>
                        </select>
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-brand-navy text-white font-medium py-2 rounded-lg hover:bg-[#0d2e4d] transition-colors disabled:opacity-50">
                    {loading ? 'Inviting...' : 'Send Invitation'}
                </button>
            </form>
        </div>
    )
}
