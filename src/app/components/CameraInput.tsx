'use client'

import { ChangeEvent, useState } from 'react'

interface CameraInputProps {
    onFileSelect: (file: File) => void
}

export default function CameraInput({ onFileSelect }: CameraInputProps) {
    const [preview, setPreview] = useState<string | null>(null)

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onFileSelect(file)
            const url = URL.createObjectURL(file)
            setPreview(url)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label
                className="btn btn-secondary"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    width: 'fit-content'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Take Photo / Upload
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </label>

            {preview && (
                <div style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '300px',
                    aspectRatio: '4/3',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    border: '1px solid hsl(var(--border))',
                    marginTop: '0.5rem'
                }}>
                    <img
                        src={preview}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setPreview(null)
                            // Note: We can't easily clear the file input value programmatically in React without a ref, 
                            // but for this simple case, just clearing preview is visual feedback.
                            // The parent component handles the actual file state.
                        }}
                        style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    )
}
