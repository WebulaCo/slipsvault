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
    theme?: 'light' | 'dark'
}

export default function SlipForm({ initialData, action, submitLabel, theme = 'light' }: SlipFormProps) {
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

            if (!result.success) {
                throw new Error(result.error || "Analysis failed");
            }

            setPhotoUrl(result.url!) // url is present on success

            const hasData = result.data && (result.data.place || result.data.date || result.data.amountAfterTax);

            if (hasData) {
                if (result.data!.place) {
                    setPlace(result.data!.place)
                    if (!title) setTitle(result.data!.place)
                }
                if (result.data!.date) setDate(result.data!.date)
                // Only set amountAfterTax (now 'amount')
                if (result.data!.amountAfterTax) setAmount(result.data!.amountAfterTax.toString())
                if (result.data!.currency) setCurrency(result.data!.currency)
                // if (result.data.summary) setSummary(result.data.summary) // Do not auto-populate summary
                if (result.data!.tags && result.data!.tags.length > 0) {
                    setTags(result.data!.tags.join(', '))
                }
            } else {
                console.warn("Analysis returned empty data", result.data);
                setError("Analysis completed but no text could be extracted. Please enter details manually.");
            }
        } catch (err: any) {
            console.error("Analysis failed", err)
            // Show the actual error message for debugging
            setError(err.message || "Could not analyze photo. Please check your API key or enter details manually.")
        } finally {
            setIsAnalyzing(false)
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

    const isDark = theme === 'dark'
    const inputClass = isDark
        ? "input input-bordered w-full bg-[#252a3a] border-gray-700 text-white placeholder-gray-500 focus:border-blue-500"
        : "input input-bordered w-full"
    const labelClass = isDark ? "label-text font-medium text-gray-300" : "label-text font-medium"

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

                {/* Upload Area */}
                <div className="form-control w-full">
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDark ? 'border-gray-700 bg-[#252a3a]/50' : 'border-base-300'
                            } ${dragOver ? 'border-blue-500 bg-blue-500/10' : ''}`}
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
                                <div className="h-32 w-full flex items-center justify-center">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? 'bg-[#2f3545]' : 'bg-gray-100'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-blue-500' : 'text-gray-500'}>
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" x2="12" y1="3" y2="15" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                            <div className="text-center">
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Tap to upload a slip from your gallery or camera
                                </p>
                            </div>
                            <span className="w-full btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white normal-case text-base font-medium h-12 rounded-xl">
                                {isAnalyzing ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs"></span>
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                        {photoUrl ? 'Change Photo' : 'Upload Slip'}
                                    </>
                                )}
                            </span>
                        </label>
                    </div>
                </div>

                <div className={`flex items-center gap-4 my-8 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    <div className="h-px bg-current flex-1 opacity-20"></div>
                    <span className="text-xs font-medium">OR</span>
                    <div className="h-px bg-current flex-1 opacity-20"></div>
                </div>

                <div className="space-y-4">
                    <div className="form-control w-full">
                        <label className="label">
                            <span className={labelClass}>Title / Merchant</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Engen Blouberg Motors"
                            required
                        />
                    </div>

                    <div className="form-control w-full">
                        <label className="label">
                            <span className={labelClass}>Amount</span>
                        </label>
                        <div className="relative">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                $
                            </span>
                            <input
                                type="number"
                                name="amountAfterTax"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                step="0.01"
                                className={`${inputClass} pl-8`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="form-control w-full">
                        <label className="label">
                            <span className={labelClass}>Category</span>
                        </label>
                        <select className={`select select-bordered w-full ${isDark ? 'bg-[#252a3a] border-gray-700 text-white' : ''}`}>
                            <option>Fuel</option>
                            <option>Groceries</option>
                            <option>Travel</option>
                            <option>Utilities</option>
                        </select>
                    </div>

                    <div className="form-control w-full">
                        <label className="label">
                            <span className={labelClass}>Date</span>
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Hidden fields for compatibility or future use */}
                    <input type="hidden" name="place" value={place} />
                    <input type="hidden" name="tags" value={tags} />
                </div>

                <div className="pt-4">
                    <button type="submit" className="w-full btn btn-primary bg-blue-600 hover:bg-blue-700 border-none text-white h-12 rounded-xl text-lg font-medium" disabled={isSubmitting || isAnalyzing}>
                        {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
                        {submitLabel}
                    </button>
                </div>
            </form>

            {/* Modals remain mostly the same, just basic styling */}
            {showDuplicateModal && (
                <div className="modal modal-open">
                    <div className="modal-box text-gray-900">
                        <h3 className="font-bold text-lg text-warning flex items-center gap-2">
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

            {showDeleteModal && (
                <div className="modal modal-open">
                    <div className="modal-box text-gray-900">
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

