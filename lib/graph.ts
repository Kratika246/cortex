import { Developer, Task, Assignment, GraphNode, GraphLink, TeamHealth } from '@/types'
import { assignTaskToDeveloper } from './assignTask'
import { getDevelopers } from './db'

export async function getAllDevelopers(): Promise<Developer[]> {
  return await getDevelopers()
}

export async function getDeveloperById(id: string): Promise<Developer | undefined> {
  const devs = await getAllDevelopers()
  return devs.find(d => d.id === id)
}

export async function getDeveloperByName(name: string): Promise<Developer | undefined> {
  const devs = await getAllDevelopers()
  return devs.find(d =>
    d.name.toLowerCase().includes(name.toLowerCase())
  )
}

export async function assignAllTasks(tasks: Task[]): Promise<Assignment[]> {
  const devs = await getAllDevelopers()
  const assignments: Assignment[] = []

  for (const task of tasks) {
    const assignment = await assignTaskToDeveloper(task, devs)
    assignments.push(assignment)
  }

  return assignments
}

export async function buildGraphData(assignments: Assignment[]): Promise<{
  nodes: GraphNode[]
  links: GraphLink[]
}> {
  const devs = await getAllDevelopers()

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

export async function getTeamHealthMetrics(assignments: Assignment[]): Promise<TeamHealth> {
  const devs = await getAllDevelopers()

  const workloadMap: Record<string, number> = {}
  assignments.forEach(a => {
    workloadMap[a.developer.id] = (workloadMap[a.developer.id] || 0) + 1
  })

  const busiestDev = devs.reduce((prev: Developer, curr: Developer) =>
    (workloadMap[curr.id] || 0) > (workloadMap[prev.id] || 0) ? curr : prev
  )

  return {
    totalTasks: assignments.length,
    totalDevelopers: devs.length,
    averageWorkload:
      assignments.length > 0 && devs.length > 0
        ? (assignments.length / devs.length).toFixed(1)
        : '0.0',
    busiestDeveloper: busiestDev?.name || 'N/A',
  }
}