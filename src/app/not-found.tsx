import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
            <div className="w-24 h-24 bg-brand-light rounded-full flex items-center justify-center mb-6 text-brand-teal">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 className="text-3xl font-bold text-brand-navy mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8 max-w-md">
                Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
            </p>
            <Link href="/dashboard" className="btn btn-primary px-8">
                Return Home
            </Link>
        </div>
    )
}
