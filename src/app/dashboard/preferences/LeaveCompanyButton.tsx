'use client'

import { useState } from 'react'
import { leaveCompany } from '@/app/actions'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LeaveCompanyButton() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLeave = async () => {
        if (!confirm("Are you sure you want to leave this company? You will lose access to all company slips.")) {
            return
        }

        setLoading(true)
        try {
            const result = await leaveCompany()
            if (result.success) {
                router.refresh()
                router.push('/dashboard')
            } else {
                alert(result.error || "Failed to leave company")
            }
        } catch (error) {
            console.error("Error leaving company:", error)
            alert("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleLeave}
            disabled={loading}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm transition-colors disabled:opacity-50"
        >
            <LogOut size={16} />
            {loading ? 'Leaving...' : 'Leave Company'}
        </button>
    )
}
