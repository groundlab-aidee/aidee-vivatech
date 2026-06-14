import type { DemoVisualType } from "./types"

// How each demo visual is produced:
// - "generated": created live via /api/demo/visual (Unsplash / Nano Banana / Meshy)
// - "prebuilt": rendered by the existing UI from marker content embedded in the
//   scenario message's `content` (Project Direction, Problem Statements, Keywords,
//   Persona, TAM SAM SOM, Positioning Map, Keywords: Consumption, Project Report)
export const demoVisualSource: Record<DemoVisualType, "generated" | "prebuilt"> = {
  project_direction: "prebuilt",
  problem_statements: "prebuilt",
  keywords_experience: "prebuilt",
  keywords_relationship: "prebuilt",
  persona: "prebuilt",
  tam_sam_som: "prebuilt",
  positioning_map: "prebuilt",
  keywords_consumption: "prebuilt",
  moodboard: "generated",
  design_rendering: "generated",
  design_modeling: "generated",
  project_report: "prebuilt",
}
