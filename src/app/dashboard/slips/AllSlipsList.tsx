'use client'

import { useState } from 'react'
import SwipeableSlipItem from '@/app/components/SwipeableSlipItem'
import { Slip, Tag, Photo } from '@prisma/client'

type SlipWithRelations = Slip & {
    tags: Tag[]
    photos: Photo[]
}

interface AllSlipsListProps {
    slipsByMonth: Record<string, SlipWithRelations[]>
}

export default function AllSlipsList({ slipsByMonth }: AllSlipsListProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    const openLightbox = (url: string) => {
        setSelectedImage(url)
        setLightboxOpen(true)
    }

    return (
        <>
            <div className="space-y-6">
                {Object.entries(slipsByMonth).map(([month, monthSlips]) => (
                    <div key={month}>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-1">{month}</h2>
                        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                            {monthSlips.map((slip) => (
                                <SwipeableSlipItem
                                    key={slip.id}
                                    slip={slip}
                                    openLightbox={openLightbox}
                                />
                            ))}
                        </div>
                    </div>
                ))}
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
        </>
    )
}
