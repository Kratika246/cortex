import { Developer, Task, Assignment, GraphNode, GraphLink, TeamHealth } from '@/types'
import { assignTaskToDeveloper } from './assignTask'
import developersData from '@/data/developers.json'

export function getAllDevelopers(): Developer[] {
  return developersData as Developer[]
}

export function getDeveloperById(id: string): Developer | undefined {
  return (developersData as Developer[]).find(d => d.id === id)
}

export function getDeveloperByName(name: string): Developer | undefined {
  return (developersData as Developer[]).find(d =>
    d.name.toLowerCase().includes(name.toLowerCase())
  )
}

export async function assignAllTasks(tasks: Task[]): Promise<Assignment[]> {
  const devs = getAllDevelopers()
  const assignments: Assignment[] = []

  for (const task of tasks) {
    const assignment = await assignTaskToDeveloper(task, devs)
    assignments.push(assignment)
  }

  return assignments
}

export function buildGraphData(assignments: Assignment[]): {
  nodes: GraphNode[]
  links: GraphLink[]
} {
  const devs = getAllDevelopers()

  const workloadMap: Record<string, number> = {}
  assignments.forEach(a => {
    workloadMap[a.developer.id] = (workloadMap[a.developer.id] || 0) + 1
  })

  const nodes: GraphNode[] = devs.map(dev => ({
    id: dev.id,
    name: dev.name,
    val: 4 + (workloadMap[dev.id] || 0) * 2,
    color: getNodeColor(dev.expertise[0]),
    expertise: dev.expertise,
    workload: dev.workload + (workloadMap[dev.id] || 0),
    modules: dev.modules,
  }))

  const links: GraphLink[] = []
  const moduleOwnerMap: Record<string, string> = {}

  devs.forEach(dev => {
    dev.modules.forEach(mod => {
      moduleOwnerMap[mod] = dev.id
    })
  })

  devs.forEach(dev => {
    dev.modules.forEach(mod => {
      devs.forEach(otherDev => {
        if (
          otherDev.id !== dev.id &&
          otherDev.modules.some(m => m === mod)
        ) {
          const exists = links.find(
            l =>
              (l.source === dev.id && l.target === otherDev.id) ||
              (l.source === otherDev.id && l.target === dev.id)
          )
          if (!exists) {
            links.push({
              source: dev.id,
              target: otherDev.id,
              label: mod,
            })
          }
        }
      })
    })
  })

  return { nodes, links }
}

function getNodeColor(primaryExpertise: string): string {
  const map: Record<string, string> = {
    backend: '#3b82f6',
    frontend: '#8b5cf6',
    'machine learning': '#10b981',
    DevOps: '#f59e0b',
    'real-time systems': '#ef4444',
    payments: '#06b6d4',
  }
  return map[primaryExpertise] ?? '#6b7280'
}

export function getTeamHealthMetrics(assignments: Assignment[]): TeamHealth {
  const devs = getAllDevelopers()

  const workloadMap: Record<string, number> = {}
  assignments.forEach(a => {
    workloadMap[a.developer.id] = (workloadMap[a.developer.id] || 0) + 1
  })

  const busiestDev = devs.reduce((prev, curr) =>
    (workloadMap[curr.id] || 0) > (workloadMap[prev.id] || 0) ? curr : prev
  )

  return {
    totalTasks: assignments.length,
    totalDevelopers: devs.length,
    averageWorkload:
      assignments.length > 0
        ? (assignments.length / devs.length).toFixed(1)
        : '0.0',
    busiestDeveloper: busiestDev.name,
  }
}