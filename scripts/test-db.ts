
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load vercel.env explicitly
dotenv.config({ path: path.resolve(process.cwd(), 'vercel.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('Testing database connection...');
    console.log('URL:', process.env.POSTGRES_PRISMA_URL?.replace(/:[^:@]+@/, ':****@')); // Mask password

    try {
        await prisma.$connect();
        console.log('Successfully connected to database!');

        // Try a simple query
        const count = await prisma.user.count();
        console.log(`User count: ${count}`);

    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
