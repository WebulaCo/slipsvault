'use client'

import { Slip, Tag, Photo } from '@prisma/client'
import Link from 'next/link'
import { useState } from 'react'
import { MapPin, Calendar, X, Receipt, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { deleteSlip } from '@/app/actions'
import { useRouter } from 'next/navigation'

type SlipWithRelations = Slip & {
    tags: Tag[]
    photos: Photo[]
}

interface SlipListProps {
    slips: SlipWithRelations[]
}

import SwipeableSlipItem from './SwipeableSlipItem'
import DeleteConfirmationModal from './DeleteConfirmationModal'

export default function SlipList({ slips }: SlipListProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [slipToDelete, setSlipToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const openLightbox = (url: string) => {
        setSelectedImage(url)
        setLightboxOpen(true)
    }

    const confirmDelete = (id: string) => {
        setSlipToDelete(id)
        setDeleteModalOpen(true)
    }

    const handleDelete = async () => {
        if (!slipToDelete) return

        setIsDeleting(true)
        try {
            await deleteSlip(slipToDelete)
            router.refresh()
        } catch (error: any) {
            if (error.message === 'NEXT_REDIRECT') return
            console.error("Failed to delete", error)
            alert('Failed to delete slip')
        } finally {
            setIsDeleting(false)
            setDeleteModalOpen(false)
            setSlipToDelete(null)
        }
    }

    const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null)

    const handleMenuClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        setMenuPosition({
            top: rect.bottom + window.scrollY,
            left: rect.right - 208 + window.scrollX // 208px is w-52
        })
        setActiveMenuId(activeMenuId === id ? null : id)
    }

    // Close menu when clicking outside
    const [isClient, setIsClient] = useState(false)
    if (typeof window !== 'undefined' && !isClient) {
        setIsClient(true)
    }

    if (isClient) {
        window.addEventListener('click', () => {
            if (activeMenuId) setActiveMenuId(null)
        }, { once: true })
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 relative">
            <div className="md:hidden">
                {slips.map((slip) => (
                    <SwipeableSlipItem
                        key={slip.id}
                        slip={slip}
                        openLightbox={openLightbox}
                    />
                ))}
            </div>

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
                            <tr
                                key={slip.id}
                                className="hover cursor-pointer"
                                onClick={() => router.push(`/dashboard/slips/${slip.id}`)}
                            >
                                <td className="whitespace-nowrap font-mono text-sm">
                                    {slip.date ? new Date(slip.date).toLocaleDateString() : '-'}
                                </td>
                                <td className="font-medium">
                                    <div className="flex items-center gap-3">
                                        {slip.photos.length > 0 && (
                                            <div className="avatar">
                                                <div
                                                    className="w-8 h-8 rounded bg-base-200 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        openLightbox(slip.photos[0].url)
                                                    }}
                                                >
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
                                            <span key={tag.id} className="bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded text-xs font-medium">
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        className="btn btn-ghost btn-circle btn-sm"
                                        onClick={(e) => handleMenuClick(e, slip.id)}
                                    >
                                        <MoreVertical size={20} className="text-gray-400" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Fixed Menu */}
            {activeMenuId && menuPosition && (
                <div
                    className="fixed z-50 bg-white rounded-box w-52 border border-gray-100 shadow-lg p-2 menu"
                    style={{
                        top: menuPosition.top,
                        left: menuPosition.left
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ul>
                        <li>
                            <Link href={`/dashboard/slips/${activeMenuId}`} className="flex items-center gap-2 text-gray-700 hover:bg-gray-50">
                                <Receipt size={16} />
                                View Details
                            </Link>
                        </li>
                        <li>
                            <Link href={`/dashboard/edit/${activeMenuId}`} className="flex items-center gap-2 text-gray-700 hover:bg-gray-50">
                                <Edit size={16} />
                                Edit Slip
                            </Link>
                        </li>
                        <li>
                            <button onClick={() => {
                                confirmDelete(activeMenuId)
                                setActiveMenuId(null)
                            }} className="flex items-center gap-2 text-red-600 hover:bg-red-50">
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </li>
                    </ul>
                </div>
            )}

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

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />
        </div>
    )
}
