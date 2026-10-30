'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmPlaceAsSupplier, previewPlaceAsSupplier } from '@/app/actions'

interface PlaceSupplierSuggestionProps {
    slipId: string
    beforeTitle: string
    beforePlace: string | null
    canIncludeCompany: boolean
}

function placeLabel(place: string | null): string {
    return place && place.trim() ? place : 'Empty'
}

export default function PlaceSupplierSuggestion({
    slipId,
    beforeTitle,
    beforePlace,
    canIncludeCompany,
}: PlaceSupplierSuggestionProps) {
    const router = useRouter()
    const [includeCompanyMembers, setIncludeCompanyMembers] = useState(false)
    const [preview, setPreview] = useState<{ afterTitle: string; afterPlace: string | null } | null>(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState<'preview' | 'confirm' | null>(null)
    const [done, setDone] = useState(false)

    if (done) return null

    const handlePreview = async () => {
        setBusy('preview')
        setError('')
        try {
            const result = await previewPlaceAsSupplier({ slipId, includeCompanyMembers })
            if (!result.success || !result.slip) {
                setPreview(null)
                setError(result.error || 'Could not build a preview.')
                return
            }
            setPreview({ afterTitle: result.slip.afterTitle, afterPlace: result.slip.afterPlace })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not build a preview.')
        } finally {
            setBusy(null)
        }
    }

    const handleConfirm = async () => {
        if (!preview) return
        setBusy('confirm')
        setError('')
        try {
            const result = await confirmPlaceAsSupplier({ slipId, includeCompanyMembers })
            if (!result.success) {
                setError(result.error || 'Could not update that slip.')
                return
            }
            setDone(true)
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update that slip.')
        } finally {
            setBusy(null)
        }
    }

    return (
        <article className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
            <p className="text-sm text-gray-700">
                <span className="font-semibold text-brand-navy">{beforeTitle}</span>
                <span className="text-gray-500"> has place </span>
                <span className="font-semibold text-brand-navy">{placeLabel(beforePlace)}</span>
            </p>
            {canIncludeCompany && (
                <label className="flex items-start gap-2 text-sm text-gray-700 min-h-11">
                    <input
                        type="checkbox"
                        className="checkbox checkbox-sm mt-1"
                        checked={includeCompanyMembers}
                        onChange={(e) => {
                            setIncludeCompanyMembers(e.target.checked)
                            setPreview(null)
                            setError('')
                        }}
                    />
                    <span className="pt-0.5">This slip belongs to someone else in the company</span>
                </label>
            )}
            <button
                type="button"
                onClick={handlePreview}
                disabled={busy !== null}
                className="btn w-full bg-brand-navy hover:bg-[#0d2e4d] text-white border-none normal-case h-11"
            >
                {busy === 'preview' ? <span className="loading loading-spinner loading-sm"></span> : 'Preview using place'}
            </button>
            {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3" role="alert">
                    {error}
                </p>
            )}
            {preview && (
                <div className="space-y-2" aria-label="Place suggestion preview">
                    <p className="text-xs font-semibold text-brand-navy">Preview — nothing is saved until you confirm</p>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm space-y-2">
                        <div>
                            <div className="text-[11px] uppercase tracking-wide text-gray-400">Title</div>
                            <div className="text-gray-500 line-through break-words">{beforeTitle}</div>
                            <div className="font-semibold text-brand-navy break-words">{preview.afterTitle}</div>
                        </div>
                        <div>
                            <div className="text-[11px] uppercase tracking-wide text-gray-400">Place</div>
                            <div className="text-gray-500 line-through break-words">{placeLabel(beforePlace)}</div>
                            <div className="font-medium text-gray-800 break-words">{placeLabel(preview.afterPlace)}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={busy !== null}
                        className="btn w-full bg-brand-teal hover:bg-brand-teal-hover text-white border-none normal-case h-11"
                    >
                        {busy === 'confirm' ? (
                            <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                            'Confirm supplier name'
                        )}
                    </button>
                </div>
            )}
        </article>
    )
}
