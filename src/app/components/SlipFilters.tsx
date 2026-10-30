'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Filter, Calendar, User, Tag, Store, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { CATEGORY_GROUPS } from '@/lib/categories'
import SearchInput from './SearchInput'

interface SlipFiltersProps {
    companyUsers: { id: string; name: string | null; email: string }[]
    isCompanyView: boolean
    suppliers?: string[]
    availableMonths?: { value: string; label: string; count: number }[]
}

export default function SlipFilters({
    companyUsers,
    isCompanyView,
    suppliers = [],
    availableMonths = [],
}: SlipFiltersProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [dateRange, setDateRange] = useState(searchParams.get('range') || 'all')
    const [month, setMonth] = useState(searchParams.get('month') || '')
    const [supplier, setSupplier] = useState(searchParams.get('supplier') || 'all')
    const [supplierSearch, setSupplierSearch] = useState('')
    const [category, setCategory] = useState(
        searchParams.get('category') || searchParams.get('tag') || 'all'
    )
    const [contributor, setContributor] = useState(searchParams.get('contributor') || 'all')
    const [startDate, setStartDate] = useState(searchParams.get('start') || '')
    const [endDate, setEndDate] = useState(searchParams.get('end') || '')

    useEffect(() => {
        const range = searchParams.get('range') || 'all'
        const start = searchParams.get('start') || ''
        const end = searchParams.get('end') || ''
        const monthParam = searchParams.get('month') || ''

        setDateRange(monthParam ? 'month' : range)
        setMonth(monthParam)
        setSupplier(searchParams.get('supplier') || 'all')
        setCategory(searchParams.get('category') || searchParams.get('tag') || 'all')
        setContributor(searchParams.get('contributor') || 'all')
        setStartDate(start)
        setEndDate(end)

        if ((start || end) && range === 'all' && !monthParam) {
            setDateRange('custom')
        }
    }, [searchParams])

    const isMobileFiltersOpen = searchParams.get('mobile_filters') === 'true'

    const toggleMobileFilters = (open: boolean) => {
        const params = new URLSearchParams(searchParams.toString())
        if (open) {
            params.set('mobile_filters', 'true')
        } else {
            params.delete('mobile_filters')
        }
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
    }

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())

        if (key === 'category') {
            params.delete('tag')
        }

        if (key === 'month') {
            if (!value || value === 'all') {
                params.delete('month')
                params.delete('range')
                params.delete('start')
                params.delete('end')
            } else {
                params.set('month', value)
                params.delete('range')
                params.delete('start')
                params.delete('end')
            }
            if (isMobileFiltersOpen) {
                params.set('mobile_filters', 'true')
            }
            const qs = params.toString()
            router.push(qs ? `${pathname}?${qs}` : pathname)
            return
        }

        if (value === 'all') {
            params.delete(key)
            if (key === 'range') {
                params.delete('start')
                params.delete('end')
                params.delete('month')
                setStartDate('')
                setEndDate('')
                setMonth('')
            }
        } else {
            params.set(key, value)

            if (key === 'range') {
                params.delete('month')
                setMonth('')
                const now = new Date()

                if (value === 'this_month') {
                    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                    params.set('month', ym)
                    params.delete('range')
                    params.delete('start')
                    params.delete('end')
                } else if (value === 'last_month') {
                    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                    const ym = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`
                    params.set('month', ym)
                    params.delete('range')
                    params.delete('start')
                    params.delete('end')
                } else if (value === 'custom') {
                    setDateRange('custom')
                    return
                }
            }
        }

        if (isMobileFiltersOpen) {
            params.set('mobile_filters', 'true')
        }

        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
    }

    const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
        if (type === 'start') setStartDate(value)
        else setEndDate(value)
    }

    const applyCustomDate = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('range', 'custom')
        params.delete('month')

        if (startDate) params.set('start', new Date(`${startDate}T00:00:00.000Z`).toISOString())
        if (endDate) params.set('end', new Date(`${endDate}T23:59:59.999Z`).toISOString())

        params.delete('mobile_filters')
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
    }

    const clearAllFilters = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('range')
        params.delete('start')
        params.delete('end')
        params.delete('month')
        params.delete('supplier')
        params.delete('category')
        params.delete('tag')
        params.delete('contributor')
        params.delete('q')
        setStartDate('')
        setEndDate('')
        setMonth('')
        setSupplier('all')

        if (isMobileFiltersOpen) {
            params.set('mobile_filters', 'true')
        }

        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
    }

    const formatMonthLabel = (yyyyMm: string) => {
        const [y, m] = yyyyMm.split('-').map(Number)
        if (!y || !m) return yyyyMm
        return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-ZA', {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        })
    }

    const formatCategoryLabel = (cat: string) => {
        if (cat === 'all') return 'Category: All'
        if (cat.startsWith('group:')) return `Group: ${cat.slice('group:'.length)}`
        return `Category: ${cat}`
    }

    const filteredSuppliers = suppliers.filter((s) =>
        s.toLowerCase().includes(supplierSearch.toLowerCase())
    )

    const hasActiveFilters =
        dateRange !== 'all' ||
        !!month ||
        supplier !== 'all' ||
        category !== 'all' ||
        contributor !== 'all' ||
        !!searchParams.get('q')

    const dateButtonLabel = month
        ? `Month: ${formatMonthLabel(month)}`
        : dateRange === 'all'
        ? 'Month / Date: All'
        : dateRange === 'this_month'
        ? 'Date: This Month'
        : dateRange === 'last_month'
        ? 'Date: Last Month'
        : dateRange === 'custom'
        ? 'Date: Custom'
        : 'Month / Date'

    return (
        <div className="mb-6 relative">
            {/* Mobile Toggle Button */}
            <button
                type="button"
                className="md:hidden btn btn-sm btn-outline rounded-full w-full mb-2 flex items-center justify-center gap-2"
                onClick={() => toggleMobileFilters(true)}
            >
                <Filter size={16} />
                Search &amp; Filter Slips
                {hasActiveFilters && <span className="badge badge-xs badge-primary"></span>}
            </button>

            {/* Filter Container */}
            <div
                className={`
                ${isMobileFiltersOpen ? 'fixed inset-0 z-[60] bg-white flex flex-col' : 'hidden'}
                md:flex md:static md:bg-transparent md:p-0 md:flex-row md:items-center md:overflow-visible
                gap-2 flex-wrap
            `}
            >
                {/* Mobile Header (Close Button) */}
                <div className="flex md:hidden w-full justify-between items-center p-4 border-b border-gray-100 bg-white shrink-0">
                    <h3 className="font-bold text-lg text-brand-navy flex items-center gap-2">
                        <Filter size={20} />
                        Search &amp; Filters
                    </h3>
                    <button
                        type="button"
                        onClick={() => toggleMobileFilters(false)}
                        className="btn btn-ghost btn-circle btn-sm"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content Area for Mobile */}
                <div className="flex-1 overflow-y-auto p-4 md:p-0 md:overflow-visible w-full md:w-auto flex flex-col md:flex-row md:flex-wrap md:items-center gap-2">
                    {/* Search Input */}
                    <div className="w-full md:w-60 mb-2 md:mb-0">
                        <SearchInput />
                    </div>

                    <div className="hidden md:flex items-center gap-1.5 text-brand-teal font-medium text-sm mr-1 ml-1">
                        <Filter size={16} />
                        Filters:
                    </div>

                    {/* Supplier Filter */}
                    <div
                        className={`w-full md:w-auto mb-2 md:mb-0 ${
                            isMobileFiltersOpen ? '' : 'dropdown'
                        }`}
                    >
                        {isMobileFiltersOpen ? (
                            <div className="collapse collapse-arrow border border-gray-200 rounded-box">
                                <input type="checkbox" />
                                <div className="collapse-title font-medium flex items-center gap-2">
                                    <Store size={14} />
                                    <span className="truncate">
                                        {supplier === 'all'
                                            ? 'Supplier: All'
                                            : `Supplier: ${supplier}`}
                                    </span>
                                </div>
                                <div className="collapse-content">
                                    {suppliers.length > 5 && (
                                        <input
                                            type="text"
                                            placeholder="Filter suppliers..."
                                            className="input input-xs input-bordered w-full mb-2 bg-white text-gray-900"
                                            value={supplierSearch}
                                            onChange={(e) => setSupplierSearch(e.target.value)}
                                        />
                                    )}
                                    <ul className="menu p-0 max-h-52 overflow-y-auto flex-nowrap">
                                        <li>
                                            <button
                                                type="button"
                                                onClick={() => updateFilters('supplier', 'all')}
                                                className={supplier === 'all' ? 'active' : ''}
                                            >
                                                All Suppliers
                                            </button>
                                        </li>
                                        {filteredSuppliers.map((sup) => (
                                            <li key={sup}>
                                                <button
                                                    type="button"
                                                    onClick={() => updateFilters('supplier', sup)}
                                                    className={
                                                        supplier.toLowerCase() === sup.toLowerCase()
                                                            ? 'active'
                                                            : ''
                                                    }
                                                >
                                                    {sup}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    tabIndex={0}
                                    className={`btn btn-sm btn-outline rounded-full font-normal normal-case w-full md:w-auto justify-start md:justify-center max-w-xs ${
                                        supplier !== 'all'
                                            ? 'btn-active bg-brand-teal text-white border-brand-teal'
                                            : ''
                                    }`}
                                >
                                    <Store size={14} className="shrink-0" />
                                    <span className="truncate">
                                        {supplier === 'all'
                                            ? 'Supplier: All'
                                            : `Supplier: ${supplier}`}
                                    </span>
                                </button>
                                <div
                                    tabIndex={0}
                                    className="dropdown-content z-[70] p-2 shadow bg-white text-gray-900 rounded-box w-full md:w-64 mt-1"
                                >
                                    {suppliers.length > 5 && (
                                        <input
                                            type="text"
                                            placeholder="Search supplier..."
                                            className="input input-xs input-bordered w-full mb-2 bg-white text-gray-900"
                                            value={supplierSearch}
                                            onChange={(e) => setSupplierSearch(e.target.value)}
                                        />
                                    )}
                                    <ul className="menu p-0 max-h-60 overflow-y-auto block">
                                        <li>
                                            <button
                                                type="button"
                                                onClick={() => updateFilters('supplier', 'all')}
                                                className={`hover:bg-gray-100 ${
                                                    supplier === 'all'
                                                        ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                        : ''
                                                }`}
                                            >
                                                All Suppliers
                                            </button>
                                        </li>
                                        {filteredSuppliers.map((sup) => (
                                            <li key={sup}>
                                                <button
                                                    type="button"
                                                    onClick={() => updateFilters('supplier', sup)}
                                                    className={`hover:bg-gray-100 ${
                                                        supplier.toLowerCase() === sup.toLowerCase()
                                                            ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                            : ''
                                                    }`}
                                                >
                                                    <span className="truncate">{sup}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Date & Month Filter */}
                    <div
                        className={`w-full md:w-auto mb-2 md:mb-0 ${
                            isMobileFiltersOpen ? '' : 'dropdown'
                        }`}
                    >
                        {isMobileFiltersOpen ? (
                            <div className="collapse collapse-arrow border border-gray-200 rounded-box">
                                <input type="checkbox" />
                                <div className="collapse-title font-medium flex items-center gap-2">
                                    <Calendar size={14} />
                                    {dateButtonLabel}
                                </div>
                                <div className="collapse-content">
                                    <ul className="menu p-0">
                                        <li>
                                            <button
                                                type="button"
                                                onClick={() => updateFilters('range', 'all')}
                                                className={dateRange === 'all' && !month ? 'active' : ''}
                                            >
                                                All Time
                                            </button>
                                        </li>
                                        {availableMonths.map((m) => (
                                            <li key={m.value}>
                                                <button
                                                    type="button"
                                                    onClick={() => updateFilters('month', m.value)}
                                                    className={month === m.value ? 'active' : ''}
                                                >
                                                    {m.label} ({m.count})
                                                </button>
                                            </li>
                                        ))}
                                        <li>
                                            <button
                                                type="button"
                                                onClick={() => updateFilters('range', 'custom')}
                                                className={dateRange === 'custom' ? 'active' : ''}
                                            >
                                                Custom Date Range
                                            </button>
                                        </li>
                                    </ul>
                                    {dateRange === 'custom' && (
                                        <div className="pt-2 border-t border-gray-100 mt-2">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">
                                                        Start
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="input input-xs input-bordered w-full bg-white text-gray-900"
                                                        value={
                                                            startDate
                                                                ? new Date(startDate)
                                                                      .toISOString()
                                                                      .split('T')[0]
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            handleCustomDateChange('start', e.target.value)
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">
                                                        End
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="input input-xs input-bordered w-full bg-white text-gray-900"
                                                        value={
                                                            endDate
                                                                ? new Date(endDate)
                                                                      .toISOString()
                                                                      .split('T')[0]
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            handleCustomDateChange('end', e.target.value)
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={applyCustomDate}
                                                className="btn btn-xs btn-primary w-full text-white"
                                            >
                                                Apply Range
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    tabIndex={0}
                                    className={`btn btn-sm btn-outline rounded-full font-normal normal-case w-full md:w-auto justify-start md:justify-center ${
                                        dateRange !== 'all' || month
                                            ? 'btn-active bg-brand-teal text-white border-brand-teal'
                                            : ''
                                    }`}
                                >
                                    <Calendar size={14} />
                                    {dateButtonLabel}
                                </button>
                                <div
                                    tabIndex={0}
                                    className="dropdown-content z-[70] menu p-2 shadow bg-white text-gray-900 rounded-box w-full md:w-72 mt-1 max-h-80 overflow-y-auto block"
                                >
                                    <ul className="menu p-0">
                                        <li>
                                            <button
                                                type="button"
                                                onClick={() => updateFilters('range', 'all')}
                                                className={`hover:bg-gray-100 ${
                                                    dateRange === 'all' && !month
                                                        ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                        : ''
                                                }`}
                                            >
                                                All Time
                                            </button>
                                        </li>
                                        {availableMonths.length > 0 && (
                                            <li className="menu-title text-xs uppercase text-gray-400 pt-2 pb-1 px-2">
                                                Months with Slips
                                            </li>
                                        )}
                                        {availableMonths.map((m) => (
                                            <li key={m.value}>
                                                <button
                                                    type="button"
                                                    onClick={() => updateFilters('month', m.value)}
                                                    className={`hover:bg-gray-100 flex justify-between ${
                                                        month === m.value
                                                            ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                            : ''
                                                    }`}
                                                >
                                                    <span>{m.label}</span>
                                                    <span className="badge badge-xs">{m.count}</span>
                                                </button>
                                            </li>
                                        ))}
                                        <li className="border-t border-gray-100 mt-1 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => updateFilters('range', 'custom')}
                                                className={`hover:bg-gray-100 ${
                                                    dateRange === 'custom'
                                                        ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                        : ''
                                                }`}
                                            >
                                                Custom Date Range
                                            </button>
                                        </li>
                                    </ul>
                                    {dateRange === 'custom' && (
                                        <div className="p-2 border-t border-gray-100 mt-1">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">
                                                        Start
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="input input-xs input-bordered w-full bg-white text-gray-900"
                                                        value={
                                                            startDate
                                                                ? new Date(startDate)
                                                                      .toISOString()
                                                                      .split('T')[0]
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            handleCustomDateChange('start', e.target.value)
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">
                                                        End
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="input input-xs input-bordered w-full bg-white text-gray-900"
                                                        value={
                                                            endDate
                                                                ? new Date(endDate)
                                                                      .toISOString()
                                                                      .split('T')[0]
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            handleCustomDateChange('end', e.target.value)
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={applyCustomDate}
                                                className="btn btn-xs btn-primary w-full text-white"
                                            >
                                                Apply Range
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Category / Subcategory Filter */}
                    <div
                        className={`w-full md:w-auto mb-2 md:mb-0 ${
                            isMobileFiltersOpen ? '' : 'dropdown'
                        }`}
                    >
                        {isMobileFiltersOpen ? (
                            <div className="collapse collapse-arrow border border-gray-200 rounded-box">
                                <input type="checkbox" />
                                <div className="collapse-title font-medium flex items-center gap-2">
                                    <Tag size={14} />
                                    <span className="truncate">{formatCategoryLabel(category)}</span>
                                </div>
                                <div className="collapse-content">
                                    <ul className="menu p-0 max-h-64 overflow-y-auto flex-nowrap">
                                        <li>
                                            <button
                                                type="button"
                                                onClick={() => updateFilters('category', 'all')}
                                                className={category === 'all' ? 'active' : ''}
                                            >
                                                All Categories
                                            </button>
                                        </li>
                                        {CATEGORY_GROUPS.map((group) => (
                                            <li key={group.group} className="mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateFilters('category', `group:${group.group}`)
                                                    }
                                                    className={`font-semibold text-xs uppercase tracking-wider text-brand-navy ${
                                                        category === `group:${group.group}`
                                                            ? 'active'
                                                            : ''
                                                    }`}
                                                >
                                                    All {group.group}
                                                </button>
                                                <ul className="pl-3">
                                                    {group.items.map((cat) => (
                                                        <li key={cat}>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateFilters('category', cat)
                                                                }
                                                                className={
                                                                    category === cat ? 'active' : ''
                                                                }
                                                            >
                                                                {cat}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    tabIndex={0}
                                    className={`btn btn-sm btn-outline rounded-full font-normal normal-case w-full md:w-auto justify-start md:justify-center max-w-xs ${
                                        category !== 'all'
                                            ? 'btn-active bg-brand-teal text-white border-brand-teal'
                                            : ''
                                    }`}
                                >
                                    <Tag size={14} className="shrink-0" />
                                    <span className="truncate">{formatCategoryLabel(category)}</span>
                                </button>
                                <ul
                                    tabIndex={0}
                                    className="dropdown-content z-[70] menu p-2 shadow bg-white text-gray-900 rounded-box w-full md:w-64 mt-1 max-h-80 overflow-y-auto block"
                                >
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => updateFilters('category', 'all')}
                                            className={`hover:bg-gray-100 ${
                                                category === 'all'
                                                    ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                    : ''
                                            }`}
                                        >
                                            All Categories
                                        </button>
                                    </li>
                                    {CATEGORY_GROUPS.map((group) => (
                                        <div
                                            key={group.group}
                                            className="mt-2 border-t border-gray-100 pt-1"
                                        >
                                            <li>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateFilters('category', `group:${group.group}`)
                                                    }
                                                    className={`text-xs font-bold uppercase tracking-wider text-brand-navy hover:bg-gray-100 ${
                                                        category === `group:${group.group}`
                                                            ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                            : ''
                                                    }`}
                                                >
                                                    {group.group} (All)
                                                </button>
                                            </li>
                                            {group.items.map((cat) => (
                                                <li key={cat}>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateFilters('category', cat)}
                                                        className={`pl-5 hover:bg-gray-100 ${
                                                            category === cat
                                                                ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                                : ''
                                                        }`}
                                                    >
                                                        {cat}
                                                    </button>
                                                </li>
                                            ))}
                                        </div>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    {/* Contributor Filter (Company View Only) */}
                    {isCompanyView && (
                        <div
                            className={`w-full md:w-auto mb-2 md:mb-0 ${
                                isMobileFiltersOpen ? '' : 'dropdown'
                            }`}
                        >
                            {isMobileFiltersOpen ? (
                                <div className="collapse collapse-arrow border border-gray-200 rounded-box">
                                    <input type="checkbox" />
                                    <div className="collapse-title font-medium flex items-center gap-2">
                                        <User size={14} />
                                        {contributor === 'all'
                                            ? 'Contributor: All'
                                            : `Contributor: ${
                                                  companyUsers
                                                      .find((u) => u.id === contributor)
                                                      ?.name?.split(' ')[0] || 'Unknown'
                                              }`}
                                    </div>
                                    <div className="collapse-content">
                                        <ul className="menu p-0">
                                            <li>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateFilters('contributor', 'all')
                                                    }
                                                    className={contributor === 'all' ? 'active' : ''}
                                                >
                                                    All Contributors
                                                </button>
                                            </li>
                                            {companyUsers.map((user) => (
                                                <li key={user.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateFilters('contributor', user.id)
                                                        }
                                                        className={
                                                            contributor === user.id ? 'active' : ''
                                                        }
                                                    >
                                                        {user.name || user.email}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        tabIndex={0}
                                        className={`btn btn-sm btn-outline rounded-full font-normal normal-case w-full md:w-auto justify-start md:justify-center ${
                                            contributor !== 'all'
                                                ? 'btn-active bg-brand-teal text-white border-brand-teal'
                                                : ''
                                        }`}
                                    >
                                        <User size={14} />
                                        {contributor === 'all'
                                            ? 'Contributor: All'
                                            : `Contributor: ${
                                                  companyUsers
                                                      .find((u) => u.id === contributor)
                                                      ?.name?.split(' ')[0] || 'Unknown'
                                              }`}
                                    </button>
                                    <ul
                                        tabIndex={0}
                                        className="dropdown-content z-[70] menu p-2 shadow bg-white text-gray-900 rounded-box w-full md:w-52 mt-1 max-h-60 overflow-y-auto block"
                                    >
                                        <li>
                                            <button
                                                type="button"
                                                onClick={() => updateFilters('contributor', 'all')}
                                                className={`hover:bg-gray-100 ${
                                                    contributor === 'all'
                                                        ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                        : ''
                                                }`}
                                            >
                                                All Contributors
                                            </button>
                                        </li>
                                        {companyUsers.map((user) => (
                                            <li key={user.id}>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateFilters('contributor', user.id)
                                                    }
                                                    className={`hover:bg-gray-100 ${
                                                        contributor === user.id
                                                            ? 'active bg-brand-teal text-white hover:bg-brand-teal'
                                                            : ''
                                                    }`}
                                                >
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
                            type="button"
                            onClick={clearAllFilters}
                            className="btn btn-sm btn-ghost text-gray-500 hover:text-red-500 md:ml-1 md:btn-circle w-full md:w-auto justify-start md:justify-center mt-4 md:mt-0"
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
                        type="button"
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
