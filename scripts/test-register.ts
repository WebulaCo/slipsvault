import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting registration test...");

    const email = `test-${Date.now()}@example.com`;
    const password = "password123";
    const name = "Test User";

    try {
        console.log("Hashing password...");
        const hashedPassword = await hash(password, 12);
        console.log("Password hashed.");

        console.log("Creating user in DB...");
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'USER'
            }
        });
        console.log("User created:", user.id);
    } catch (error) {
        console.error("Error during registration test:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
