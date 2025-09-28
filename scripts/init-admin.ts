import { PrismaClient } from '@prisma/client'

import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating default admin user...')

  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
  const hashedPassword = await hashPassword(password)

  // 创建默认管理员用户
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      isAdmin: true,
    },
  })

  console.log('Admin user created:', admin)
  console.log('Admin credentials:')
  console.log('Username: admin')
  console.log('Email: admin@example.com')
  console.log('Password:', password)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
