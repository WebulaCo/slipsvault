import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SlipList from "@/app/components/SlipList"
import SearchInput from "@/app/components/SearchInput"
import ExportButton from "@/app/components/ExportButton"
import { Filter, Calendar, ArrowUpDown } from "lucide-react"

interface AllSlipsPageProps {
    searchParams: Promise<{
        q?: string
    }>
}

export default async function AllSlipsPage({ searchParams }: AllSlipsPageProps) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return null
    }

    const { q } = await searchParams
    const query = q || ''

    const whereClause: any = {
        userId: session.user.id
    }

    if (query) {
        whereClause.OR = [
            { title: { contains: query } },
            { place: { contains: query } },
            { tags: { some: { name: { contains: query } } } }
        ]
    }

    const slips = await prisma.slip.findMany({
        where: whereClause,
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            photos: true,
            tags: true
        }
    })

    return (
        <div>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>All Slips</h1>
                <p style={{ color: 'hsl(var(--muted-foreground))' }}>View and manage all your uploaded slips.</p>
            </header>

            {/* Filter Bar */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                flexWrap: 'wrap'
            }}>
                <SearchInput />

                <button className="btn btn-secondary">
                    <Calendar size={16} />
                    Date Range
                </button>

                <button className="btn btn-secondary">
                    <ArrowUpDown size={16} />
                    Newest First
                </button>

                <ExportButton />

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                            <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '1px' }}></div>
                            <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '1px' }}></div>
                            <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '1px' }}></div>
                            <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '1px' }}></div>
                        </div>
                    </button>
                </div>
            </div>

            <SlipList slips={slips} />
        </div>
    )
}
