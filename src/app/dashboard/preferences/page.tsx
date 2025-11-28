'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PreferencesPage() {
    return (
        <div className="min-h-screen bg-brand-light flex flex-col">
            {/* Header */}
            <header className="bg-brand-navy pt-8 pb-12 px-6 rounded-b-[2.5rem] shadow-lg">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/dashboard/settings" className="text-white/80 hover:text-white transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Preferences</h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 px-4 -mt-8">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                        <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚙️</span>
                        </div>
                        <h2 className="text-xl font-bold text-brand-navy mb-2">Coming Soon</h2>
                        <p className="text-gray-500">
                            Application preferences and settings will be available here in a future update.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
