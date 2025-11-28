'use client'

import { useState } from 'react'
import { deleteSlip } from '@/app/actions'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DeleteSlipButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteSlip(id)
            // Redirect is handled by server action or we can push
            router.push('/dashboard/slips')
        } catch (error) {
            console.error("Failed to delete", error)
            setIsDeleting(false)
            setShowModal(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex-1 btn btn-outline btn-error h-12 rounded-xl text-base font-medium gap-2 bg-[#2a1f2e] border-red-900/50 text-red-500 hover:bg-red-900/20 hover:border-red-500"
            >
                <Trash2 size={18} />
                Delete
            </button>

            {showModal && (
                <div className="modal modal-open">
                    <div className="modal-box bg-[#252a3a] text-white border border-gray-700">
                        <h3 className="font-bold text-lg text-red-400">Delete Slip?</h3>
                        <p className="py-4 text-gray-300">
                            Are you sure you want to delete this slip? This action cannot be undone.
                        </p>
                        <div className="modal-action">
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost text-gray-400 hover:text-white" disabled={isDeleting}>
                                Cancel
                            </button>
                            <button onClick={handleDelete} className="btn btn-error" disabled={isDeleting}>
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
