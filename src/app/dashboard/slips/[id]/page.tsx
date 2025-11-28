import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, MoreVertical, Trash2, Edit2 } from "lucide-react"
import DeleteSlipButton from "@/app/components/DeleteSlipButton"

interface SlipDetailsPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function SlipDetailsPage({ params }: SlipDetailsPageProps) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

    const { id } = await params
    const slip = await prisma.slip.findUnique({
        where: {
            id: id,
            userId: session.user.id
        },
        include: {
            photos: true,
            tags: true
        }
    })

    if (!slip) notFound()

    return (
        <div className="min-h-screen bg-[#1a1f2e] text-white p-4 pb-24">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <Link href="/dashboard/slips" className="text-gray-400 hover:text-white">
                    <ChevronLeft size={24} />
                </Link>
                <h1 className="text-xl font-bold">Slip Details</h1>
                <button className="text-gray-400 hover:text-white">
                    <MoreVertical size={24} />
                </button>
            </header>

            {/* Image Preview */}
            <div className="bg-[#2f5d5a] rounded-xl p-8 mb-6 flex items-center justify-center min-h-[300px]">
                {slip.photos.length > 0 ? (
                    <img
                        src={slip.photos[0].url.startsWith('http') ? slip.photos[0].url : `/uploads/${slip.photos[0].url.split('/').pop()}`}
                        alt={slip.title}
                        className="max-w-full max-h-[400px] object-contain shadow-lg rotate-1"
                    />
                ) : (
                    <div className="text-white/50">No image available</div>
                )}
            </div>

            {/* Details Cards */}
            <div className="space-y-4">
                <div className="bg-[#252a3a] rounded-xl p-4">
                    <label className="text-gray-400 text-sm block mb-1">Merchant</label>
                    <div className="font-bold text-lg">{slip.title}</div>
                </div>

                <div className="bg-[#252a3a] rounded-xl p-4">
                    <label className="text-gray-400 text-sm block mb-1">Amount</label>
                    <div className="font-bold text-lg text-white">
                        {slip.currency || '$'}{slip.amountAfterTax?.toFixed(2)}
                    </div>
                </div>

                <div className="bg-[#252a3a] rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                        <span className="text-gray-400">Date</span>
                        <span className="font-medium">{slip.date ? new Date(slip.date).toLocaleDateString() : '-'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                        <span className="text-gray-400">Category</span>
                        <span className="font-medium">
                            {slip.tags.length > 0 ? slip.tags[0].name : 'Uncategorized'}
                        </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                        <span className="text-gray-400">Tags</span>
                        <div className="flex gap-2">
                            {slip.tags.map(tag => (
                                <span key={tag.id} className="bg-[#3b4259] text-[#8b93ff] px-2 py-1 rounded text-xs font-medium">
                                    #{tag.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Place</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{slip.place || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1a1f2e] border-t border-gray-800 flex gap-4">
                <DeleteSlipButton id={slip.id} />
                <Link href={`/dashboard/edit/${slip.id}`} className="flex-1 btn btn-primary bg-[#5b50ff] hover:bg-[#4a40e0] border-none text-white h-12 rounded-xl text-base font-medium gap-2">
                    <Edit2 size={18} />
                    Edit Slip
                </Link>
            </div>
        </div>
    )
}
