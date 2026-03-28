import mongoose from 'mongoose'

const ModuleSchema = new mongoose.Schema({
  owner: { type: String, required: true },
  files: { type: [String], default: [] },
  decisions: { type: [String], default: [] },
}, { _id: false })

const CodebaseSchema = new mongoose.Schema({
  modules: {
    type: Map,
    of: ModuleSchema,
  },
}, { timestamps: true })

export default mongoose.models.Codebase || mongoose.model('Codebase', CodebaseSchema)
