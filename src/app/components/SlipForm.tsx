'use client'

import { useState } from 'react'
import { analyzeSlip, deleteSlip, checkForDuplicate } from '@/app/actions'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface SlipData {
    id?: string
    title: string
    place?: string
    date?: string
    amountBeforeTax?: number
    taxAmount?: number
    amountAfterTax?: number
    currency?: string
    summary?: string
    content?: string
    photoUrl?: string
    tags?: { name: string }[]
}

interface SlipFormProps {
    initialData?: SlipData
    action: (formData: FormData) => Promise<void>
    submitLabel: string
}

export default function SlipForm({ initialData, action }: SlipFormProps) {
    const router = useRouter()
    const searchParams = useSearchParams() // Correctly use useSearchParams hook
    const q = searchParams.get('q') // Get 'q' from search params
    const query = q || ''

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [photoUrl, setPhotoUrl] = useState<string>(initialData?.photoUrl || '')

    // Form State
    const [title, setTitle] = useState(initialData?.title || '')
    const [place, setPlace] = useState(initialData?.place || '')
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : '')
    // Removed amountBeforeTax and taxAmount states
    const [amount, setAmount] = useState(initialData?.amountAfterTax?.toString() || '') // Renamed from amountAfterTax
    const [currency, setCurrency] = useState(initialData?.currency || '')
    const [summary, setSummary] = useState(initialData?.summary || '') // Removed initialData?.content
    const [tags, setTags] = useState<string>(initialData?.tags?.map((t: { name: string }) => t.name).join(', ') || '') // New state for tags

    // Duplicate State
    const [duplicateSlip, setDuplicateSlip] = useState<{ id: string, title: string, date: Date, amountAfterTax: number | null } | null>(null) // Renamed from duplicate
    const [showDuplicateModal, setShowDuplicateModal] = useState(false)
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
    const [error, setError] = useState('') // New state for error messages

    const handleFileChange = async (selectedFile: File) => { // Renamed from handleFileSelect
        setFile(selectedFile)
        setIsAnalyzing(true) // Use new state name

        const formData = new FormData()
        formData.append('photo', selectedFile)

        try {
            const result = await analyzeSlip(formData)
            setPhotoUrl(result.url)

            if (result.data && Object.keys(result.data).length > 0) {
                if (result.data.place) {
                    setPlace(result.data.place)
                    if (!title) setTitle(result.data.place)
                }
                if (result.data.date) setDate(result.data.date)
                // Only set amountAfterTax (now 'amount')
                if (result.data.amountAfterTax) setAmount(result.data.amountAfterTax.toString())
                if (result.data.currency) setCurrency(result.data.currency)
                // if (result.data.summary) setSummary(result.data.summary) // Do not auto-populate summary
                if (result.data.tags && result.data.tags.length > 0) {
                    setTags(result.data.tags.join(', '))
                }
            } else {
                console.warn("Analysis returned empty data");
                // Don't alert here to avoid annoying user if they just want to upload, 
                // but maybe show a toast or small message? 
                // For now, let's just log it. The user will see fields empty.
            }
        } catch (_e) { // Changed error to _e as it's not used
            console.error("Analysis failed", _e) // Log the error
            alert("Could not analyze photo. Please enter details manually.")
        } finally {
            setIsAnalyzing(false) // Use new state name
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true) // Use new state name
        setError('') // Clear previous errors

        const formData = new FormData(e.currentTarget)

        if (photoUrl) {
            formData.append('photoUrl', photoUrl)
        } else if (file) {
            formData.append('photo', file)
        }

        // Append tags manually as they are controlled state
        formData.set('tags', tags)

        // If editing, just submit directly (duplicate check usually for new slips, but could be added if needed)
        if (initialData) {
            try {
                await action(formData)
            } catch (err: unknown) {
                if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
                    setError(err.message || 'Failed to update slip')
                    setIsSubmitting(false)
                }
            }
            return
        }

        // For new slips, check for duplicates first
        const checkData = {
            place: place,
            date: date,
            amount: parseFloat(amount) // Use 'amount' state
        }

        if (checkData.place && checkData.date && !isNaN(checkData.amount)) {
            const duplicate = await checkForDuplicate(checkData)
            if (duplicate) {
                setDuplicateSlip(duplicate as any) // Cast to any to avoid stale type errors
                setPendingFormData(formData)
                setShowDuplicateModal(true)
                setIsSubmitting(false) // Use new state name
                return
            }
        }

        // No duplicate, proceed
        try {
            await action(formData)
        } catch (err: unknown) {
            if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
                setError(err.message || 'Failed to create slip')
                setIsSubmitting(false)
            }
        }
    }

    const handleDuplicateDecision = async (decision: 'new' | 'view' | 'update') => {
        setShowDuplicateModal(false)

        if (decision === 'new' && pendingFormData) {
            setIsSubmitting(true)
            try {
                await action(pendingFormData)
            } catch (err: unknown) {
                if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
                    setError(err.message || 'Failed to create slip')
                    setIsSubmitting(false)
                }
            }
        } else if (decision === 'view') {
            // Redirect to the existing slip
            router.push(`/dashboard/edit/${duplicateSlip?.id}`) // Use router.push
        } else if (decision === 'update') {
            // Redirect to edit page of existing slip (user can then update it)
            router.push(`/dashboard/edit/${duplicateSlip?.id}`) // Use router.push
        }
    }

    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const handleDeleteClick = () => {
        setShowDeleteModal(true)
    }

    const executeDelete = async () => {
        if (!initialData?.id) return

        setIsSubmitting(true)
        try {
            await deleteSlip(initialData.id)
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'NEXT_REDIRECT') return
            console.error(error)
            alert("Failed to delete slip")
            setIsSubmitting(false)
            setShowDeleteModal(false)
        }
    }

    const [dragOver, setDragOver] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) {
            handleFileChange(droppedFile)
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
                {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}
                {initialData?.photoUrl && <input type="hidden" name="photoUrl" value={initialData.photoUrl} />}

                {error && (
                    <div className="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium">Slip Photo</span>
                            </label>
                            <div
                                className={`border-2 border-dashed rounded-box p-8 text-center transition-all duration-200 ${dragOver ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-base-300 hover:border-primary/50'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    name="photo"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const selectedFile = e.target.files?.[0];
                                        if (selectedFile) handleFileChange(selectedFile);
                                    }}
                                    className="hidden"
                                    id="photo-upload"
                                />
                                <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center gap-4">
                                    {photoUrl ? (
                                        <div className="relative flex items-center justify-center bg-base-200 rounded-lg overflow-hidden p-2 w-full">
                                            <img
                                                src={photoUrl.startsWith('http') ? photoUrl : `/uploads/${photoUrl.split('/').pop()}`}
                                                alt="Preview"
                                                className="w-full max-h-[400px] object-contain shadow-sm rounded-md"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-48 w-full flex items-center justify-center text-base-content/40">
                                            <div className="flex flex-col items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                                </svg>
                                                <span className="text-lg font-medium">Drag & Drop or Click to Upload</span>
                                                <span className="text-sm opacity-70">Supports JPG, PNG</span>
                                            </div>
                                        </div>
                                    )}
                                    <span className="btn btn-sm btn-outline btn-primary">
                                        {isAnalyzing ? (
                                            <>
                                                <span className="loading loading-spinner loading-xs"></span>
                                                Analyzing...
                                            </>
                                        ) : (photoUrl ? 'Change Photo' : 'Select Photo')}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium">Title / Merchant</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="input input-bordered w-full"
                                placeholder="e.g. Starbucks, Uber"
                                required
                            />
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium">Place / Location</span>
                            </label>
                            <input
                                type="text"
                                name="place"
                                value={place}
                                onChange={(e) => setPlace(e.target.value)}
                                className="input input-bordered w-full"
                                placeholder="e.g. 123 Main St"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text font-medium">Date</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="input input-bordered w-full"
                                />
                            </div>
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text font-medium">Amount</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 font-medium">
                                        {currency}
                                    </span>
                                    <input
                                        type="number"
                                        name="amountAfterTax"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        step="0.01"
                                        className="input input-bordered w-full pl-10"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium">Tags</span>
                            </label>
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                className="input input-bordered w-full"
                                placeholder="e.g. Food, Travel, Business"
                            />
                            <label className="label">
                                <span className="label-text-alt text-base-content/60">Separate multiple tags with commas.</span>
                            </label>
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-medium">Summary / Notes</span>
                            </label>
                            <textarea
                                name="summary"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className="textarea textarea-bordered h-32 resize-none text-base"
                                placeholder="Add any additional notes..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-base-300">
                    <Link href="/dashboard" className="btn btn-ghost">
                        Cancel
                    </Link>
                    {initialData?.id && (
                        <button
                            type="button"
                            onClick={handleDeleteClick}
                            className="btn btn-error btn-outline"
                            disabled={isSubmitting}
                        >
                            Delete
                        </button>
                    )}
                    <button type="submit" className="btn btn-primary px-8" disabled={isSubmitting || isAnalyzing}>
                        {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
                        {initialData ? 'Update Slip' : 'Create Slip'}
                    </button>
                </div>
            </form>

            {/* Duplicate Warning Modal */}
            {showDuplicateModal && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg text-warning flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Possible Duplicate Found
                        </h3>
                        <p className="py-4">
                            We found a similar slip from <strong>{duplicateSlip?.date ? new Date(duplicateSlip.date).toLocaleDateString() : 'Unknown Date'}</strong> for <strong>{duplicateSlip?.amountAfterTax}</strong>.
                        </p>
                        <div className="modal-action flex-col gap-2">
                            <button onClick={() => handleDuplicateDecision('view')} className="btn btn-outline w-full">
                                View Existing Slip
                            </button>
                            <button onClick={() => handleDuplicateDecision('new')} className="btn btn-primary w-full">
                                Save as New Anyway
                            </button>
                            <button onClick={() => setShowDuplicateModal(false)} className="btn btn-ghost w-full">
                                Cancel
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => setShowDuplicateModal(false)}></div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg text-error">Delete Slip?</h3>
                        <p className="py-4">
                            Are you sure you want to delete this slip? This action cannot be undone.
                        </p>
                        <div className="modal-action">
                            <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost" disabled={isSubmitting}>
                                Cancel
                            </button>
                            <button onClick={executeDelete} className="btn btn-error" disabled={isSubmitting}>
                                {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Yes, Delete Slip'}
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}></div>
                </div>
            )}
        </>
    )
}

