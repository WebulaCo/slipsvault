'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition, useEffect, useState } from 'react'

export default function SearchInput() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [value, setValue] = useState(searchParams.get('q') || '')

    // Debounce logic
    useEffect(() => {
        const timeout = setTimeout(() => {
            handleSearch(value)
        }, 300)

        return () => clearTimeout(timeout)
    }, [value])

    function handleSearch(term: string) {
        const params = new URLSearchParams(window.location.search)
        if (term) {
            params.set('q', term)
        } else {
            params.delete('q')
        }

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`)
        })
    }

    return (
        <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/50">
                <Search size={18} />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="input input-bordered w-full pl-10"
                placeholder="Search slips by title, place, or tags..."
            />
            {isPending && (
                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
            )}
        </div>
    )
}
