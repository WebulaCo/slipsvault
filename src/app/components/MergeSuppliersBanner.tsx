'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import SupplierMergePanel from './SupplierMergePanel'

interface VariantGroup {
    names: string[]
}

interface MergeSuppliersBannerProps {
    variantGroups: VariantGroup[]
    canIncludeCompany: boolean
}

function groupKey(names: string[]): string {
    return [...names].map((name) => name.toLowerCase()).sort().join('|')
}

export default function MergeSuppliersBanner({
    variantGroups,
    canIncludeCompany,
}: MergeSuppliersBannerProps) {
    const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set())
    const visibleGroups = variantGroups.filter((group) => {
        const key = groupKey(group.names)
        return group.names.length >= 2 && !doneKeys.has(key)
    })

    if (visibleGroups.length === 0) return null

    return (
        <section className="bg-teal-50/80 border border-brand-teal/30 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center gap-2 text-brand-navy font-bold text-sm">
                <Sparkles size={16} className="text-brand-teal shrink-0" />
                <h2>Similar supplier names</h2>
            </div>
            <p className="text-xs text-gray-600">
                These names were grouped for spend totals. Choose the clean name yourself, check each slip, then confirm. Nothing is written before that.
            </p>
            <div className="flex flex-col gap-3">
                {visibleGroups.map((group) => {
                    const key = groupKey(group.names)
                    return (
                        <SupplierMergePanel
                            key={key}
                            names={group.names}
                            canIncludeCompany={canIncludeCompany}
                            onCompleted={() => setDoneKeys((prev) => new Set(prev).add(key))}
                        />
                    )
                })}
            </div>
        </section>
    )
}
