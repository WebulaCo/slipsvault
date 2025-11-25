
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying Prisma Client...')
    // We can't easily check types at runtime, but we can check if the model exists in the dmmf if we had access, 
    // or just try a query that would fail if the schema wasn't updated.
    // Actually, the error is a runtime validation error from Prisma, meaning the "client" loaded by the app doesn't know about 'tags'.

    // Let's try to inspect the internal dmmf if possible, or just run a dummy query.
    // If this script runs successfully, it means the generated client ON DISK is correct.

    try {
        // @ts-ignore
        const dmmf = (prisma as any)._runtimeDataModel
        if (dmmf) {
            console.log('Runtime Data Model found.')
            // This might be too deep to inspect easily.
        }

        console.log('Attempting a query with include: { tags: true }...')
        // We don't need a real ID, just want to see if it throws a validation error.
        const slip = await prisma.slip.findFirst({
            include: {
                tags: true
            }
        })
        console.log('Query executed successfully (result might be null).')
        console.log('SUCCESS: Prisma Client on disk supports "tags".')
    } catch (e: any) {
        console.error('FAILURE: Prisma Client query failed.')
        console.error(e.message)
        process.exit(1)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
