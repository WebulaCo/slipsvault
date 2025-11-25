
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import SlipList from "@/app/components/SlipList"
import { Search as SearchIcon } from "lucide-react"

interface SearchPageProps {
    searchParams: Promise<{
        q?: string
    }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

    const { q } = await searchParams
    const query = q || ''

    let slips: any[] = []

    if (query) {
        // Parse query for potential amount or date
        const amountQuery = parseFloat(query)
        const isNumber = !isNaN(amountQuery)

        slips = await prisma.slip.findMany({
            where: {
                userId: session.user.id,
                OR: [
                    { title: { contains: query } }, // Case insensitive by default in SQLite? No, usually case sensitive. 
                    // Prisma with SQLite: contains is case insensitive if using default collation, but let's be safe.
                    // Actually, Prisma + SQLite 'contains' is usually case-insensitive.
                    { place: { contains: query } },
                    { content: { contains: query } },
                    {
                        tags: {
                            some: {
                                name: { contains: query }
                            }
                        }
                    },
                    // Add amount check if it's a number
                    ...(isNumber ? [{ amountAfterTax: { equals: amountQuery } }] : [])
                ]
            },
            orderBy: {
                date: 'desc'
            },
            include: {
                photos: true,
                tags: true
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Search Slips</h1>
                <p className="text-muted-foreground">
                    Find slips by merchant, location, amount, or tags.
                </p>
            </div>

            <div className="card p-4">
                <form className="relative flex items-center">
                    <SearchIcon className="absolute left-3 text-muted-foreground" size={20} />
                    <input
                        type="text"
                        name="q"
                        defaultValue={query}
                        placeholder="Search for coffee, uber, $50, etc..."
                        className="input pl-10 w-full"
                        autoFocus
                    />
                    <button type="submit" className="btn btn-primary ml-4">
                        Search
                    </button>
                </form>
            </div>

            {query && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">
                        {slips.length} result{slips.length !== 1 ? 's' : ''} for "{query}"
                    </h2>

                    {slips.length > 0 ? (
                        <SlipList slips={slips} />
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            No slips found matching your search.
                        </div>
                    )}
                </div>
            )}

            {!query && (
                <div className="text-center py-12 text-muted-foreground">
                    Enter a keyword to start searching.
                </div>
            )}
        </div>
    )
}
