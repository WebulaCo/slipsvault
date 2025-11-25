'use client'

import { useState } from 'react'
import { registerUser } from '@/app/actions'
import Link from 'next/link'

export default function RegisterPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)

        try {
            await registerUser(formData)
        } catch (err) {
            setError('Registration failed. Email might be taken.')
            setLoading(false)
        }
    }

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.75rem' }}>Create Account</h1>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'hsl(var(--destructive) / 0.1)',
                            color: 'hsl(var(--destructive))',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            className="input"
                            required
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="input"
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="input"
                            required
                            placeholder="Create a password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginTop: '1rem' }}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>

                    <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1rem', color: 'hsl(var(--muted-foreground))' }}>
                        Already have an account? <Link href="/login" style={{ color: 'hsl(var(--primary))' }}>Sign in</Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
