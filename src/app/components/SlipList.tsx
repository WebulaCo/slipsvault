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
        <div className="overflow-x-auto bg-base-100 rounded-box shadow">
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

            {/* Lightbox */}
            {lightboxOpen && selectedImage && (
                <div className="modal modal-open" onClick={() => setLightboxOpen(false)}>
                    <div className="modal-box max-w-5xl p-0 bg-transparent shadow-none overflow-hidden flex items-center justify-center relative">
                        <button className="btn btn-circle btn-sm absolute right-2 top-2 z-50 bg-base-100 border-none" onClick={() => setLightboxOpen(false)}>✕</button>
                        <img
                            src={`/uploads/${selectedImage.split('/').pop()}`}
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
