import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating default admin user...')

  // 创建默认管理员用户
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123', // 实际项目中应该使用bcrypt加密
      isAdmin: true,
    },
  })

  console.log('Admin user created:', admin)
  console.log('Admin credentials:')
  console.log('Username: admin')
  console.log('Email: admin@example.com')
  console.log('Password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })