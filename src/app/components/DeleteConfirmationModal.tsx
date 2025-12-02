'use client'

interface DeleteConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title?: string
    message?: string
    isDeleting?: boolean
}

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Delete Slip?",
    message = "Are you sure you want to delete this slip? This action cannot be undone.",
    isDeleting = false
}: DeleteConfirmationModalProps) {
    if (!isOpen) return null

    return (
        <>
            <div className="modal modal-open">
                <div className="modal-box bg-white text-gray-900">
                    <h3 className="font-bold text-lg text-error">{title}</h3>
                    <p className="py-4">
                        {message}
                    </p>
                    <div className="modal-action">
                        <button onClick={onClose} className="btn btn-ghost" disabled={isDeleting}>
                            Cancel
                        </button>
                        <button onClick={onConfirm} className="btn btn-error" disabled={isDeleting}>
                            {isDeleting ? <span className="loading loading-spinner loading-sm"></span> : 'Yes, Delete Slip'}
                        </button>
                    </div>
                </div>
                <div className="modal-backdrop" onClick={onClose}></div>
            </div>
        </>
    )
}
