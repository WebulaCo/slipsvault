import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clusterSupplierTitles, suggestPlaceAsSupplier } from '@/lib/suppliers'
import MergeSuppliersBanner from '@/app/components/MergeSuppliersBanner'
import PlaceSupplierSuggestion from '@/app/components/PlaceSupplierSuggestion'
import Link from 'next/link'
import { ChevronLeft, Store } from 'lucide-react'

export default async function SupplierReviewPage() {
    const session = await getServerSession(authOptions)
    if (!session) return null

    const isCompanyView =
        (session.user.role === 'COMPANY_ADMIN' ||
            session.user.role === 'ACCOUNTANT' ||
            session.user.role === 'ADMIN') &&
        session.user.companyId

    const whereClause = isCompanyView
        ? { user: { companyId: session.user.companyId } }
        : { userId: session.user.id }

    const slips = await prisma.slip.findMany({
        where: whereClause,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, title: true, place: true, userId: true },
    })

    const canEdit = session.user.role !== 'ACCOUNTANT'
    const canIncludeCompany =
        (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ADMIN') &&
        !!session.user.companyId

    const ownSlips = canIncludeCompany ? slips.filter((slip) => slip.userId === session.user.id) : slips
    const clusters = clusterSupplierTitles(ownSlips.map((slip) => slip.title || '')).map((names) => ({ names }))
    const notes = ownSlips
        .map((slip) => ({ slip, suggested: suggestPlaceAsSupplier(slip) }))
        .filter((item): item is { slip: (typeof slips)[number]; suggested: string } => !!item.suggested)

    return (
        <div className="pb-20">
            <header className="flex flex-col items-start gap-3 mb-6">
                <Link href="/dashboard/suppliers" className="flex items-center gap-1 font-medium text-brand-teal min-h-11">
                    <ChevronLeft size={20} />
                    Suppliers
                </Link>
                <h1 className="text-xl font-bold text-brand-navy flex items-center gap-2">
                    <Store size={22} className="text-brand-teal shrink-0" />
                    Review supplier names
                </h1>
                <p className="text-sm text-gray-500">
                    Suggestions only. Pick a clean name or use the place on a note, check the before and after, then confirm. Nothing is written before that.
                </p>
            </header>

            {clusters.length === 0 && notes.length === 0 ? (
                <div className="card bg-white border border-gray-100 rounded-xl p-8 text-center">
                    <h2 className="text-lg font-bold text-brand-navy mb-2">Nothing to review</h2>
                    <p className="text-sm text-gray-500">Supplier names on your slips already look consistent.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {canEdit && clusters.length > 0 && (
                        <section>
                            <h2 className="text-base font-bold text-brand-navy mb-3">Similar names</h2>
                            <MergeSuppliersBanner variantGroups={clusters} canIncludeCompany={canIncludeCompany} />
                        </section>
                    )}

                    {canEdit && notes.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-base font-bold text-brand-navy">Notes that look like a place</h2>
                            <p className="text-xs text-gray-500">
                                The title reads like a reminder. The place looks like the merchant. Confirm to use that place as the supplier name. The place itself stays.
                            </p>
                            {notes.map(({ slip }) => (
                                <PlaceSupplierSuggestion
                                    key={slip.id}
                                    slipId={slip.id}
                                    beforeTitle={slip.title}
                                    beforePlace={slip.place}
                                    canIncludeCompany={false}
                                />
                            ))}
                        </section>
                    )}

                    {!canEdit && (
                        <p className="text-sm text-gray-500">Accountants can view slips, but cannot rename suppliers.</p>
                    )}
                </div>
            )}
        </div>
    )
}
