'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmSupplierMerge, previewSupplierMerge } from '@/app/actions'

export interface SupplierMergePreviewSlip {
    id: string
    beforeTitle: string
    beforePlace: string | null
    afterTitle: string
    afterPlace: string | null
}

interface SupplierMergePanelProps {
    names: string[]
    canIncludeCompany: boolean
    onCompleted?: () => void
}

function placeLabel(place: string | null): string {
    return place && place.trim() ? place : 'Empty'
}

export default function SupplierMergePanel({
    names,
    canIncludeCompany,
    onCompleted,
}: SupplierMergePanelProps) {
    const router = useRouter()
    const groupId = useId()
    const suggested = [...names].sort((a, b) => a.length - b.length || a.localeCompare(b))[0] || ''
    const [selectedName, setSelectedName] = useState(suggested)
    const [typedName, setTypedName] = useState('')
    const [includeCompanyMembers, setIncludeCompanyMembers] = useState(false)
    const [preview, setPreview] = useState<SupplierMergePreviewSlip[] | null>(null)
    const [rejectedNames, setRejectedNames] = useState<string[]>([])
    const [error, setError] = useState('')
    const [busy, setBusy] = useState<'preview' | 'confirm' | null>(null)

    const cleanName = typedName.trim() || selectedName

    const clearPreview = () => {
        setPreview(null)
        setRejectedNames([])
        setError('')
    }

    const handlePreview = async () => {
        setBusy('preview')
        setError('')
        try {
            const result = await previewSupplierMerge({
                variantNames: names,
                cleanName,
                includeCompanyMembers,
            })
            if (!result.success) {
                setPreview(null)
                setRejectedNames(result.rejectedNames || [])
                setError(result.error || 'Could not build a preview.')
                return
            }
            setPreview(result.slips)
            setRejectedNames(result.rejectedNames || [])
            if (result.slips.length === 0) {
                setError(result.error || 'No slips would change.')
            }
        } catch (err) {
            setPreview(null)
            setError(err instanceof Error ? err.message : 'Could not build a preview.')
        } finally {
            setBusy(null)
        }
    }

    const handleConfirm = async () => {
        if (!preview || preview.length === 0) return
        setBusy('confirm')
        setError('')
        try {
            const result = await confirmSupplierMerge({
                variantNames: names,
                cleanName,
                includeCompanyMembers,
            })
            if (!result.success) {
                setError(result.error || 'Could not update those slips.')
                return
            }
            setPreview(null)
            onCompleted?.()
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update those slips.')
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
            <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-gray-700">Choose the clean name</legend>
                <div className="flex flex-col gap-2">
                    {names.map((name) => (
                        <label key={name} className="flex items-start gap-2 text-sm text-gray-800 min-h-11">
                            <input
                                type="radio"
                                name={`${groupId}-clean`}
                                className="radio radio-sm mt-1"
                                checked={typedName.trim() === '' && selectedName === name}
                                onChange={() => {
                                    setSelectedName(name)
                                    setTypedName('')
                                    clearPreview()
                                }}
                            />
                            <span className="pt-0.5">{name}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <label className="block text-xs font-semibold text-gray-700">
                Or type a different clean name
                <input
                    type="text"
                    value={typedName}
                    onChange={(e) => {
                        setTypedName(e.target.value)
                        clearPreview()
                    }}
                    placeholder="e.g. Engen"
                    className="input input-bordered w-full bg-white mt-1 h-11"
                />
            </label>

            {canIncludeCompany && (
                <label className="flex items-start gap-2 text-sm text-gray-700 min-h-11">
                    <input
                        type="checkbox"
                        className="checkbox checkbox-sm mt-1"
                        checked={includeCompanyMembers}
                        onChange={(e) => {
                            setIncludeCompanyMembers(e.target.checked)
                            clearPreview()
                        }}
                    />
                    <span className="pt-0.5">
                        Also update slips saved by other people in your company
                    </span>
                </label>
            )}

            <button
                type="button"
                onClick={handlePreview}
                disabled={busy !== null || !cleanName}
                className="btn w-full bg-brand-navy hover:bg-[#0d2e4d] text-white border-none normal-case h-11"
            >
                {busy === 'preview' ? (
                    <span className="loading loading-spinner loading-sm"></span>
                ) : (
                    'Preview changes'
                )}
            </button>

            {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3" role="alert">
                    {error}
                </p>
            )}

            {rejectedNames.length > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    These names do not match &ldquo;{cleanName}&rdquo; and will be left as they are:{' '}
                    {rejectedNames.join(', ')}.
                </p>
            )}

            {preview && preview.length > 0 && (
                <div className="space-y-2" aria-label="Merge preview">
                    <p className="text-xs font-semibold text-brand-navy">
                        Preview — nothing is saved until you confirm ({preview.length}{' '}
                        {preview.length === 1 ? 'slip' : 'slips'})
                    </p>
                    <ul className="space-y-2">
                        {preview.map((slip) => (
                            <li key={slip.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm space-y-2">
                                <div>
                                    <div className="text-[11px] uppercase tracking-wide text-gray-400">Title</div>
                                    <div className="text-gray-500 line-through break-words">{slip.beforeTitle}</div>
                                    <div className="font-semibold text-brand-navy break-words">{slip.afterTitle}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wide text-gray-400">Place</div>
                                    <div className="text-gray-500 line-through break-words">{placeLabel(slip.beforePlace)}</div>
                                    <div className="font-medium text-gray-800 break-words">{placeLabel(slip.afterPlace)}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={busy !== null}
                        className="btn w-full bg-brand-teal hover:bg-brand-teal-hover text-white border-none normal-case h-11"
                    >
                        {busy === 'confirm' ? (
                            <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                            `Confirm and update ${preview.length} ${preview.length === 1 ? 'slip' : 'slips'}`
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
