'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronLeft, Filter } from 'lucide-react'
import Link from 'next/link'

export default function SearchForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [keyword, setKeyword] = useState(searchParams.get('q') || '')
    const [startDate, setStartDate] = useState(searchParams.get('start') || '')
    const [endDate, setEndDate] = useState(searchParams.get('end') || '')
    const [category, setCategory] = useState(searchParams.get('category') || 'All')

    const categories = ['All', 'Fuel', 'Groceries', 'Travel', 'Utilities']

    const handleApplyFilters = () => {
        const params = new URLSearchParams()
        if (keyword) params.set('q', keyword)
        if (startDate) params.set('start', startDate)
        if (endDate) params.set('end', endDate)
        if (category && category !== 'All') params.set('category', category)

        router.push(`/dashboard/slips?${params.toString()}`)
    }

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center gap-4 mb-6">
                <Link href="/dashboard" className="text-gray-900">
                    <ChevronLeft size={24} />
                </Link>
                <h1 className="text-xl font-bold flex-1 text-center pr-10 text-brand-navy">Search & Filter</h1>
            </header>

            <div className="space-y-6 flex-1">
                <div className="form-control w-full">
                    <label className="label">
                        <span className="label-text font-medium text-gray-500">Keyword</span>
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="e.g. Engen, Food"
                            className="input input-bordered w-full pl-10 bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                        />
                    </div>
                </div>

                <div className="form-control w-full">
                    <label className="label">
                        <span className="label-text font-medium text-gray-500">Date Range</span>
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="input input-bordered w-full bg-white text-sm px-2 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                            placeholder="Start Date"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="input input-bordered w-full bg-white text-sm px-2 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                            placeholder="End Date"
                        />
                    </div>
                </div>

                <div className="form-control w-full">
                    <label className="label">
                        <span className="label-text font-medium text-gray-500">Categories</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${category === cat
                                    ? 'bg-brand-navy text-white shadow-md'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-6 mt-auto pb-6">
                <button
                    onClick={handleApplyFilters}
                    className="btn btn-primary w-full bg-brand-teal hover:bg-[#2a8c8e] border-none text-white h-12 rounded-xl text-lg font-medium gap-2 shadow-lg"
                >
                    <Filter size={20} />
                    Apply Filters
                </button>
            </div>
        </div>
    )
}
