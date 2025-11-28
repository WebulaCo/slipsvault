import { registerUser } from '../src/app/actions';

async function main() {
    console.log("Testing registerUser action...");

    const formData = new FormData();
    formData.append('name', 'Debug User');
    formData.append('email', `debug-${Date.now()}@example.com`);
    formData.append('password', 'password123');

    try {
        const result = await registerUser(formData);
        console.log("Result:", result);
    } catch (error) {
        console.error("Caught unexpected error:", error);
    }
}

main();
