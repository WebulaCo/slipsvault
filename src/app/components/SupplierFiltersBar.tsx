'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Store, Calendar, Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SupplierFiltersBarProps {
    suppliers: string[]
    availableMonths: { value: string; label: string }[]
}

export default function SupplierFiltersBar({ suppliers, availableMonths }: SupplierFiltersBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentMonth = searchParams.get('month') || 'all'
    const currentSupplier = searchParams.get('supplier') || 'all'
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

    useEffect(() => {
        setSearchQuery(searchParams.get('q') || '')
    }, [searchParams])

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search)
        if (!value || value === 'all') {
            params.delete(key)
        } else {
            params.set(key, value)
        }
        router.replace(`${pathname}?${params.toString()}`)
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(window.location.search)
            const existingQ = params.get('q') || ''
            if (searchQuery !== existingQ) {
                if (searchQuery.trim()) {
                    params.set('q', searchQuery.trim())
                } else {
                    params.delete('q')
                }
                router.replace(`${pathname}?${params.toString()}`)
            }
        }, 250)
        return () => clearTimeout(timer)
    }, [searchQuery, pathname, router])

    const clearFilters = () => {
        setSearchQuery('')
        router.replace(pathname)
    }

    const now = new Date()
    const thisMonthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthVal = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

    const hasFilters = currentMonth !== 'all' || currentSupplier !== 'all' || !!searchQuery

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search Supplier Input */}
                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search supplier name..."
                        className="input input-sm input-bordered w-full pl-9 bg-white text-gray-900 rounded-lg h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Supplier Selector */}
                <div className="relative">
                    <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                        aria-label="Filter by supplier"
                        className="select select-sm select-bordered w-full pl-9 bg-white text-gray-900 rounded-lg h-10 font-normal"
                        value={currentSupplier}
                        onChange={(e) => updateParam('supplier', e.target.value)}
                    >
                        <option value="all">All Suppliers ({suppliers.length})</option>
                        {suppliers.map((sup) => (
                            <option key={sup} value={sup}>
                                {sup}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Month Selector */}
                <div className="relative">
                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                        aria-label="Filter by month"
                        className="select select-sm select-bordered w-full pl-9 bg-white text-gray-900 rounded-lg h-10 font-normal"
                        value={currentMonth}
                        onChange={(e) => updateParam('month', e.target.value)}
                    >
                        <option value="all">All Months (All Time)</option>
                        {availableMonths.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quick Month Pills & Clear */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-gray-400 font-medium mr-1">Quick Period:</span>
                    <button
                        type="button"
                        onClick={() => updateParam('month', 'all')}
                        className={`btn btn-xs rounded-full normal-case ${
                            currentMonth === 'all'
                                ? 'bg-brand-navy text-white border-brand-navy hover:bg-brand-navy'
                                : 'btn-outline border-gray-200 text-gray-600'
                        }`}
                    >
                        All Time
                    </button>
                    <button
                        type="button"
                        onClick={() => updateParam('month', thisMonthVal)}
                        className={`btn btn-xs rounded-full normal-case ${
                            currentMonth === thisMonthVal
                                ? 'bg-brand-teal text-white border-brand-teal hover:bg-brand-teal'
                                : 'btn-outline border-gray-200 text-gray-600'
                        }`}
                    >
                        This Month
                    </button>
                    <button
                        type="button"
                        onClick={() => updateParam('month', lastMonthVal)}
                        className={`btn btn-xs rounded-full normal-case ${
                            currentMonth === lastMonthVal
                                ? 'bg-brand-teal text-white border-brand-teal hover:bg-brand-teal'
                                : 'btn-outline border-gray-200 text-gray-600'
                        }`}
                    >
                        Last Month
                    </button>
                </div>

                {hasFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="btn btn-xs btn-ghost text-red-500 hover:bg-red-50 rounded-full normal-case flex items-center gap-1"
                    >
                        <X size={13} />
                        Reset Filters
                    </button>
                )}
            </div>
        </div>
    )
}
