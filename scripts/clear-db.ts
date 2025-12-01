import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting database cleanup...')

    console.log('Deleting Photos...')
    await prisma.photo.deleteMany({})

    console.log('Deleting Slips...')
    await prisma.slip.deleteMany({})

    console.log('Deleting Tags...')
    await prisma.tag.deleteMany({})

    console.log('Deleting Users...')
    await prisma.user.deleteMany({})

    console.log('Deleting Companies...')
    await prisma.company.deleteMany({})

    console.log('Database cleared successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
