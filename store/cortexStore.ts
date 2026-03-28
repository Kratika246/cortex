import { create } from 'zustand'
import { Task, Assignment, MeetingSession, CodeReview, Developer } from '@/types'

interface CortexState {
  // Meeting
  currentSession: MeetingSession | null
  liveTranscript: string
  isRecording: boolean

  // Developers
  developers: Developer[]

  // Tasks
  tasks: Task[]
  assignments: Assignment[]

  // Review
  currentReview: CodeReview | null

  // UI
  isProcessing: boolean
  error: string | null

  // Actions
  setDevelopers: (devs: Developer[]) => void
  addDeveloper: (dev: Developer) => void
  setLiveTranscript: (text: string) => void
  appendTranscript: (text: string) => void
  setIsRecording: (val: boolean) => void
  setTasks: (tasks: Task[]) => void
  setAssignments: (assignments: Assignment[]) => void
  setCurrentReview: (review: CodeReview | null) => void
  setIsProcessing: (val: boolean) => void
  setError: (error: string | null) => void
  startSession: () => void
  endSession: () => void
  reset: () => void
}

export const useCortexStore = create<CortexState>((set, get) => ({
  currentSession: null,
  liveTranscript: '',
  isRecording: false,
  developers: [],
  tasks: [],
  assignments: [],
  currentReview: null,
  isProcessing: false,
  error: null,

  setDevelopers: (devs) => set({ developers: devs }),
  addDeveloper: (dev) => set(state => ({ developers: [...state.developers, dev] })),

  setLiveTranscript: (text) => set({ liveTranscript: text }),

  appendTranscript: (text) =>
    set(state => ({
      liveTranscript: state.liveTranscript
        ? `${state.liveTranscript} ${text}`
        : text,
    })),

  setIsRecording: (val) => set({ isRecording: val }),

  setTasks: (tasks) => set({ tasks }),

  setAssignments: (assignments) => set({ assignments }),

  setCurrentReview: (review) => set({ currentReview: review }),

  setIsProcessing: (val) => set({ isProcessing: val }),

  setError: (error) => set({ error }),

  startSession: () =>
    set({
      currentSession: {
        id: `session_${Date.now()}`,
        startedAt: new Date().toISOString(),
        transcript: '',
        tasks: [],
        assignments: [],
        status: 'recording',
      },
      liveTranscript: '',
      tasks: [],
      assignments: [],
      isRecording: true,
      error: null,
    }),

  endSession: () => {
    const state = get()
    set({
      isRecording: false,
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            transcript: state.liveTranscript,
            tasks: state.tasks,
            assignments: state.assignments,
            status: 'done',
          }
        : null,
    })
  },

  reset: () =>
    set({
      currentSession: null,
      liveTranscript: '',
      isRecording: false,
      tasks: [],
      assignments: [],
      currentReview: null,
      isProcessing: false,
      error: null,
    }),
}))