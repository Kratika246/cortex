import dbConnect from './mongodb'
import DeveloperModel from '@/models/Developer'
import CodebaseModel from '@/models/Codebase'
import { Developer } from '@/types'
import developersData from '@/data/developers.json'
import codebaseData from '@/data/codebase.json'

// Soft fallback state in memory for hackathon sessions if DB is down
const memoryDevs: Developer[] = [...(developersData as Developer[])]

async function isDbConnected() {
  try {
    await dbConnect()
    return true
  } catch (_err) {
    console.warn('MongoDB connection failed. Using memory fallback for this session.')
    return false
  }
}

// Helper for initial migration if DB is empty
async function migrateIfEmpty() {
  try {
    const connected = await isDbConnected()
    if (!connected) return

    const devCount = await DeveloperModel.countDocuments()
    if (devCount === 0) {
      console.log('Migrating initial developers to MongoDB...')
      const cleanDevs = (developersData as Developer[]).map(d => ({
        id: d.id,
        name: d.name,
        email: d.email,
        languages: d.languages || [],
        modules: d.modules || [],
        workload: d.workload || 0,
        expertise: d.expertise || [],
        pastTasks: d.pastTasks || []
      }))
      await DeveloperModel.insertMany(cleanDevs, { ordered: false })
    }

    const codebaseCount = await CodebaseModel.countDocuments()
    if (codebaseCount === 0) {
      console.log('Migrating initial codebase to MongoDB...')
      await CodebaseModel.create(codebaseData)
    }
  } catch (error) {
    console.error('Migration error:', error)
  }
}

export async function getDevelopers(): Promise<Developer[]> {
  const connected = await isDbConnected()
  if (connected) {
    await migrateIfEmpty()
    return await DeveloperModel.find({}).lean()
  }
  return memoryDevs
}

export async function addDeveloper(dev: Developer) {
  const connected = await isDbConnected()
  if (connected) {
    await DeveloperModel.create(dev)
  } else {
    memoryDevs.push(dev)
  }
}

export async function updateDeveloper(dev: Developer) {
  const connected = await isDbConnected()
  if (connected) {
    await DeveloperModel.findOneAndUpdate({ id: dev.id }, dev)
  } else {
    const index = memoryDevs.findIndex(d => d.id === dev.id)
    if (index !== -1) memoryDevs[index] = dev
  }
}

export async function getCodebase() {
  const connected = await isDbConnected()
  if (connected) {
    await migrateIfEmpty()
    const codebase = await CodebaseModel.findOne({}).lean()
    return codebase || codebaseData
  }
  return codebaseData
}
