'use client'

import { createSlip } from '@/app/actions'
import SlipForm from '@/app/components/SlipForm'
import Link from 'next/link'

export default function CreateSlipPage() {
    return (
        <div className="min-h-screen bg-brand-light text-gray-900 p-4 pb-24">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="text-gray-900 hover:text-brand-teal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </Link>
                <h1 className="text-xl font-bold flex-1 text-center pr-10 text-brand-navy">Upload New Slip</h1>
            </header>

            <SlipForm action={createSlip} submitLabel="Save Slip" theme="light" />
        </div>
    )
}
