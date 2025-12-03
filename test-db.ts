import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Connecting to database...')
        await prisma.$connect()
        console.log('Connected successfully!')

        const count = await prisma.user.count()
        console.log(`Found ${count} users.`)

    } catch (error) {
        console.error('Connection failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
