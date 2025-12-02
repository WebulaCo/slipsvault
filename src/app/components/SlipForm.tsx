'use client'

import { useState, useRef } from 'react'
import { analyzeSlip, deleteSlip, checkForDuplicate } from '@/app/actions'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { UploadCloud, X, MapPin, Hash } from 'lucide-react'

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
    const searchParams = useSearchParams()
    const q = searchParams.get('q')
    const query = q || ''

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [photoUrl, setPhotoUrl] = useState<string>(initialData?.photoUrl || '')
    const [preview, setPreview] = useState<string | null>(initialData?.photoUrl || null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form State
    const [title, setTitle] = useState(initialData?.title || '')
    const [place, setPlace] = useState(initialData?.place || '')
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : '')
    const [amount, setAmount] = useState(initialData?.amountAfterTax?.toString() || '')
    const [currency, setCurrency] = useState(initialData?.currency || '')
    const [summary, setSummary] = useState(initialData?.summary || '')
    const [tags, setTags] = useState<string>(initialData?.tags?.map((t: { name: string }) => t.name).join(', ') || '')

    // Duplicate State
    const [duplicateSlip, setDuplicateSlip] = useState<{ id: string, title: string, date: Date, amountAfterTax: number | null } | null>(null)
    const [showDuplicateModal, setShowDuplicateModal] = useState(false)
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
    const [error, setError] = useState('')

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
        let selectedFile: File | undefined

        if (e instanceof File) {
            selectedFile = e
        } else if (e.target.files?.[0]) {
            selectedFile = e.target.files[0]
        }

        if (!selectedFile) return

        setFile(selectedFile)
        setPreview(URL.createObjectURL(selectedFile))
        setIsAnalyzing(true)

        const formData = new FormData()
        formData.append('photo', selectedFile)

        try {
            const result = await analyzeSlip(formData)

            if (!result.success) {
                throw new Error(result.error || "Analysis failed");
            }

            setPhotoUrl(result.url!)

            const hasData = result.data && (result.data.place || result.data.date || result.data.amountAfterTax);

            if (hasData) {
                if (result.data!.place) {
                    setPlace(result.data!.place)
                    if (!title) setTitle(result.data!.place)
                }
                if (result.data!.date) setDate(result.data!.date)
                if (result.data!.amountAfterTax) setAmount(result.data!.amountAfterTax.toString())
                if (result.data!.currency) setCurrency(result.data!.currency)
                if (result.data!.tags && result.data!.tags.length > 0) {
                    setTags(result.data!.tags.join(', '))
                }
            } else {
                console.warn("Analysis returned empty data", result.data);
                setError("Analysis completed but no text could be extracted. Please enter details manually.");
            }
        } catch (err: any) {
            console.error("Analysis failed", err)
            setError(err.message || "Could not analyze photo. Please check your API key or enter details manually.")
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError('')

        const formData = new FormData(e.currentTarget)

        if (photoUrl) {
            formData.append('photoUrl', photoUrl)
        }

        if (file) {
            formData.append('photo', file)
        }

        // Append tags manually as they are controlled state
        formData.set('tags', tags)

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
            amount: parseFloat(amount)
        }

        if (checkData.place && checkData.date && !isNaN(checkData.amount)) {
            const duplicate = await checkForDuplicate(checkData)
            if (duplicate) {
                setDuplicateSlip(duplicate as any)
                setPendingFormData(formData)
                setShowDuplicateModal(true)
                setIsSubmitting(false)
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
            router.push(`/dashboard/edit/${duplicateSlip?.id}`)
        } else if (decision === 'update') {
            router.push(`/dashboard/edit/${duplicateSlip?.id}`)
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
            handleFileSelect(droppedFile)
        }
    }

    const isDark = theme === 'dark'
    const inputClass = isDark
        ? "input input-bordered w-full bg-[#252a3a] border-gray-700 text-white placeholder-gray-500 focus:border-blue-500"
        : "input input-bordered w-full bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
    const labelClass = isDark ? "label-text font-medium text-gray-300" : "label-text font-medium"

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-8" encType="multipart/form-data">
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
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDark ? 'border-gray-700 bg-[#252a3a]/50' : 'border-gray-200 bg-white hover:border-brand-teal hover:bg-brand-light'}`}
                        onDragOver={(e) => {
                            e.preventDefault()
                            setIsDragging(true)
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/*"
                        />

                        {preview ? (
                            <div className="relative inline-block">
                                <img src={preview} alt="Preview" className="max-h-64 rounded-lg shadow-md" />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setFile(null)
                                        setPreview(null)
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? 'bg-[#2f3545]' : 'bg-brand-teal/10'}`}>
                                    <UploadCloud size={32} className={isDark ? 'text-gray-400' : 'text-brand-teal'} />
                                </div>
                                <div>
                                    <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Drag & drop your slip here
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full btn btn-primary bg-brand-teal hover:bg-brand-teal-hover border-none text-white normal-case text-base font-medium h-12 rounded-xl shadow-md"
                                >
                                    Select File
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Title Input */}
                    <div className="form-control w-full">
                        <label className="label">
                            <span className={`label-text font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Title / Merchant</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            placeholder="e.g. Woolworths Groceries"
                            className={inputClass}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Amount Input */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className={`label-text font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                                <input
                                    type="number"
                                    name="amountAfterTax"
                                    step="0.01"
                                    placeholder="0.00"
                                    className={`${inputClass} pl-8`}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Date Input */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className={`label-text font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date</span>
                            </label>
                            <input
                                type="date"
                                name="date"
                                className={inputClass}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Place Input */}
                    <div className="form-control w-full">
                        <label className="label">
                            <span className={`label-text font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Location / Place</span>
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                name="place"
                                placeholder="e.g. Cape Town"
                                className={`${inputClass} pl-10`}
                                value={place}
                                onChange={(e) => setPlace(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tags Input */}
                    <div className="form-control w-full">
                        <label className="label">
                            <span className={`label-text font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Tags</span>
                        </label>
                        <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                name="tags"
                                placeholder="e.g. groceries, travel, dining"
                                className={`${inputClass} pl-10`}
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                        </div>
                        <label className="label">
                            <span className="label-text-alt text-gray-500">Separate multiple tags with commas</span>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full btn btn-primary bg-brand-navy hover:bg-brand-navy-hover border-none text-white h-12 rounded-xl text-lg font-medium shadow-lg"
                        disabled={isSubmitting || isAnalyzing}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="loading loading-spinner"></span>
                                Saving...
                            </>
                        ) : (
                            'Save Slip'
                        )}
                    </button>
                </div>
            </form>

            {showDuplicateModal && (
                <div className="modal modal-open">
                    <div className="modal-box bg-white text-gray-900">
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
                    <div className="modal-box bg-white text-gray-900">
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

