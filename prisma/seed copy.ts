import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 创建教师/管理员账号
    await prisma.user.upsert({
        where: { code: 'T00001' },
        update: {},
        create: {
            code: 'T00001',
            role: Role.TEACHER,  // 教师同时也是管理员
            nickname: 'Teacher',
        },
    });

    // 创建一个测试学生账号
    await prisma.user.upsert({
        where: { code: 'S00001' },
        update: {},
        create: {
            code: 'S00001',
            role: Role.STUDENT,
            nickname: 'Student',
        },
    });

    console.log('Initial accounts created');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });