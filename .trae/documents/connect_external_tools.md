# Plan: Connect Cortex to External Project Management Tools (Jira, Linear, TestRail)

I will implement a fully automated synchronization system that pushes AI-extracted tasks, meeting transcripts, and assignments directly to external tools like Jira, Linear, and TestRail.

## Summary
The goal is to create a bridge between Cortex's AI intelligence and industry-standard project management tools. When tasks are extracted from a meeting transcript, they will be automatically created as issues/tickets in Jira or Linear, and relevant test-related tasks will be pushed to TestRail.

## Current State Analysis
- **Task Extraction**: Handled in [lib/extractTasks.ts](file:///e:/Projects/Hackathon/cortex/lib/extractTasks.ts) and the `/api/extract-tasks` endpoint.
- **Task Assignment**: Handled in [lib/assignTask.ts](file:///e:/Projects/Hackathon/cortex/lib/assignTask.ts) and the `/api/assign-tasks` endpoint.
- **Data Flow**: Meeting -> Transcript -> AI Extraction -> Local Store (Zustand) -> Assignment Engine.
- **Missing**: Integration layers (API clients) for Jira, Linear, and TestRail.

## Proposed Changes

### 1. New Integration Library (`lib/integrations/`)
Create a dedicated folder for external tool clients.
- `lib/integrations/jira.ts`: Client to interact with Jira REST API (Create issues, post comments).
- `lib/integrations/linear.ts`: Client to interact with Linear GraphQL API (Create issues).
- `lib/integrations/testrail.ts`: Client to interact with TestRail API (Add test cases/results).

### 2. Synchronization Engine (`lib/integrations/syncEngine.ts`)
A central orchestrator that takes a list of tasks/assignments and determines where to push them.
- Logic to categorize tasks: 
    - Feature/Bug -> Jira/Linear.
    - Test/QA -> TestRail.
- Handles authentication using environment variables.

### 3. API Enhancements
- Update [app/api/extract-tasks/route.ts](file:///e:/Projects/Hackathon/cortex/app/api/extract-tasks/route.ts): After AI extraction, trigger the sync engine to push new tasks to external tools.
- Update [app/api/assign-tasks/route.ts](file:///e:/Projects/Hackathon/cortex/app/api/assign-tasks/route.ts): After assignment, update the external issues with the assigned developer's name and AI reasoning.

### 4. Configuration (`.env.local`)
Add required placeholders for API tokens and base URLs:
- `JIRA_API_TOKEN`, `JIRA_BASE_URL`, `JIRA_PROJECT_KEY`
- `LINEAR_API_KEY`, `LINEAR_TEAM_ID`
- `TESTRAIL_USER`, `TESTRAIL_PASSWORD`, `TESTRAIL_PROJECT_ID`

## Assumptions & Decisions
- **Fully Automated**: As requested, synchronization happens automatically upon task extraction/assignment.
- **Fail-safe**: If an external API call fails, the local operation (task extraction) will still succeed, but an error will be logged.
- **Tool Mapping**: I'll assume standard mappings (e.g., Cortex `priority: high` -> Jira `Priority: High`).

## Verification Steps
1. **Mock Testing**: Create unit tests for each integration client using mock API responses.
2. **End-to-End Flow**:
    - Input a transcript in the Meeting tab.
    - Verify that `extractTasksFromTranscript` is called.
    - Verify that the `syncEngine` triggers API calls to the configured external tools.
3. **Log Verification**: Check server logs for successful sync messages or descriptive error handling.
