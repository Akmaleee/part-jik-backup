import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Start seeding...')

    // await prisma.status.deleteMany()
    // console.log('✅ Delete all status...')
    // await prisma.step.deleteMany()
    // console.log('✅ Delete all step...')

    // --- 1️⃣ SEED USER ---
    const hashedPassword = await bcrypt.hash('1234', 10)
    const user = await prisma.user.upsert({
        where: { username: 'shandy' },
        update: {},
        create: {
        username: 'shandy',
        name: 'Shandy',
        email: 'shandy@example.com',
        password: hashedPassword,
        role: 'admin',
        },
    })
    console.log(`✅ User created: ${user.username}`)

    // --- 2️⃣ SEED STEP ---
    const stepNames = ['MOM', 'NDA', 'JIK', 'MSA', 'MOU']

    await prisma.step.createMany({
        data: stepNames.map((name) => ({ name })),
        skipDuplicates: true, // biar gak error kalau sudah ada
    })
  
  console.log(`✅ Steps created: ${stepNames.join(', ')}`)

  // --- 3️⃣ SEED STATUS ---
  const statusNames = [
    'Review Mitra',
    'Review Legal Tsat',
    'Sirkulir Tsat',
    'Signing Mitra',
    'Finish',
  ]

  
    await prisma.status.createMany({
        data: statusNames.map((name) => ({ name })),
        skipDuplicates: true,
    })
  
  console.log(`✅ Statuses created: ${statusNames.join(', ')}`)

  console.log('🌱 Seeding complete!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
