import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import SlipForm from "@/app/components/SlipForm"
import { updateSlip } from "@/app/actions"
import Link from "next/link"
import { ChevronLeft, MoreVertical } from "lucide-react"
import DeleteSlipButton from "@/app/components/DeleteSlipButton"

interface EditSlipPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditSlipPage({ params }: EditSlipPageProps) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

    const { id } = await params

    const slip = await prisma.slip.findUnique({
        where: { id },
        include: {
            photos: true,
            tags: true,
            user: {
                select: {
                    id: true,
                    companyId: true
                }
            }
        }
    })

    if (!slip) {
        notFound()
    }

    const isOwner = slip.userId === session.user.id
    const isCompanyAdmin = (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'ADMIN') && session.user.companyId
    const isAccountant = session.user.role === 'ACCOUNTANT' && session.user.companyId
    const isSameCompany = slip.user.companyId === session.user.companyId

    if (!isOwner && !((isCompanyAdmin || isAccountant) && isSameCompany)) {
        notFound()
    }

    const initialData = {
        id: slip.id,
        title: slip.title,
        place: slip.place || '',
        date: slip.date ? slip.date.toISOString() : '',
        amountBeforeTax: slip.amountBeforeTax || undefined,
        taxAmount: slip.taxAmount || undefined,
        amountAfterTax: slip.amountAfterTax || undefined,
        currency: slip.currency || '',
        summary: slip.summary || '',
        content: slip.content || '',
        photoUrl: slip.photos[0]?.url || '',
        tags: slip.tags
    }

    return (
        <div className="min-h-screen bg-brand-light text-gray-900 p-4 pb-24">
            <header className="flex items-center justify-between mb-6">
                <Link href="/dashboard/slips" className="text-gray-900 hover:text-brand-teal">
                    <ChevronLeft size={24} />
                </Link>
                <h1 className="text-xl font-bold text-brand-navy">Edit Slip</h1>
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                        <MoreVertical size={24} className="text-gray-900" />
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-white rounded-box w-52 border border-gray-100">
                        <li>
                            <DeleteSlipButton id={slip.id} asMenuItem />
                        </li>
                    </ul>
                </div>
            </header>

            <div className="max-w-2xl mx-auto">
                <SlipForm
                    initialData={initialData}
                    action={updateSlip}
                    submitLabel="Update Slip"
                />
            </div>
        </div>
    )
}
