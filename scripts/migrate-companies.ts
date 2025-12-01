import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting migration...')

    const users = await prisma.user.findMany({
        where: {
            companyId: null,
            companyName: {
                not: null
            }
        }
    })

    console.log(`Found ${users.length} users to migrate.`)

    for (const user of users) {
        if (!user.companyName) continue

        console.log(`Migrating user ${user.email} with company ${user.companyName}`)

        let company = await prisma.company.findFirst({
            where: {
                name: user.companyName
            }
        })

        if (!company) {
            console.log(`Creating company ${user.companyName}`)
            company = await prisma.company.create({
                data: {
                    name: user.companyName
                }
            })
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                companyId: company.id,
                role: Role.COMPANY_ADMIN // Assign as admin for now
            }
        })
        console.log(`User ${user.email} migrated to company ${company.name}`)
    }

    console.log('Migration complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
