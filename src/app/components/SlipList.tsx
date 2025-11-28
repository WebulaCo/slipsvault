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

export default function SlipList({ slips }: SlipListProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const router = useRouter()

    const openLightbox = (url: string) => {
        setSelectedImage(url)
        setLightboxOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this slip?')) {
            setDeletingId(id)
            try {
                await deleteSlip(id)
                router.refresh()
            } catch (error) {
                console.error("Failed to delete", error)
                alert('Failed to delete slip')
            } finally {
                setDeletingId(null)
            }
        }
    }

    const SlipMenu = ({ slip }: { slip: SlipWithRelations }) => (
        <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm">
                <MoreVertical size={20} className="text-gray-400" />
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-white rounded-box w-52 border border-gray-100">
                <li>
                    <Link href={`/dashboard/slips/${slip.id}`} className="flex items-center gap-2 text-gray-700 hover:bg-gray-50">
                        <Edit size={16} />
                        Edit / View
                    </Link>
                </li>
                <li>
                    <button onClick={() => handleDelete(slip.id)} className="flex items-center gap-2 text-red-600 hover:bg-red-50">
                        {deletingId === slip.id ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 size={16} />}
                        Delete
                    </button>
                </li>
            </ul>
        </div>
    )

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Mobile View (Cards) */}
            <div className="md:hidden">
                {slips.map((slip, index) => (
                    <div key={slip.id} className={`p-4 flex items-center gap-4 ${index !== slips.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                            {slip.photos.length > 0 ? (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden cursor-pointer" onClick={() => openLightbox(slip.photos[0].url)}>
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

                        {/* Middle: Title & Date */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate text-base">{slip.title}</h3>
                            <div className="text-sm text-gray-500 mt-0.5">
                                {slip.date ? new Date(slip.date).toLocaleDateString() : '-'}
                            </div>
                        </div>

                        {/* Right: Amount & Menu */}
                        <div className="flex items-center gap-2">
                            <div className="text-right">
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
                            <SlipMenu slip={slip} />
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
                                    <SlipMenu slip={slip} />
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
