'use client'

import { useState } from 'react'
import { resetPassword } from '@/app/actions'
import { Lock, KeyRound } from 'lucide-react'

export default function ResetPasswordForm() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage(null)

        const result = await resetPassword(formData)

        if (result.success) {
            setMessage({ type: 'success', text: 'Password updated successfully!' })
            const form = document.getElementById('reset-password-form') as HTMLFormElement
            form?.reset()
        } else {
            setMessage({ type: 'error', text: result.error || 'Failed to update password' })
        }
        setLoading(false)
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-2">
                <Lock size={20} className="text-brand-teal" />
                Reset Password
            </h2>

            {message && (
                <div className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form id="reset-password-form" action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                        <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal focus:border-transparent"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <div className="relative">
                        <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={6}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal focus:border-transparent"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-brand-navy text-white font-medium py-2 rounded-lg hover:bg-[#0d2e4d] transition-colors disabled:opacity-50">
                    {loading ? 'Updating Password...' : 'Update Password'}
                </button>
            </form>
        </div>
    )
}
