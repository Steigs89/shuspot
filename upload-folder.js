import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import crypto from 'crypto'
import cliProgress from 'cli-progress'

dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const bucket = process.env.SUPABASE_BUCKET || 'books'
const localFolder = process.argv[2] // pass folder as CLI arg
const concurrency = parseInt(process.env.CONCURRENCY) || 5

const RESUME_DB = '.upload-resume.json'

// --- Helpers ---

function md5(filePath) {
  const hash = crypto.createHash('md5')
  const data = fs.readFileSync(filePath)
  hash.update(data)
  return hash.digest('hex')
}

function loadResumeState() {
  if (fs.existsSync(RESUME_DB)) {
    return JSON.parse(fs.readFileSync(RESUME_DB, 'utf-8'))
  }
  return {}
}

function saveResumeState(state) {
  fs.writeFileSync(RESUME_DB, JSON.stringify(state, null, 2))
}

async function uploadFile(filePath, relativeKey, resumeState, progress) {
  const hash = md5(filePath)

  // Skip if already uploaded and hash matches
  if (resumeState[relativeKey] === hash) {
    progress.increment()
    return
  }

  const fileBuffer = fs.readFileSync(filePath)

  const { error } = await supabase.storage.from(bucket).upload(relativeKey, fileBuffer, {
    upsert: true,
  })

  if (error) throw new Error(`Upload failed for ${relativeKey}: ${error.message}`)

  resumeState[relativeKey] = hash
  saveResumeState(resumeState)
  progress.increment()
}

// --- Main Function ---

async function uploadFolder() {
  console.log('🚀 Starting Node.js upload script...')
  console.log(`📁 Target folder: ${localFolder}`)

  if (!localFolder) {
    console.error('❌ Usage: node upload-folder.js <folder-path>')
    process.exit(1)
  }

  if (!fs.existsSync(localFolder)) {
    console.error(`❌ Folder not found: ${localFolder}`)
    console.error(`📂 Current directory: ${process.cwd()}`)
    console.error(`📂 Directory contents:`, fs.readdirSync('.').slice(0, 10))
    process.exit(1)
  }

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables')
    console.error(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '***' : 'MISSING'}`)
    console.error(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '***' : 'MISSING'}`)
    process.exit(1)
  }

  console.log('✅ Environment check passed')

  const files = []
  function readDirRecursive(dir, base = '') {
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file)
      const relativePath = path.join(base, file)
      if (fs.lstatSync(fullPath).isDirectory()) {
        readDirRecursive(fullPath, relativePath)
      } else {
        files.push({ fullPath, relativePath })
      }
    }
  }

  readDirRecursive(localFolder)
  console.log(`📁 Found ${files.length} files in ${localFolder}`)

  const resumeState = loadResumeState()
  const progress = new cliProgress.SingleBar(
    {
      format: 'Uploading [{bar}] {percentage}% | {value}/{total} files | ETA: {eta}s',
    },
    cliProgress.Presets.shades_classic
  )

  progress.start(files.length, 0)

  let i = 0
  while (i < files.length) {
    const chunk = files.slice(i, i + concurrency)
    await Promise.all(
      chunk.map(f => uploadFile(f.fullPath, f.relativePath, resumeState, progress))
    )
    i += chunk.length
  }

  progress.stop()
  console.log('✅ Upload complete!')
}

uploadFolder().catch(err => {
  console.error('❌ Upload failed:', err.message)
  process.exit(1)
})