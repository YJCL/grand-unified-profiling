
const fs = require('fs');
const path = require('path');

console.log('Current directory:', process.cwd());

// Manually parse .env.local
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        });
        console.log('Loaded .env.local');
        console.log('DATABASE_URL:', process.env.DATABASE_URL);
    } else {
        console.error('.env.local not found at', envPath);
    }
} catch (e) {
    console.error('Failed to load .env.local', e);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('Connected successfully. Database connection is working.');

        console.log('Creating test user...');
        const user = await prisma.user.create({
            data: {}
        });
        console.log('Created user:', user);

        await prisma.user.delete({ where: { id: user.id } });
        console.log('Cleaned up test user.');

    } catch (e) {
        console.error('Prisma error:', e);
        console.error('Stack:', e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

main();
