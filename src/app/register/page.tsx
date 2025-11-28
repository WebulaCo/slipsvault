'use client'

import { useState } from 'react'
import { registerUser } from '@/app/actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)

        try {
            const result = await registerUser(formData)
            if (result.success) {
                router.push('/login')
            } else {
                setError(result.error || 'Registration failed. Please try again.')
            }
        } catch (err: any) {
            setError('An unexpected error occurred.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-light p-4">
            <div className="card w-full max-w-md bg-white shadow-xl border border-gray-100">
                <div className="card-body">
                    <h1 className="text-2xl font-bold text-center mb-6 text-brand-navy">Create Account</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="alert alert-error text-sm py-2 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium text-gray-700">Name</span>
                            </label>
                            <input
                                name="name"
                                type="text"
                                className="input input-bordered w-full bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                required
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
                                className="input input-bordered w-full bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                placeholder="Your company (optional)"
                            />
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium text-gray-700">Email</span>
                            </label>
                            <input
                                name="email"
                                type="email"
                                className="input input-bordered w-full bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                required
                                placeholder="Enter your email"
                            />
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium text-gray-700">Password</span>
                            </label>
                            <input
                                name="password"
                                type="password"
                                className="input input-bordered w-full bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                required
                                placeholder="Create a password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full bg-brand-navy hover:bg-[#0d2e4d] border-none text-white mt-4 h-12 text-lg"
                            disabled={loading}
                        >
                            {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Sign Up'}
                        </button>

                        <p className="text-center text-sm text-gray-500 mt-4">
                            Already have an account? <Link href="/login" className="text-brand-teal hover:underline font-medium">Sign in</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
