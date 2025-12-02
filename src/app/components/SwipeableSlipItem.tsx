'use client'

import { Slip, Tag, Photo } from '@prisma/client'
import { useState, useRef, TouchEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Edit, Trash2, MoreVertical } from 'lucide-react'
import { deleteSlip } from '@/app/actions'
import Link from 'next/link'

type SlipWithRelations = Slip & {
    tags: Tag[]
    photos: Photo[]
}

interface SwipeableSlipItemProps {
    slip: SlipWithRelations
    openLightbox: (url: string) => void
}

export default function SwipeableSlipItem({ slip, openLightbox }: SwipeableSlipItemProps) {
    const router = useRouter()
    const [startX, setStartX] = useState<number | null>(null)
    const [currentX, setCurrentX] = useState<number>(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const itemRef = useRef<HTMLDivElement>(null)

    const SWIPE_THRESHOLD = 100

    const handleTouchStart = (e: TouchEvent) => {
        setStartX(e.touches[0].clientX)
        setIsSwiping(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
        if (startX === null) return
        const currentTouchX = e.touches[0].clientX
        const diff = currentTouchX - startX

        if (Math.abs(diff) > 10) {
            setIsSwiping(true)
            setCurrentX(diff)
        }
    }

    const handleTouchEnd = async () => {
        if (startX === null) return

        if (currentX > SWIPE_THRESHOLD) {
            router.push(`/dashboard/edit/${slip.id}`)
            setCurrentX(0)
        } else if (currentX < -SWIPE_THRESHOLD) {
            if (confirm('Are you sure you want to delete this slip?')) {
                try {
                    await deleteSlip(slip.id)
                    router.refresh()
                } catch (error: any) {
                    if (error.message === 'NEXT_REDIRECT') return
                    console.error("Failed to delete", error)
                    alert('Failed to delete slip')
                }
            }
            setCurrentX(0)
        } else {
            setCurrentX(0)
        }

        setStartX(null)
        setTimeout(() => setIsSwiping(false), 100)
    }

    const getBackgroundStyle = () => {
        if (currentX > 0) return 'bg-brand-teal'
        if (currentX < 0) return 'bg-red-500'
        return 'bg-white'
    }

    return (
        <div className={`relative overflow-hidden border-b border-gray-100 ${getBackgroundStyle()}`}>
            <div className={`absolute inset-y-0 left-0 w-full flex items-center px-4 text-white font-bold transition-opacity duration-200 ${currentX > 0 ? 'opacity-100' : 'opacity-0'}`}>
                <Edit size={24} className="mr-2" /> Edit
            </div>
            <div className={`absolute inset-y-0 right-0 w-full flex items-center justify-end px-4 text-white font-bold transition-opacity duration-200 ${currentX < 0 ? 'opacity-100' : 'opacity-0'}`}>
                Delete <Trash2 size={24} className="ml-2" />
            </div>

            <div
                ref={itemRef}
                className="bg-white p-4 flex items-center gap-4 relative z-10 transition-transform duration-100 ease-out"
                style={{ transform: `translateX(${currentX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                    if (!isSwiping) router.push(`/dashboard/slips/${slip.id}`)
                }}
            >
                <div className="flex-shrink-0" onClick={(e) => {
                    e.stopPropagation();
                    if (!isSwiping && slip.photos.length > 0) openLightbox(slip.photos[0].url)
                }}>
                    {slip.photos.length > 0 ? (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden cursor-pointer">
                            <img
                                src={slip.photos[0].url.startsWith('http') ? slip.photos[0].url : `/uploads/${slip.photos[0].url.split('/').pop()}`}
                                alt={slip.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <Receipt size={20} />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 pointer-events-none">
                    <h3 className="font-semibold text-gray-900 truncate text-base">{slip.title}</h3>
                    <div className="text-sm text-gray-500 mt-0.5">
                        {slip.date ? new Date(slip.date).toLocaleDateString() : '-'}
                    </div>
                </div>

                <div className="text-right flex-shrink-0 pointer-events-none">
                    <div className="font-bold text-gray-900 text-base">
                        {slip.amountAfterTax?.toFixed(2)}
                    </div>
                    {slip.tags && slip.tags.length > 0 && (
                        <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                {slip.tags[0].name}
                            </span>
                        </div>
                    )}
                </div>

                <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setShowMenu(true)}
                        className="btn btn-ghost btn-circle btn-sm"
                    >
                        <MoreVertical size={20} className="text-gray-400" />
                    </button>

                    {showMenu && (
                        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50" onClick={() => setShowMenu(false)}>
                            <div className="bg-white w-full sm:w-80 sm:rounded-2xl rounded-t-2xl p-4 space-y-2" onClick={e => e.stopPropagation()}>
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

                                <h3 className="text-center font-bold text-gray-900 mb-4">Actions</h3>

                                <Link
                                    href={`/dashboard/slips/${slip.id}`}
                                    className="btn btn-ghost w-full justify-start text-gray-700 text-base h-12"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <Receipt size={20} />
                                    View Details
                                </Link>

                                <Link
                                    href={`/dashboard/edit/${slip.id}`}
                                    className="btn btn-ghost w-full justify-start text-gray-700 text-base h-12"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <Edit size={20} />
                                    Edit Slip
                                </Link>

                                <button
                                    onClick={async () => {
                                        setShowMenu(false);
                                        if (confirm('Are you sure you want to delete this slip?')) {
                                            try {
                                                await deleteSlip(slip.id)
                                                router.refresh()
                                            } catch (error: any) {
                                                if (error.message === 'NEXT_REDIRECT') return
                                                console.error("Failed to delete", error)
                                                alert('Failed to delete slip')
                                            }
                                        }
                                    }}
                                    className="btn btn-ghost w-full justify-start text-red-600 hover:bg-red-50 text-base h-12"
                                >
                                    <Trash2 size={20} />
                                    Delete Slip
                                </button>

                                <button
                                    className="btn btn-outline w-full mt-4 rounded-xl"
                                    onClick={() => setShowMenu(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
