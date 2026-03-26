# Replit Agent Prompt

Build the Workforce frontend demo as a React + TypeScript + Vite application.

## Goal
Create a dark-mode operations dashboard that demonstrates both Workforce user administration and Hospitable room/task operations.

## Requirements
- Create a clean app shell with:
  - top navigation
  - sidebar
  - business selector
  - location selector
- Create routes/pages for:
  - Dashboard
  - Users
  - Rooms
  - Tasks

### Users page
- user table
- role assignment UI
- display scope as Business or Location
- show job title label as display-only

### Rooms page
- list or grid of rooms by selected location
- colored status badges
- detail drawer or modal

### Tasks page
- list grouped by status
- assign task action
- update task status action

### Dashboard
- summary cards for room statuses and task statuses
- recent activity list if possible

## Technical constraints
- Use React + TypeScript + Vite
- Use environment variable VITE_API_BASE_URL
- Put API calls in a dedicated client layer
- Use typed interfaces for server responses
- Build with reusable UI components
- Keep the design dark, simple, and operational
- Do not build unrelated features

## Demo mode
- If backend endpoints are missing, create a temporary mock adapter layer with the same shapes as the intended API so the UI remains demoable
- Make it easy to swap mock mode for live API later

## Deliverables
- runnable frontend
- clean folder structure
- reusable components
- sample mock data if needed
- clear place to configure backend URL
