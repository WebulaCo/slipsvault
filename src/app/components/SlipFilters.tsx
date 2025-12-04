'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Filter, Calendar, User, Tag, X } from 'lucide-react'
import { useState, useEffect } from 'react'

import SearchInput from './SearchInput'

interface SlipFiltersProps {
    companyUsers: { id: string; name: string | null; email: string }[]
    isCompanyView: boolean
}

const CATEGORIES = [
    'Food', 'Transport', 'Groceries', 'Utilities', 'Shopping',
    'Health', 'Entertainment', 'Travel', 'Office Supplies',
    'Accommodation', 'Other'
]

export default function SlipFilters({ companyUsers, isCompanyView }: SlipFiltersProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [dateRange, setDateRange] = useState(searchParams.get('range') || 'all')
    const [category, setCategory] = useState(searchParams.get('category') || 'all')
    const [contributor, setContributor] = useState(searchParams.get('contributor') || 'all')
    const [startDate, setStartDate] = useState(searchParams.get('start') || '')
    const [endDate, setEndDate] = useState(searchParams.get('end') || '')

    // Update local state when URL params change
    useEffect(() => {
        const range = searchParams.get('range') || 'all'
        const start = searchParams.get('start') || ''
        const end = searchParams.get('end') || ''

        setDateRange(range)
        setCategory(searchParams.get('category') || 'all')
        setContributor(searchParams.get('contributor') || 'all')
        setStartDate(start)
        setEndDate(end)

        // If we have start/end but no range, or range is custom
        if ((start || end) && range === 'all') {
            setDateRange('custom')
        }
    }, [searchParams])

    const isMobileFiltersOpen = searchParams.get('mobile_filters') === 'true'

    const toggleMobileFilters = (open: boolean) => {
        const params = new URLSearchParams(window.location.search)
        if (open) {
            params.set('mobile_filters', 'true')
        } else {
            params.delete('mobile_filters')
        }
        router.replace(`${pathname}?${params.toString()}`)
    }

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search)

        if (key === 'custom_date') {
            // Handle custom date inputs
            if (value === 'start') {
                setStartDate(params.get('start') || '')
            }
            return
        }

        if (value === 'all') {
            params.delete(key)
            if (key === 'range') {
                params.delete('start')
                params.delete('end')
                setStartDate('')
                setEndDate('')
            }
        } else {
            params.set(key, value)

            if (key === 'range') {
                const now = new Date()
                let start, end

                if (value === 'this_month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1)
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                } else if (value === 'last_month') {
                    start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                    end = new Date(now.getFullYear(), now.getMonth(), 0)
                }

                if (start && end) {
                    params.set('start', start.toISOString())
                    params.set('end', end.toISOString())
                } else if (value === 'custom') {
                    // Just update local state to show inputs, don't update URL yet
                    setDateRange('custom')
                    return
                }
            }
        }

        // Keep mobile filters open if they are currently open
        if (isMobileFiltersOpen) {
            params.set('mobile_filters', 'true')
        }

        router.replace(`${pathname}?${params.toString()}`)
    }

    const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
        if (type === 'start') setStartDate(value)
        else setEndDate(value)
    }

    const applyCustomDate = () => {
        const params = new URLSearchParams(window.location.search)
        params.set('range', 'custom')

        if (startDate) params.set('start', new Date(startDate).toISOString())
        if (endDate) params.set('end', new Date(endDate).toISOString())

        // Keep mobile filters open? Or close them? User usually expects close on apply.
        // Let's close them for better UX after applying a specific range.
        params.delete('mobile_filters')

        router.replace(`${pathname}?${params.toString()}`)
    }

    const clearAllFilters = () => {
        const params = new URLSearchParams(window.location.search)
        params.delete('range')
        params.delete('start')
        params.delete('end')
        params.delete('category')
        params.delete('contributor')
        params.delete('q') // Also clear search
        setStartDate('')
        setEndDate('')

        // Keep open to show cleared state? Or close? Let's keep open.
        if (isMobileFiltersOpen) {
            params.set('mobile_filters', 'true')
        }

        router.replace(`${pathname}?${params.toString()}`)
    }

    const hasActiveFilters = dateRange !== 'all' || category !== 'all' || contributor !== 'all' || searchParams.get('q')

    return (
        <div className="mb-6 relative">
            {/* Mobile Toggle Button */}
            <button
                className="md:hidden btn btn-sm btn-outline rounded-full w-full mb-2 flex items-center justify-center gap-2"
                onClick={() => toggleMobileFilters(true)}
            >
                <Filter size={16} />
                Search & Filter Slips
                {hasActiveFilters && <span className="badge badge-xs badge-primary"></span>}
            </button>

            {/* Filter Container */}
            <div className={`
                ${isMobileFiltersOpen ? 'fixed inset-0 z-[60] bg-white flex flex-col' : 'hidden'}
                md:flex md:static md:bg-transparent md:p-0 md:flex-row md:items-center md:overflow-visible
                gap-2 flex-wrap
            `}>
                {/* Mobile Header (Close Button) */}
                <div className="flex md:hidden w-full justify-between items-center p-4 border-b border-gray-100 bg-white shrink-0">
                    <h3 className="font-bold text-lg text-brand-navy flex items-center gap-2">
                        <Filter size={20} />
                        Search & Filters
                    </h3>
                    <button onClick={() => toggleMobileFilters(false)} className="btn btn-ghost btn-circle btn-sm">
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content Area for Mobile */}
                <div className="flex-1 overflow-y-auto p-4 md:p-0 md:overflow-visible w-full md:w-auto flex flex-col md:flex-row gap-2">

                    {/* Search Input */}
                    <div className="w-full md:w-64 mb-2 md:mb-0">
                        <SearchInput />
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-brand-teal font-medium text-sm mr-2 ml-2">
                        <Filter size={16} />
                        Filters:
                    </div>

                    {/* Date Filter */}
                    <div className={`w-full md:w-auto mb-2 md:mb-0 ${isMobileFiltersOpen ? '' : 'dropdown'}`}>
                        {isMobileFiltersOpen ? (
                            <div className="collapse collapse-arrow border border-gray-200 rounded-box">
                                <input type="checkbox" />
                                <div className="collapse-title font-medium flex items-center gap-2">
                                    <Calendar size={14} />
                                    {dateRange === 'all' ? 'Date: All Time' :
                                        dateRange === 'this_month' ? 'Date: This Month' :
                                            dateRange === 'last_month' ? 'Date: Last Month' :
                                                dateRange === 'custom' ? 'Date: Custom' : 'Date'}
                                </div>
                                <div className="collapse-content">
                                    <ul className="menu p-0">
                                        <li><button type="button" onClick={() => updateFilters('range', 'all')} className={dateRange === 'all' ? 'active' : ''}>All Time</button></li>
                                        <li><button type="button" onClick={() => updateFilters('range', 'this_month')} className={dateRange === 'this_month' ? 'active' : ''}>This Month</button></li>
                                        <li><button type="button" onClick={() => updateFilters('range', 'last_month')} className={dateRange === 'last_month' ? 'active' : ''}>Last Month</button></li>
                                        <li><button type="button" onClick={() => updateFilters('range', 'custom')} className={dateRange === 'custom' ? 'active' : ''}>Custom Range</button></li>
                                    </ul>
                                    {dateRange === 'custom' && (
                                        <div className="pt-2 border-t border-gray-100 mt-2">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">Start</label>
                                                    <input
                                                        type="date"
                                                        className="input input-xs input-bordered w-full bg-white text-gray-900"
                                                        value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">End</label>
                                                    <input
                                                        type="date"
                                                        className="input input-xs input-bordered w-full bg-white text-gray-900"
                                                        value={endDate ? new Date(endDate).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <button onClick={applyCustomDate} className="btn btn-xs btn-primary w-full text-white">Apply Range</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <button type="button" tabIndex={0} className={`btn btn-sm btn-outline rounded-full font-normal normal-case w-full md:w-auto justify-start md:justify-center ${dateRange !== 'all' ? 'btn-active bg-brand-teal text-white border-brand-teal' : ''}`}>
                                    <Calendar size={14} />
                                    {dateRange === 'all' ? 'Date: All Time' :
                                        dateRange === 'this_month' ? 'Date: This Month' :
                                            dateRange === 'last_month' ? 'Date: Last Month' :
                                                dateRange === 'custom' ? 'Date: Custom' : 'Date'}
                                </button>
                                <div tabIndex={0} className="dropdown-content z-[70] menu p-2 shadow bg-white text-gray-900 rounded-box w-full md:w-72 mt-1">
                                    <ul className="menu p-0">
                                        <li><button type="button" onClick={() => { updateFilters('range', 'all'); }} className={`hover:bg-gray-100 ${dateRange === 'all' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>All Time</button></li>
                                        <li><button type="button" onClick={() => { updateFilters('range', 'this_month'); }} className={`hover:bg-gray-100 ${dateRange === 'this_month' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>This Month</button></li>
                                        <li><button type="button" onClick={() => { updateFilters('range', 'last_month'); }} className={`hover:bg-gray-100 ${dateRange === 'last_month' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>Last Month</button></li>
                                        <li><button type="button" onClick={() => updateFilters('range', 'custom')} className={`hover:bg-gray-100 ${dateRange === 'custom' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>Custom Range</button></li>
                                    </ul>
                                    {dateRange === 'custom' && (
                                        <div className="p-2 border-t border-gray-100 mt-2">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">Start</label>
                                                    <input
                                                        type="date"
                                                        className="input input-xs input-bordered w-full bg-white text-gray-900"
                                                        value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">End</label>
                                                    <input
                                                        type="date"
                                                        className="input input-xs input-bordered w-full bg-white text-gray-900"
                                                        value={endDate ? new Date(endDate).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <button onClick={applyCustomDate} className="btn btn-xs btn-primary w-full text-white">Apply Range</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className={`w-full md:w-auto mb-2 md:mb-0 ${isMobileFiltersOpen ? '' : 'dropdown'}`}>
                        {isMobileFiltersOpen ? (
                            <div className="collapse collapse-arrow border border-gray-200 rounded-box">
                                <input type="checkbox" />
                                <div className="collapse-title font-medium flex items-center gap-2">
                                    <Tag size={14} />
                                    {category === 'all' ? 'Category: All' : `Category: ${category}`}
                                </div>
                                <div className="collapse-content">
                                    <ul className="menu p-0">
                                        <li><button type="button" onClick={() => updateFilters('category', 'all')} className={category === 'all' ? 'active' : ''}>All Categories</button></li>
                                        {CATEGORIES.map(cat => (
                                            <li key={cat}>
                                                <button type="button" onClick={() => updateFilters('category', cat)} className={category === cat ? 'active' : ''}>
                                                    {cat}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button type="button" tabIndex={0} className={`btn btn-sm btn-outline rounded-full font-normal normal-case w-full md:w-auto justify-start md:justify-center ${category !== 'all' ? 'btn-active bg-brand-teal text-white border-brand-teal' : ''}`}>
                                    <Tag size={14} />
                                    {category === 'all' ? 'Category: All' : `Category: ${category}`}
                                </button>
                                <ul tabIndex={0} className="dropdown-content z-[70] menu p-2 shadow bg-white text-gray-900 rounded-box w-full md:w-52 mt-1 max-h-60 overflow-y-auto block">
                                    <li><button type="button" onClick={() => { updateFilters('category', 'all'); }} className={`hover:bg-gray-100 ${category === 'all' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>All Categories</button></li>
                                    {CATEGORIES.map(cat => (
                                        <li key={cat}>
                                            <button type="button" onClick={() => { updateFilters('category', cat); }} className={`hover:bg-gray-100 ${category === cat ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>
                                                {cat}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    {/* Contributor Filter (Company View Only) */}
                    {isCompanyView && (
                        <div className={`w-full md:w-auto mb-2 md:mb-0 ${isMobileFiltersOpen ? '' : 'dropdown'}`}>
                            {isMobileFiltersOpen ? (
                                <div className="collapse collapse-arrow border border-gray-200 rounded-box">
                                    <input type="checkbox" />
                                    <div className="collapse-title font-medium flex items-center gap-2">
                                        <User size={14} />
                                        {contributor === 'all' ? 'Contributor: All' :
                                            `Contributor: ${companyUsers.find(u => u.id === contributor)?.name?.split(' ')[0] || 'Unknown'}`}
                                    </div>
                                    <div className="collapse-content">
                                        <ul className="menu p-0">
                                            <li><button type="button" onClick={() => updateFilters('contributor', 'all')} className={contributor === 'all' ? 'active' : ''}>All Contributors</button></li>
                                            {companyUsers.map(user => (
                                                <li key={user.id}>
                                                    <button type="button" onClick={() => updateFilters('contributor', user.id)} className={contributor === user.id ? 'active' : ''}>
                                                        {user.name || user.email}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button type="button" tabIndex={0} className={`btn btn-sm btn-outline rounded-full font-normal normal-case w-full md:w-auto justify-start md:justify-center ${contributor !== 'all' ? 'btn-active bg-brand-teal text-white border-brand-teal' : ''}`}>
                                        <User size={14} />
                                        {contributor === 'all' ? 'Contributor: All' :
                                            `Contributor: ${companyUsers.find(u => u.id === contributor)?.name?.split(' ')[0] || 'Unknown'}`}
                                    </button>
                                    <ul tabIndex={0} className="dropdown-content z-[70] menu p-2 shadow bg-white text-gray-900 rounded-box w-full md:w-52 mt-1 max-h-60 overflow-y-auto block">
                                        <li><button type="button" onClick={() => { updateFilters('contributor', 'all'); }} className={`hover:bg-gray-100 ${contributor === 'all' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>All Contributors</button></li>
                                        {companyUsers.map(user => (
                                            <li key={user.id}>
                                                <button type="button" onClick={() => { updateFilters('contributor', user.id); }} className={`hover:bg-gray-100 ${contributor === user.id ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>
                                                    {user.name || user.email}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="btn btn-sm btn-ghost text-gray-500 hover:text-red-500 md:ml-2 md:btn-circle w-full md:w-auto justify-start md:justify-center mt-4 md:mt-0"
                            title="Clear all filters"
                        >
                            <X size={16} />
                            <span className="md:hidden ml-2">Clear All Filters</span>
                        </button>
                    )}
                </div>

                {/* Mobile Footer (View Results) */}
                <div className="p-4 border-t border-gray-100 md:hidden mt-auto bg-white shrink-0">
                    <button
                        onClick={() => toggleMobileFilters(false)}
                        className="btn btn-primary w-full text-white"
                    >
                        View Results
                    </button>
                </div>
            </div>
        </div>
    )
}
