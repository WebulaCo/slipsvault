'use client'

import { createSlip } from '@/app/actions'
import SlipForm from '@/app/components/SlipForm'
import Link from 'next/link'

export default function CreateSlipPage() {
    return (
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '600px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <Link href="/dashboard" style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'none', fontSize: '0.875rem' }}>
                    ← Back to Dashboard
                </Link>
                <h1 style={{ marginTop: '1rem' }}>New Slip</h1>
            </div>

            <SlipForm action={createSlip} submitLabel="Save Slip" />
        </div>
    )
}
