'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '../components/Logo'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError('Invalid credentials')
            } else {
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err) {
            setError('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-light p-4">
            <div className="card w-full max-w-md bg-white shadow-xl border border-gray-100">
                <div className="card-body">
                    <div className="flex justify-center mb-4">
                        <Logo showText={true} showSlogan={true} size={60} />
                    </div>
                    <p className="text-center text-gray-500 mb-6">Welcome back! Please login to your account.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="alert alert-error text-sm py-2 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium text-gray-700">Email</span>
                            </label>
                            <input
                                type="email"
                                className="input input-bordered w-full bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Enter your email"
                            />
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium text-gray-700">Password</span>
                            </label>
                            <input
                                type="password"
                                className="input input-bordered w-full bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter your password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full bg-brand-navy hover:bg-[#0d2e4d] border-none text-white mt-4 h-12 text-lg"
                            disabled={loading}
                        >
                            {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Sign In'}
                        </button>

                        <p className="text-center text-sm text-gray-500 mt-4">
                            Don't have an account? <Link href="/register" className="text-brand-teal hover:underline font-medium">Create one</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
