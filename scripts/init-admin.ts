import { eq } from '@/lib/drizzle'

import { db } from '../src/lib/db'
import { users } from '../src/lib/schema'
import { hashPassword } from '../src/lib/password'

async function main() {
  console.log('Creating default admin user...')

  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
  const hashedPassword = await hashPassword(password)

  const existingAdmin = await db.query.users.findFirst({
    where: (fields) => eq(fields.email, 'admin@example.com'),
  })

  if (existingAdmin) {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        isAdmin: true,
        username: existingAdmin.username || 'admin',
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingAdmin.id))
  } else {
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      isAdmin: true,
    })
  }

  console.log('Admin user ensured.')
  console.log('Admin credentials:')
  console.log('Username: admin')
  console.log('Email: admin@example.com')
  console.log('Password:', password)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
