'use client'

import { useState, useRef, useEffect } from 'react'
import { RotateCw, X, Check, RefreshCw } from 'lucide-react'

interface ImageCropperProps {
    file: File
    onCropComplete: (croppedFile: File) => void
    onCancel: () => void
}

export default function ImageCropper({ file, onCropComplete, onCancel }: ImageCropperProps) {
    const [currentImageUrl, setCurrentImageUrl] = useState<string>('')
    const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 })
    const [isImgLoaded, setIsImgLoaded] = useState(false)
    
    const imageRef = useRef<HTMLImageElement>(null)
    const originalFileUrlRef = useRef<string>('')

    // Create object URL for the initial file
    useEffect(() => {
        const url = URL.createObjectURL(file)
        originalFileUrlRef.current = url
        setCurrentImageUrl(url)
        
        return () => {
            if (originalFileUrlRef.current) {
                URL.revokeObjectURL(originalFileUrlRef.current)
            }
        }
    }, [file])

    const handleImageLoad = () => {
        setIsImgLoaded(true)
    }

    const handleReset = () => {
        setCurrentImageUrl(originalFileUrlRef.current)
        setCrop({ x: 10, y: 10, w: 80, h: 80 })
    }

    const handleRotate = () => {
        if (!isImgLoaded) return
        
        const img = new Image()
        img.src = currentImageUrl
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.height
            canvas.height = img.width

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Rotate 90 deg clockwise
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate((90 * Math.PI) / 180)
            ctx.drawImage(img, -img.width / 2, -img.height / 2)

            const rotatedUrl = canvas.toDataURL('image/jpeg', 0.9)
            setCurrentImageUrl(rotatedUrl)
            setCrop({ x: 10, y: 10, w: 80, h: 80 })
        }
    }

    const handleCropSubmit = () => {
        if (!isImgLoaded) return

        const img = new Image()
        img.src = currentImageUrl
        img.onload = () => {
            const canvas = document.createElement('canvas')
            
            // Calculate absolute crop coordinates on the original image
            const cropX = (crop.x / 100) * img.width
            const cropY = (crop.y / 100) * img.height
            const cropW = (crop.w / 100) * img.width
            const cropH = (crop.h / 100) * img.height

            canvas.width = cropW
            canvas.height = cropH

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.drawImage(
                img,
                cropX, cropY, cropW, cropH,
                0, 0, cropW, cropH
            )

            canvas.toBlob((blob) => {
                if (!blob) return
                const croppedFile = new File([blob], file.name || 'cropped-receipt.jpg', {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                })
                onCropComplete(croppedFile)
            }, 'image/jpeg', 0.9)
        }
    }

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        const target = e.target as HTMLElement
        const handle = target.getAttribute('data-handle') || 'move'

        const imgEl = imageRef.current
        if (!imgEl) return
        const rect = imgEl.getBoundingClientRect()

        const startState = {
            clientX,
            clientY,
            crop: { ...crop },
            rectWidth: rect.width,
            rectHeight: rect.height,
            handle
        }

        const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
            const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
            const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY

            const deltaX = ((currentX - startState.clientX) / startState.rectWidth) * 100
            const deltaY = ((currentY - startState.clientY) / startState.rectHeight) * 100

            setCrop((prevCrop) => {
                const newCrop = { ...prevCrop }

                if (startState.handle === 'move') {
                    newCrop.x = Math.max(0, Math.min(100 - newCrop.w, startState.crop.x + deltaX))
                    newCrop.y = Math.max(0, Math.min(100 - newCrop.h, startState.crop.y + deltaY))
                } else {
                    // Resize logic
                    if (startState.handle.includes('t')) {
                        const bottom = startState.crop.y + startState.crop.h
                        newCrop.y = Math.max(0, Math.min(bottom - 5, startState.crop.y + deltaY))
                        newCrop.h = bottom - newCrop.y
                    }
                    if (startState.handle.includes('b')) {
                        newCrop.h = Math.max(5, Math.min(100 - startState.crop.y, startState.crop.h + deltaY))
                    }
                    if (startState.handle.includes('l')) {
                        const right = startState.crop.x + startState.crop.w
                        newCrop.x = Math.max(0, Math.min(right - 5, startState.crop.x + deltaX))
                        newCrop.w = right - newCrop.x
                    }
                    if (startState.handle.includes('r')) {
                        newCrop.w = Math.max(5, Math.min(100 - startState.crop.x, startState.crop.w + deltaX))
                    }
                }
                return newCrop
            })
        }

        const handleDragEnd = () => {
            window.removeEventListener('mousemove', handleDragMove)
            window.removeEventListener('mouseup', handleDragEnd)
            window.removeEventListener('touchmove', handleDragMove)
            window.removeEventListener('touchend', handleDragEnd)
        }

        window.addEventListener('mousemove', handleDragMove)
        window.addEventListener('mouseup', handleDragEnd)
        window.addEventListener('touchmove', handleDragMove)
        window.addEventListener('touchend', handleDragEnd)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-[#1e2330] rounded-2xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#171a25]">
                    <div>
                        <h3 className="text-lg font-bold text-white">Crop & Align Receipt</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Rotate or drag the crop box to frame your receipt perfectly.</p>
                    </div>
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Cropping Canvas Area */}
                <div className="flex-1 p-6 flex items-center justify-center bg-[#11141e] overflow-auto min-h-[300px]">
                    <div className="relative inline-block max-w-full max-h-[50vh] select-none">
                        {currentImageUrl && (
                            <img
                                ref={imageRef}
                                src={currentImageUrl}
                                alt="Crop Target"
                                className="max-w-full max-h-[50vh] object-contain block"
                                onLoad={handleImageLoad}
                                draggable={false}
                            />
                        )}

                        {isImgLoaded && (
                            <>
                                {/* Backdrop Overlays (Dim Unselected Area) */}
                                <div 
                                    className="absolute bg-black/60 pointer-events-none transition-all duration-75"
                                    style={{ left: 0, top: 0, width: '100%', height: `${crop.y}%` }}
                                />
                                <div 
                                    className="absolute bg-black/60 pointer-events-none transition-all duration-75"
                                    style={{ left: 0, top: `${crop.y + crop.h}%`, width: '100%', height: `${100 - crop.y - crop.h}%` }}
                                />
                                <div 
                                    className="absolute bg-black/60 pointer-events-none transition-all duration-75"
                                    style={{ left: 0, top: `${crop.y}%`, width: `${crop.x}%`, height: `${crop.h}%` }}
                                />
                                <div 
                                    className="absolute bg-black/60 pointer-events-none transition-all duration-75"
                                    style={{ left: `${crop.x + crop.w}%`, top: `${crop.y}%`, width: `${100 - crop.x - crop.w}%`, height: `${crop.h}%` }}
                                />

                                {/* Interactive Crop Rectangle */}
                                <div
                                    className="absolute border-2 border-brand-teal bg-brand-teal/5 shadow-[0_0_0_1px_rgba(255,255,255,0.3)] cursor-move transition-all duration-75"
                                    style={{
                                        left: `${crop.x}%`,
                                        top: `${crop.y}%`,
                                        width: `${crop.w}%`,
                                        height: `${crop.h}%`
                                    }}
                                    onMouseDown={handleDragStart}
                                    onTouchStart={handleDragStart}
                                >
                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                                        <div className="border-r border-b border-white/20" />
                                        <div className="border-r border-b border-white/20" />
                                        <div className="border-b border-white/20" />
                                        <div className="border-r border-b border-white/20" />
                                        <div className="border-r border-b border-white/20" />
                                        <div className="border-b border-white/20" />
                                        <div className="border-r border-white/20" />
                                        <div className="border-r border-white/20" />
                                        <div />
                                    </div>

                                    {/* Corner Handles (Large touch targets) */}
                                    <div 
                                        className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-brand-teal rounded-full cursor-nwse-resize border-2 border-white shadow-lg flex items-center justify-center" 
                                        data-handle="tl" 
                                    />
                                    <div 
                                        className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-brand-teal rounded-full cursor-nesw-resize border-2 border-white shadow-lg flex items-center justify-center" 
                                        data-handle="tr" 
                                    />
                                    <div 
                                        className="absolute -bottom-3.5 -left-3.5 w-7 h-7 bg-brand-teal rounded-full cursor-nesw-resize border-2 border-white shadow-lg flex items-center justify-center" 
                                        data-handle="bl" 
                                    />
                                    <div 
                                        className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-brand-teal rounded-full cursor-nwse-resize border-2 border-white shadow-lg flex items-center justify-center" 
                                        data-handle="br" 
                                    />

                                    {/* Edge Resize Regions (Thicker touch targets) */}
                                    <div className="absolute top-0 bottom-0 -left-3 w-6 cursor-ew-resize" data-handle="l" />
                                    <div className="absolute top-0 bottom-0 -right-3 w-6 cursor-ew-resize" data-handle="r" />
                                    <div className="absolute left-0 right-0 -top-3 h-6 cursor-ns-resize" data-handle="t" />
                                    <div className="absolute left-0 right-0 -bottom-3 h-6 cursor-ns-resize" data-handle="b" />
                                </div>
                            </>
                        )}

                        {!isImgLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="loading loading-spinner loading-lg text-brand-teal"></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Control Actions (Rotate, Reset) */}
                <div className="flex justify-center gap-4 py-3 bg-[#171a25] border-t border-gray-800/50">
                    <button
                        type="button"
                        onClick={handleRotate}
                        disabled={!isImgLoaded}
                        className="btn btn-sm btn-outline border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white normal-case gap-2"
                    >
                        <RotateCw size={14} />
                        Rotate 90°
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={!isImgLoaded}
                        className="btn btn-sm btn-outline border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white normal-case gap-2"
                    >
                        <RefreshCw size={14} />
                        Reset
                    </button>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-6 py-4 border-t border-gray-800 bg-[#171a25] gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full sm:w-auto btn border-none bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-4 order-3 sm:order-1 h-12"
                    >
                        Cancel
                    </button>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
                        <button
                            type="button"
                            onClick={() => onCropComplete(file)}
                            className="w-full sm:w-auto btn btn-outline border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white normal-case rounded-xl px-4 h-12"
                        >
                            Skip Cropping
                        </button>
                        <button
                            type="button"
                            onClick={handleCropSubmit}
                            disabled={!isImgLoaded}
                            className="w-full sm:w-auto btn bg-brand-teal hover:bg-brand-teal/90 border-none text-white rounded-xl px-4 gap-2 flex items-center justify-center h-12"
                        >
                            <Check size={18} />
                            Crop & Analyze
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
