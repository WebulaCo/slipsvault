'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Store, Calendar, Search, X, Layers } from 'lucide-react'
import { useState, useEffect } from 'react'

interface MonthOption {
    value: string
    label: string
    shortLabel: string
    count: number
    total: number
}

interface SupplierFiltersBarProps {
    suppliers: string[]
    availableMonths: MonthOption[]
    totalSlipsCount: number
}

export default function SupplierFiltersBar({
    suppliers,
    availableMonths,
    totalSlipsCount,
}: SupplierFiltersBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentMonth = searchParams.get('month') || 'all'
    const currentSupplier = searchParams.get('supplier') || 'all'
    const currentView = searchParams.get('view') || 'both'
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

    useEffect(() => {
        setSearchQuery(searchParams.get('q') || '')
    }, [searchParams])

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (!value || value === 'all' || (key === 'view' && value === 'both')) {
            params.delete(key)
        } else {
            params.set(key, value)
        }
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            const existingQ = searchParams.get('q') || ''
            if (searchQuery.trim() !== existingQ.trim()) {
                const params = new URLSearchParams(searchParams.toString())
                if (searchQuery.trim()) {
                    params.set('q', searchQuery.trim())
                } else {
                    params.delete('q')
                }
                const qs = params.toString()
                router.replace(qs ? `${pathname}?${qs}` : pathname)
            }
        }, 250)
        return () => clearTimeout(timer)
    }, [searchQuery, pathname, router, searchParams])

    const clearFilters = () => {
        setSearchQuery('')
        router.push(pathname)
    }

    const monthsWithSlips = availableMonths.filter((m) => m.count > 0)
    const hasFilters =
        currentMonth !== 'all' ||
        currentSupplier !== 'all' ||
        !!searchQuery.trim()

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search Input */}
                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search supplier, location, or category..."
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
                        <option value="all">All Months ({totalSlipsCount} slips)</option>
                        {availableMonths.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label} — {m.count} {m.count === 1 ? 'slip' : 'slips'} (R{m.total.toFixed(2)})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quick Month Pills (for months with data) + View Mode Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-50">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-gray-400 font-medium mr-1">Month:</span>
                    <button
                        type="button"
                        onClick={() => updateParam('month', 'all')}
                        className={`btn btn-xs rounded-full normal-case ${
                            currentMonth === 'all'
                                ? 'bg-brand-navy text-white border-brand-navy hover:bg-brand-navy'
                                : 'btn-outline border-gray-200 text-gray-600'
                        }`}
                    >
                        All Time ({totalSlipsCount})
                    </button>
                    {monthsWithSlips.slice(0, 8).map((m) => (
                        <button
                            key={m.value}
                            type="button"
                            onClick={() =>
                                updateParam('month', currentMonth === m.value ? 'all' : m.value)
                            }
                            className={`btn btn-xs rounded-full normal-case ${
                                currentMonth === m.value
                                    ? 'bg-brand-teal text-white border-brand-teal hover:bg-brand-teal'
                                    : 'btn-outline border-gray-200 text-gray-600 hover:border-brand-teal'
                            }`}
                        >
                            {m.shortLabel} ({m.count})
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="join border border-gray-200 rounded-lg p-0.5 bg-gray-50">
                        <button
                            type="button"
                            onClick={() => updateParam('view', 'both')}
                            className={`btn btn-xs join-item border-none normal-case ${
                                currentView === 'both'
                                    ? 'bg-white text-brand-navy shadow-xs font-semibold'
                                    : 'bg-transparent text-gray-500'
                            }`}
                        >
                            Both
                        </button>
                        <button
                            type="button"
                            onClick={() => updateParam('view', 'suppliers')}
                            className={`btn btn-xs join-item border-none normal-case ${
                                currentView === 'suppliers'
                                    ? 'bg-white text-brand-navy shadow-xs font-semibold'
                                    : 'bg-transparent text-gray-500'
                            }`}
                        >
                            By Supplier
                        </button>
                        <button
                            type="button"
                            onClick={() => updateParam('view', 'monthly')}
                            className={`btn btn-xs join-item border-none normal-case ${
                                currentView === 'monthly'
                                    ? 'bg-white text-brand-navy shadow-xs font-semibold'
                                    : 'bg-transparent text-gray-500'
                            }`}
                        >
                            Grouped by Month
                        </button>
                    </div>

                    {hasFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="btn btn-xs btn-ghost text-red-500 hover:bg-red-50 rounded-full normal-case flex items-center gap-1"
                        >
                            <X size={13} />
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
