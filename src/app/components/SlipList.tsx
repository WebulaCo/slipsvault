'use client'

import { Slip, Tag, Photo } from '@prisma/client'
import Link from 'next/link'
import { useState } from 'react'
import { MapPin, Calendar, X } from 'lucide-react'

type SlipWithRelations = Slip & {
    tags: Tag[]
    photos: Photo[]
}

interface SlipListProps {
    slips: SlipWithRelations[]
}

export default function SlipList({ slips }: SlipListProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    const openLightbox = (url: string) => {
        setSelectedImage(url)
        setLightboxOpen(true)
    }

    if (slips.length === 0) {
        return (
            <div className="card border-2 border-dashed border-base-300 p-16 text-center">
                <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                    📄
                </div>
                <h3 className="text-lg font-bold mb-2">No slips yet</h3>
                <p className="text-base-content/60 mb-8 max-w-md mx-auto">
                    Upload your first slip to start tracking your expenses and organizing your receipts.
                </p>
                <Link href="/dashboard/create" className="btn btn-primary">
                    Upload New Slip
                </Link>
            </div>
        )
    }

    return (
        <div className="bg-base-100 rounded-box shadow">
            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4 p-4">
                {slips.map((slip) => (
                    <div key={slip.id} className="card bg-base-200 shadow-sm">
                        <div className="card-body p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    {slip.photos.length > 0 ? (
                                        <div className="avatar">
                                            <div className="w-12 h-12 rounded bg-base-300 cursor-pointer" onClick={() => openLightbox(slip.photos[0].url)}>
                                                <img
                                                    src={slip.photos[0].url.startsWith('http') ? slip.photos[0].url : `/uploads/${slip.photos[0].url.split('/').pop()}`}
                                                    alt={slip.title}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded bg-base-300 flex items-center justify-center text-2xl">
                                            📄
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{slip.title}</h3>
                                        <div className="text-sm text-base-content/70 flex items-center gap-1 mt-1">
                                            <Calendar size={14} />
                                            {slip.date ? new Date(slip.date).toLocaleDateString() : '-'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-lg">
                                        {slip.currency} {slip.amountAfterTax?.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {slip.place && (
                                <div className="flex items-center gap-2 text-sm text-base-content/70 mb-3">
                                    <MapPin size={14} />
                                    {slip.place}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-1 mb-3">
                                {slip.tags && slip.tags.map(tag => (
                                    <span key={tag.id} className="badge badge-sm badge-ghost">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            <div className="card-actions justify-end">
                                <Link href={`/dashboard/edit/${slip.id}`} className="btn btn-sm btn-outline w-full">
                                    Edit Details
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="table table-zebra w-full">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Title / Merchant</th>
                            <th>Amount</th>
                            <th>Place</th>
                            <th>Tags</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {slips.map((slip) => (
                            <tr key={slip.id} className="hover">
                                <td className="whitespace-nowrap font-mono text-sm">
                                    {slip.date ? new Date(slip.date).toLocaleDateString() : '-'}
                                </td>
                                <td className="font-medium">
                                    <div className="flex items-center gap-3">
                                        {slip.photos.length > 0 && (
                                            <div className="avatar">
                                                <div className="w-8 h-8 rounded bg-base-200 cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => openLightbox(slip.photos[0].url)}>
                                                    <img
                                                        src={slip.photos[0].url.startsWith('http') ? slip.photos[0].url : `/uploads/${slip.photos[0].url.split('/').pop()}`}
                                                        alt={slip.title}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold">{slip.title}</div>
                                            <div className="text-xs opacity-50 md:hidden">{slip.place}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="font-mono">
                                    {slip.currency} {slip.amountAfterTax?.toFixed(2)}
                                </td>
                                <td className="hidden md:table-cell">
                                    {slip.place || '-'}
                                </td>
                                <td>
                                    <div className="flex flex-wrap gap-1">
                                        {slip.tags && slip.tags.map(tag => (
                                            <span key={tag.id} className="badge badge-sm badge-ghost">
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="text-right">
                                    <Link href={`/dashboard/edit/${slip.id}`} className="btn btn-ghost btn-xs">
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Lightbox */}
            {lightboxOpen && selectedImage && (
                <div className="modal modal-open" onClick={() => setLightboxOpen(false)}>
                    <div className="modal-box max-w-5xl p-0 bg-transparent shadow-none overflow-hidden flex items-center justify-center relative">
                        <button className="btn btn-circle btn-sm absolute right-2 top-2 z-50 bg-base-100 border-none" onClick={() => setLightboxOpen(false)}>✕</button>
                        <img
                            src={selectedImage.startsWith('http') ? selectedImage : `/uploads/${selectedImage.split('/').pop()}`}
                            alt="Full size"
                            className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl bg-base-100"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="modal-backdrop bg-black/80"></div>
                </div>
            )}
        </div>
    )
}
