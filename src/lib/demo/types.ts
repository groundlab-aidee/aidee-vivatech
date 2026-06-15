import type { StageKey } from "@/lib/chat/stages"

export type DemoScenarioId =
  | "vivatech_demo_1"
  | "vivatech_demo_2"
  | "vivatech_demo_3"

export type DemoVisualType =
  | "project_direction"
  | "problem_statements"
  | "keywords_experience"
  | "keywords_relationship"
  | "persona"
  | "tam_sam_som"
  | "positioning_map"
  | "keywords_consumption"
  | "moodboard"
  | "design_rendering"
  | "design_modeling"
  | "project_report"

export type DemoVisualAction = {
  type: DemoVisualType
  promptKey?: string
  generate?: boolean
  libraryTitle?: string
  // STEP 4 style moodboard: one fixed Unsplash search query per style-mood
  // widget. When present, the demo fetches one image per query (instead of the
  // single-query `promptKey` lookup) and renders them as moodboard candidates.
  queries?: string[]
}

export type DemoMessage = {
  id: string
  role: "user" | "assistant"
  stageKey: StageKey
  content: string
  visualActions?: DemoVisualAction[]
  delayMs?: number
}

export type DemoScenario = {
  id: DemoScenarioId
  title: string
  description: string
  triggerKeywords: string[]
  productCategory: string
  messages: DemoMessage[]
}