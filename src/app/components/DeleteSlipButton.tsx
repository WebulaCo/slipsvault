'use client'

import { useState } from 'react'
import { deleteSlip } from '@/app/actions'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DeleteSlipButton({ id, asMenuItem }: { id: string, asMenuItem?: boolean }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteSlip(id)
            router.push('/dashboard/slips')
        } catch (error) {
            console.error("Failed to delete", error)
            setIsDeleting(false)
            setShowModal(false)
        }
    }

    if (asMenuItem) {
        return (
            <>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 text-red-600 hover:bg-red-50 w-full text-left">
                    <Trash2 size={16} />
                    Delete Slip
                </button>
                {/* Modal logic remains same, can be extracted if needed but keeping simple here */}
                {showModal && (
                    <div className="modal modal-open">
                        <div className="modal-box bg-white text-gray-900 border border-gray-100">
                            <h3 className="font-bold text-lg text-red-600">Delete Slip?</h3>
                            <p className="py-4 text-gray-600">
                                Are you sure you want to delete this slip? This action cannot be undone.
                            </p>
                            <div className="modal-action">
                                <button onClick={() => setShowModal(false)} className="btn btn-ghost text-gray-500" disabled={isDeleting}>
                                    Cancel
                                </button>
                                <button onClick={handleDelete} className="btn btn-error bg-red-600 text-white border-none hover:bg-red-700" disabled={isDeleting}>
                                    {isDeleting ? <span className="loading loading-spinner loading-sm"></span> : 'Yes, Delete Slip'}
                                </button>
                            </div>
                        </div>
                        <div className="modal-backdrop bg-black/50" onClick={() => setShowModal(false)}></div>
                    </div>
                )}
            </>
        )
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex-1 btn btn-outline btn-error h-12 rounded-xl text-base font-medium gap-2 bg-white border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200"
            >
                <Trash2 size={18} />
                Delete
            </button>

            {showModal && (
                <div className="modal modal-open">
                    <div className="modal-box bg-white text-gray-900 border border-gray-100">
                        <h3 className="font-bold text-lg text-red-600">Delete Slip?</h3>
                        <p className="py-4 text-gray-600">
                            Are you sure you want to delete this slip? This action cannot be undone.
                        </p>
                        <div className="modal-action">
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost text-gray-500" disabled={isDeleting}>
                                Cancel
                            </button>
                            <button onClick={handleDelete} className="btn btn-error bg-red-600 text-white border-none hover:bg-red-700" disabled={isDeleting}>
                                {isDeleting ? <span className="loading loading-spinner loading-sm"></span> : 'Yes, Delete Slip'}
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop bg-black/50" onClick={() => setShowModal(false)}></div>
                </div>
            )}
        </>
    )
}
