import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  console.log('Starting database seed...')

  try {
    // Create super admin user
    const superAdmin = await prisma.user.upsert({
      where: { email: 'superadmin@cashbookpro.com' },
      update: {},
      create: {
        email: 'superadmin@cashbookpro.com',
        name: 'Super Admin',
        password: await bcrypt.hash('superadmin123', 10),
        role: 'superadmin',
        shopId: 'superadmin',
        plan: 'superadmin',
        isActive: true,
        isEmailVerified: true
      }
    })

    console.log('✓ Super admin created:', superAdmin.email)

    // Create sample tenants
    const tenants = [
      {
        shopId: 'sample-shop-1',
        name: 'ABC General Store',
        ownerName: 'John Doe',
        ownerEmail: 'john@abcstore.com',
        ownerPhone: '+919876543210',
        address: '123 Main Street, Mumbai',
        plan: 'starter',
        isActive: true,
        isEmailVerified: true
      },
      {
        shopId: 'sample-shop-2',
        name: 'XYZ Electronics',
        ownerName: 'Jane Smith',
        ownerEmail: 'jane@xyzelectronics.com',
        ownerPhone: '+919876543211',
        address: '456 Tech Road, Bangalore',
        plan: 'growth',
        isActive: true,
        isEmailVerified: true
      },
      {
        shopId: 'sample-shop-3',
        name: 'Quick Mart',
        ownerName: 'Bob Johnson',
        ownerEmail: 'bob@quickmart.com',
        ownerPhone: '+919876543212',
        address: '789 Market Lane, Delhi',
        plan: 'pro',
        isActive: true,
        isEmailVerified: true
      }
    ]

    for (const tenant of tenants) {
      const createdTenant = await prisma.user.upsert({
        where: { email: tenant.ownerEmail },
        update: {},
        create: {
          email: tenant.ownerEmail,
          name: tenant.ownerName,
          password: await bcrypt.hash('password123', 10),
          role: 'admin',
          shopId: tenant.shopId,
          plan: tenant.plan,
          isActive: tenant.isActive,
          isEmailVerified: tenant.isEmailVerified,
          tenant: {
            create: {
              name: tenant.name,
              ownerName: tenant.ownerName,
              ownerEmail: tenant.ownerEmail,
              ownerPhone: tenant.ownerPhone,
              address: tenant.address,
              plan: tenant.plan,
              isActive: tenant.isActive,
              isEmailVerified: tenant.isEmailVerified
            }
          }
        }
      })

      console.log(`✓ Tenant created: ${createdTenant.shopId} (${createdTenant.email})`)
    }

    // Create sample transactions for each tenant
    const transactionTypes = ['in', 'out']
    const categories = ['Sales', 'Purchases', 'Rent', 'Utilities', 'Salary', 'Miscellaneous']
    const paymentModes = ['cash', 'online']

    const now = new Date()
    
    for (let day = 0; day < 30; day++) {
      const date = new Date(now)
      date.setDate(now.getDate() - day)
      const dateStr = date.toISOString().split('T')[0]

      for (const tenant of tenants) {
        // Create 2-5 transactions per day per tenant
        const transactionCount = Math.floor(Math.random() * 4) + 2

        for (let i = 0; i < transactionCount; i++) {
          const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)]
          const category = categories[Math.floor(Math.random() * categories.length)]
          const payMode = paymentModes[Math.floor(Math.random() * paymentModes.length)]
          
          // Generate random amount based on type
          const baseAmount = type === 'in' ? 1000 : 500
          const amount = Math.floor(Math.random() * 10000) + baseAmount

          await prisma.transaction.create({
            data: {
              date: dateStr,
              type: type,
              amount: amount.toString(),
              category: category,
              payMode: payMode,
              productDescription: `${category} transaction for ${tenant.name}`,
              customerName: type === 'in' ? `Customer ${i + 1}` : `Supplier ${i + 1}`,
              customerPhone: `+919876543${i + 1}0`,
              shopId: tenant.shopId,
              createdBy: tenant.ownerEmail
            }
          })
        }
      }
    }

    console.log('✓ Sample transactions created for all tenants')

    // Create sample staff members
    const staffMembers = [
      {
        name: 'Alice Brown',
        email: 'alice@abcstore.com',
        phone: '+919876543213',
        role: 'staff',
        shopId: 'sample-shop-1',
        isActive: true
      },
      {
        name: 'Charlie Wilson',
        email: 'charlie@xyzelectronics.com',
        phone: '+919876543214',
        role: 'staff',
        shopId: 'sample-shop-2',
        isActive: true
      }
    ]

    for (const staff of staffMembers) {
      await prisma.user.create({
        data: {
          email: staff.email,
          name: staff.name,
          password: await bcrypt.hash('password123', 10),
          role: staff.role,
          shopId: staff.shopId,
          plan: 'starter',
          isActive: staff.isActive,
          isEmailVerified: true
        }
      })

      console.log(`✓ Staff member created: ${staff.name} (${staff.email})`)
    }

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\nLogin credentials:')
    console.log('Super Admin: superadmin@cashbookpro.com / superadmin123')
    console.log('Sample Shop 1: john@abcstore.com / password123')
    console.log('Sample Shop 2: jane@xyzelectronics.com / password123')
    console.log('Sample Shop 3: bob@quickmart.com / password123')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()