import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import SlipForm from "@/app/components/SlipForm"
import { updateSlip } from "@/app/actions"
import Link from "next/link"

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
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '600px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <Link href="/dashboard" style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'none', fontSize: '0.875rem' }}>
                    ← Back to Dashboard
                </Link>
                <h1 style={{ marginTop: '1rem' }}>Edit Slip</h1>
            </div>

            <SlipForm
                initialData={initialData}
                action={updateSlip}
                submitLabel="Update Slip"
            />

            {/* Hidden input to pass ID to server action */}
            <form action={updateSlip} style={{ display: 'none' }}>
                <input type="hidden" name="id" value={slip.id} />
            </form>
            {/* 
        Wait, SlipForm uses the action passed to it. 
        But SlipForm doesn't know about the ID unless we pass it or include it in the form.
        I should update SlipForm to include a hidden ID input if initialData.id exists.
      */}
        </div>
    )
}
