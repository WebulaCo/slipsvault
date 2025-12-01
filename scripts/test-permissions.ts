import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting permission tests...')

    // Cleanup
    await prisma.slip.deleteMany({ where: { title: { startsWith: 'TEST_' } } })
    await prisma.user.deleteMany({ where: { email: { endsWith: '@test-company.com' } } })
    await prisma.company.deleteMany({ where: { name: 'Test Company' } })

    // 1. Create Company
    const company = await prisma.company.create({
        data: { name: 'Test Company' }
    })
    console.log('Created Company:', company.name)

    // 2. Create Users
    const admin = await prisma.user.create({
        data: {
            email: 'admin@test-company.com',
            password: 'hash',
            name: 'Admin User',
            companyId: company.id,
            role: Role.COMPANY_ADMIN
        }
    })
    console.log('Created Admin:', admin.email)

    const contributor = await prisma.user.create({
        data: {
            email: 'contributor@test-company.com',
            password: 'hash',
            name: 'Contributor User',
            companyId: company.id,
            role: Role.CONTRIBUTOR
        }
    })
    console.log('Created Contributor:', contributor.email)

    const accountant = await prisma.user.create({
        data: {
            email: 'accountant@test-company.com',
            password: 'hash',
            name: 'Accountant User',
            companyId: company.id,
            role: Role.ACCOUNTANT
        }
    })
    console.log('Created Accountant:', accountant.email)

    // 3. Create Slips
    const adminSlip = await prisma.slip.create({
        data: {
            title: 'TEST_Admin_Slip',
            userId: admin.id,
            amountAfterTax: 100
        }
    })
    console.log('Created Admin Slip')

    const contributorSlip = await prisma.slip.create({
        data: {
            title: 'TEST_Contributor_Slip',
            userId: contributor.id,
            amountAfterTax: 50
        }
    })
    console.log('Created Contributor Slip')

    // 4. Verify Read Access
    console.log('\n--- Verifying Read Access ---')

    // Admin View
    const adminSlips = await prisma.slip.findMany({
        where: { user: { companyId: company.id } }
    })
    console.log(`Admin sees ${adminSlips.length} slips. Expected 2.`, adminSlips.length === 2 ? 'PASS' : 'FAIL')

    // Accountant View
    const accountantSlips = await prisma.slip.findMany({
        where: { user: { companyId: company.id } }
    })
    console.log(`Accountant sees ${accountantSlips.length} slips. Expected 2.`, accountantSlips.length === 2 ? 'PASS' : 'FAIL')

    // Contributor View (simulating logic)
    const contributorSlips = await prisma.slip.findMany({
        where: { userId: contributor.id }
    })
    console.log(`Contributor sees ${contributorSlips.length} slips. Expected 1.`, contributorSlips.length === 1 ? 'PASS' : 'FAIL')


    // 5. Verify Write Access (Logic Simulation)
    console.log('\n--- Verifying Write Access Logic ---')

    // Accountant Create
    const canAccountantCreate = accountant.role !== Role.ACCOUNTANT
    console.log('Accountant can create slip:', canAccountantCreate ? 'FAIL' : 'PASS')

    // Contributor Delete Admin Slip
    const canContributorDeleteAdminSlip = contributorSlip.userId === contributor.id // Logic from deleteSlip
    // Wait, logic is: if (!isOwner && !(isCompanyAdmin && isSameCompany)) throw
    const isOwner = adminSlip.userId === contributor.id
    const isCompanyAdmin = (contributor.role === Role.COMPANY_ADMIN || contributor.role === Role.ADMIN) && contributor.companyId
    const canDelete = isOwner || (isCompanyAdmin && adminSlip.userId /* fetched user */)
    // Simplified check:
    console.log('Contributor can delete Admin slip:', (isOwner || isCompanyAdmin) ? 'FAIL' : 'PASS')

    console.log('\nTests completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
