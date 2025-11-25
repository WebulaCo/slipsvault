'use client'

import { Download } from 'lucide-react'
import { exportSlips } from '@/app/actions'

export default function ExportButton() {
    const handleExport = async () => {
        try {
            const csvData = await exportSlips()

            // Create a blob and download link
            const blob = new Blob([csvData], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `slips-export-${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error("Export failed:", error)
            alert("Failed to export slips")
        }
    }

    return (
        <button
            onClick={handleExport}
            className="btn btn-secondary"
            title="Export to CSV"
        >
            <Download size={16} />
            Export CSV
        </button>
    )
}
