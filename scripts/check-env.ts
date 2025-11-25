import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking environment variables...");
    const requiredVars = [
        'POSTGRES_PRISMA_URL',
        'POSTGRES_URL_NON_POOLING',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL'
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        console.error("Missing environment variables:", missingVars.join(', '));
        process.exit(1);
    } else {
        console.log("All required environment variables are set.");
        const url = process.env.POSTGRES_PRISMA_URL || "";
        try {
            const urlObj = new URL(url);
            console.log("Database Host:", urlObj.hostname);
        } catch (e) {
            console.log("Could not parse database URL");
        }
    }

    console.log("Checking database connection...");
    try {
        await prisma.$connect();
        console.log("Successfully connected to the database.");
        const userCount = await prisma.user.count();
        console.log(`Found ${userCount} users.`);
    } catch (error) {
        console.error("Failed to connect to the database:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
