export default function Loading() {
    return (
        <div className="animate-pulse p-6">
            <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-48 bg-gray-200 rounded mb-8"></div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="h-[350px] bg-gray-200 rounded-xl"></div>
                <div className="h-[350px] bg-gray-200 rounded-xl"></div>
            </div>

            <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                ))}
            </div>
        </div>
    )
}
