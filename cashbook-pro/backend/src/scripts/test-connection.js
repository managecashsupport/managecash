import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  console.log('Testing database connection...')
  
  try {
    // Test the connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT version() as version`
    console.log('✅ Database version:', result[0].version)
    
    // Test if public schema exists
    const schemas = await prisma.$queryRaw`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
    `
    console.log('✅ Available schemas:', schemas.map(s => s.schema_name))
    
    // Test if we can access the public schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log('✅ Tables in public schema:', tables.map(t => t.table_name))
    
    console.log('\n🎉 All database tests passed!')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()