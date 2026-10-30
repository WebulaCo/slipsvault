'use client'

import { useState } from 'react'
import { standardizeSupplierName } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Sparkles, Check } from 'lucide-react'

interface VariantGroup {
    canonicalName: string
    variants: string[]
}

interface MergeSuppliersBannerProps {
    variantGroups: VariantGroup[]
}

export default function MergeSuppliersBanner({ variantGroups }: MergeSuppliersBannerProps) {
    const router = useRouter()
    const [mergingKey, setMergingKey] = useState<string | null>(null)
    const [mergedKeys, setMergedKeys] = useState<Set<string>>(new Set())

    const visibleGroups = variantGroups.filter((g) => !mergedKeys.has(g.canonicalName))
    if (visibleGroups.length === 0) return null

    const handleMerge = async (group: VariantGroup) => {
        setMergingKey(group.canonicalName)
        try {
            await standardizeSupplierName(group.variants, group.canonicalName)
            setMergedKeys((prev) => new Set(prev).add(group.canonicalName))
            router.refresh()
        } catch (err) {
            console.error('Failed to standardize supplier names:', err)
        } finally {
            setMergingKey(null)
        }
    }

    return (
        <div className="bg-teal-50/80 border border-brand-teal/30 rounded-xl p-4 mb-6 space-y-2.5">
            <div className="flex items-center gap-2 text-brand-navy font-bold text-sm">
                <Sparkles size={16} className="text-brand-teal shrink-0" />
                <span>Duplicate Supplier Names Detected (Auto-Grouped Below)</span>
            </div>
            <p className="text-xs text-gray-600">
                We automatically grouped these matching supplier branches together in your analytics. You can also standardize their saved names with one click (branch locations are preserved in Location/Place):
            </p>
            <div className="flex flex-col gap-2 pt-1">
                {visibleGroups.map((g) => (
                    <div
                        key={g.canonicalName}
                        className="bg-white rounded-lg p-2.5 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                        <div className="text-xs text-gray-700">
                            Merge{' '}
                            {g.variants.map((v, i) => (
                                <span key={v}>
                                    {i > 0 && ', '}
                                    <em className="font-medium text-gray-900">&ldquo;{v}&rdquo;</em>
                                </span>
                            ))}{' '}
                            into canonical supplier <strong>&ldquo;{g.canonicalName}&rdquo;</strong>
                        </div>
                        <button
                            type="button"
                            disabled={mergingKey === g.canonicalName}
                            onClick={() => handleMerge(g)}
                            className="btn btn-xs bg-brand-teal hover:bg-brand-teal-hover text-white border-none rounded-lg normal-case shrink-0 flex items-center gap-1"
                        >
                            {mergingKey === g.canonicalName ? (
                                <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                                <Check size={13} />
                            )}
                            Standardize to &ldquo;{g.canonicalName}&rdquo;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
