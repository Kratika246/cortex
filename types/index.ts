export interface Developer {
  id: string
  name: string
  email: string
  languages: string[]
  modules: string[]
  workload: number
  expertise: string[]
  pastTasks: string[]
}

export interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  owner?: string
  decidedIn?: string
  status: 'extracted' | 'assigned' | 'in-review' | 'done'
}

export interface Assignment {
  task: Task
  developer: Developer
  confidenceScore: number
  reason: string
}

export interface ReviewComment {
  lineNumber?: number
  type: 'suggestion' | 'warning' | 'critical' | 'praise'
  message: string
}

export interface CodeReview {
  verdict: 'approved' | 'changes-requested' | 'needs-discussion'
  summary: string
  comments: ReviewComment[]
  contextUsed: string[]
}

export interface MeetingSession {
  id: string
  startedAt: string
  transcript: string
  tasks: Task[]
  assignments: Assignment[]
  status: 'idle' | 'recording' | 'processing' | 'done'
}

export interface GraphNode {
  id: string
  name: string
  val: number
  color: string
  expertise: string[]
  workload: number
  modules: string[]
}

export interface GraphLink {
  source: string
  target: string
  label: string
}

export interface TeamHealth {
  totalTasks: number
  totalDevelopers: number
  averageWorkload: string
  busiestDeveloper: string
}

export interface JiraIssue {
  id: string
  key: string
  summary: string
  description: string
  status: string
  priority: string
  assignee?: string
}

export interface LinearIssue {
  id: string
  title: string
  status: { name: string }
  priority: number
  assignee?: { name: string }
}

export interface TestRailCase {
  id: number
  title: string
  priority_id: number
}