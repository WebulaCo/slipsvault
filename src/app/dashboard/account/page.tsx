'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { updateUser } from '@/app/actions'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function AccountPage() {
    const { data: session, update } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const formData = new FormData(e.currentTarget)

        try {
            const result = await updateUser(formData)
            if (result.success) {
                await update() // Update session
                setMessage({ type: 'success', text: 'Profile updated successfully' })
                router.refresh()
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to update profile' })
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-brand-light flex flex-col">
            {/* Header */}
            <header className="bg-brand-navy pt-8 pb-12 px-6 rounded-b-[2.5rem] shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/dashboard/settings" className="text-white/80 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 px-4 -mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {message && (
                            <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium text-gray-700">Name</span>
                            </label>
                            <input
                                name="name"
                                type="text"
                                defaultValue={session?.user?.name || ''}
                                className="input input-bordered w-full bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                placeholder="Your name"
                            />
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium text-gray-700">Company Name</span>
                            </label>
                            <input
                                name="companyName"
                                type="text"
                                defaultValue={session?.user?.companyName || ''}
                                className="input input-bordered w-full bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                placeholder="Your company"
                            />
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium text-gray-700">Email</span>
                            </label>
                            <input
                                type="email"
                                value={session?.user?.email || ''}
                                disabled
                                className="input input-bordered w-full bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <label className="label">
                                <span className="label-text-alt text-gray-400">Email cannot be changed</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full bg-brand-navy hover:bg-[#0d2e4d] border-none text-white h-12 text-lg flex items-center justify-center gap-2"
                        >
                            {loading ? <span className="loading loading-spinner loading-sm"></span> : (
                                <>
                                    <Save size={20} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
