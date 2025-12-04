'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/dashboard/slips')
    }, [router])

    return (
        <div className="min-h-screen bg-white p-4 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg text-brand-teal"></span>
        </div>
    )
}
