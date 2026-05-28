import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = "test@example.com";
    const password = "password123";
    const name = "Test User";

    try {
        console.log("Checking if user exists...");
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            console.log("User already exists!");
            return;
        }

        console.log("Creating test user...");
        const hashedPassword = await hash(password, 12);
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'USER'
            }
        });
        console.log("Created test user: test@example.com / password123");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
