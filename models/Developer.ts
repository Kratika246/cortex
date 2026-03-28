import mongoose from 'mongoose'

const DeveloperSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  languages: { type: [String], default: [] },
  modules: { type: [String], default: [] },
  workload: { type: Number, default: 0 },
  expertise: { type: [String], default: [] },
  pastTasks: { type: [String], default: [] },
}, { timestamps: true })

export default mongoose.models.Developer || mongoose.model('Developer', DeveloperSchema)
