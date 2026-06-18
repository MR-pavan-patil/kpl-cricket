const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Read .env.local
const envPath = path.join(__dirname, '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found at project root')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] ? match[2].trim() : ''
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1)
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1)
    }
    env[match[1]] = value
  }
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase credentials not found in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnectionAndCreate() {
  console.log('Testing connection to Supabase...')
  const { data: teamsData, error: dbError } = await supabase.from('teams').select('*').limit(1)
  
  if (dbError) {
    console.error('Database query failed:', dbError.message)
    process.exit(1)
  }
  console.log('Database query successful! Connection is active.')

  const email = 'kpladmin@gmail.com'
  const password = 'AdminPassword123!'

  console.log(`Signing up: ${email}...`)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Sign up failed:', error.message)
    console.log(error)
  } else {
    console.log('\n----------------------------------------')
    console.log('SUCCESS! Admin account signup requested.')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log('----------------------------------------')
  }
}

testConnectionAndCreate()
