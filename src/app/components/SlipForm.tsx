'use client'

import { useState, useRef, useEffect } from 'react'
import { analyzeSlip, deleteSlip, checkForDuplicate } from '@/app/actions'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { UploadCloud, X, MapPin, Hash, Camera } from 'lucide-react'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import ImageCropper from './ImageCropper'

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
    const [rawFile, setRawFile] = useState<File | null>(null)
    const [showCropper, setShowCropper] = useState(false)

    // Form State
    const [title, setTitle] = useState(initialData?.title || '')
    const [place, setPlace] = useState(initialData?.place || '')
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : '')
    const [amount, setAmount] = useState(initialData?.amountAfterTax?.toString() || '')
    const [currency, setCurrency] = useState(initialData?.currency || '')
    const [summary, setSummary] = useState(initialData?.summary || '')
    // Use the first tag if available, otherwise empty string
    const [tag, setTag] = useState<string>(initialData?.tags && initialData.tags.length > 0 ? initialData.tags[0].name : '')

    const [error, setError] = useState('')
    const [infoMessage, setInfoMessage] = useState('')
    const [duplicateWarning, setDuplicateWarning] = useState<{ id: string, title: string, userName?: string } | null>(null)

    const categories = [
        'Food', 'Transport', 'Groceries', 'Utilities', 'Shopping',
        'Health', 'Entertainment', 'Travel', 'Office Supplies',
        'Accommodation', 'Other'
    ]

    useEffect(() => {
        const check = async () => {
            if (place && date && amount) {
                const parsedAmount = parseFloat(amount);
                if (isNaN(parsedAmount) || parsedAmount <= 0) {
                    setDuplicateWarning(null);
                    return;
                }
                
                try {
                    const duplicate = await checkForDuplicate({
                        place,
                        date,
                        amount: parsedAmount
                    });
                    
                    if (duplicate && duplicate.id !== initialData?.id) {
                        setDuplicateWarning({
                            id: duplicate.id,
                            title: duplicate.title,
                            userName: duplicate.user?.name || duplicate.user?.email || undefined
                        });
                    } else {
                        setDuplicateWarning(null);
                    }
                } catch (err) {
                    console.error("Duplicate check failed:", err);
                }
            } else {
                setDuplicateWarning(null);
            }
        };

        const timer = setTimeout(check, 500); // Debounce
        return () => clearTimeout(timer);
    }, [place, date, amount, initialData?.id]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement> | File) => {
        let selectedFile: File | undefined

        if (e instanceof File) {
            selectedFile = e
        } else if (e.target.files?.[0]) {
            selectedFile = e.target.files[0]
        }

        if (!selectedFile) return

        setRawFile(selectedFile)
        setShowCropper(true)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleCropComplete = async (croppedFile: File) => {
        setShowCropper(false)
        setRawFile(null)

        setFile(croppedFile)
        setPreview(URL.createObjectURL(croppedFile))
        setIsAnalyzing(true)
        setError('')
        setInfoMessage('')
        setDuplicateWarning(null)

        const formData = new FormData()
        formData.append('photo', croppedFile)

        try {
            const result = await analyzeSlip(formData)

            if (!result.success) {
                throw new Error(result.error || "Analysis failed");
            }

            if (result.usedGrok) {
                setInfoMessage("The first AI was on holiday, so we tried its handsome cousin (Grok) to analyze your slip instead!")
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
                if (result.data!.tag) {
                    // Check if the returned tag is in our list, otherwise default to Other or keep as is if valid
                    const suggestedTag = result.data!.tag
                    // Simple fuzzy match or exact match? Let's try exact match first, or case-insensitive
                    const match = categories.find(c => c.toLowerCase() === suggestedTag.toLowerCase())
                    setTag(match || 'Other')
                }
            } else {
                console.warn("Analysis returned empty data", result.data);
                setError("Analysis completed but no text could be extracted. Please enter details manually.");
            }
        } catch (err: any) {
            console.error("Analysis failed", err)
            const errMsg = err.message || ""
            if (
                errMsg.includes("Gemini") || 
                errMsg.includes("503") || 
                errMsg.includes("service unavailable") || 
                errMsg.includes("500") || 
                errMsg.includes("fetch failed") ||
                errMsg.includes("API key")
            ) {
                setError("Uh Oh the AI went on holiday and can't analyse your slip, please add the details below or try again later.")
            } else {
                setError(errMsg || "Could not analyze photo. Please check your API key or enter details manually.")
            }
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleCropCancel = () => {
        setShowCropper(false)
        setRawFile(null)
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

        // Append tag manually as it is controlled state
        formData.set('tag', tag)

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

        // Proceed directly to action
        try {
            await action(formData)
        } catch (err: unknown) {
            if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
                setError(err.message || 'Failed to create slip')
                setIsSubmitting(false)
            }
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

                {infoMessage && (
                    <div className="alert bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-200 flex gap-2 items-center p-4 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{infoMessage}</span>
                    </div>
                )}

                {duplicateWarning && (
                    <div className="alert alert-warning bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex gap-2 items-start sm:items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span>
                                <strong>Duplicate Detected:</strong> A matching slip already exists (<em>"{duplicateWarning.title}"</em> {duplicateWarning.userName ? `by ${duplicateWarning.userName}` : ''}).
                            </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors shadow-md shrink-0 select-none">
                            <input 
                                type="checkbox" 
                                name="ignoreDuplicate" 
                                className="checkbox border-white [--chkbg:theme(colors.amber.500)] [--chkfg:white]" 
                                required 
                            />
                            <span>Confirm upload anyway</span>
                        </label>
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

                        {isAnalyzing ? (
                            <div className="flex flex-col items-center gap-4 py-8">
                                <span className="loading loading-spinner loading-lg text-brand-teal"></span>
                                <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Analyzing slip...
                                </p>
                            </div>
                        ) : preview ? (
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
                                        Upload or take a photo of your slip
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">Select an image or use your camera</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full btn btn-primary bg-brand-teal hover:bg-brand-teal-hover border-none text-white normal-case text-base font-medium h-12 rounded-xl shadow-md flex items-center justify-center gap-2"
                                >
                                    <Camera size={18} />
                                    Take Photo or Select Image
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

                    {/* Tag Select */}
                    <div className="form-control w-full">
                        <label className="label">
                            <span className={`label-text font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Category</span>
                        </label>
                        <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                name="tag"
                                className={`${inputClass} pl-10 appearance-none`}
                                value={tag}
                                onChange={(e) => setTag(e.target.value)}
                            >
                                <option value="" disabled>Select a category</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>
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


            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={executeDelete}
                isDeleting={isSubmitting}
            />

            {showCropper && rawFile && (
                <ImageCropper
                    file={rawFile}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}
        </>
    )
}

