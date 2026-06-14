import type { DemoScenario } from "../types"

export const vivatechDemo3: DemoScenario = {
  id: "vivatech_demo_3",
  title: "Future Lifestyle Tech Product",
  description: "A premium smart product for young professionals.",
  productCategory: "Lifestyle Tech",
  triggerKeywords: ["vivatech_demo_3", "future tech", "smart lifestyle"],
  messages: [
    {
      id: "demo3_m1",
      role: "user",
      stageKey: "step_1_idea",
      content:
        "I want to design a smart lifestyle product for young professionals."
    },
    {
      id: "demo3_m2",
      role: "assistant",
      stageKey: "step_1_idea",
      content:
        "Great. I’ll structure this idea into a complete product planning flow.",
      visualActions: [
        {
          type: "project_direction",
          libraryTitle: "Project Direction"
        }
      ]
    },
    {
      id: "demo3_m3",
      role: "assistant",
      stageKey: "step_4_style",
      content:
        "Based on the selected style keywords, I’ll generate a moodboard for the product direction.",
      visualActions: [
        {
          type: "moodboard",
          promptKey: "moodboard",
          generate: true,
          libraryTitle: "Mood Board"
        }
      ]
    },
    {
      id: "demo3_m4",
      role: "assistant",
      stageKey: "step_5_design",
      content:
        "Now I’ll generate the main 3D-style design rendering.",
      visualActions: [
        {
          type: "design_rendering",
          promptKey: "design_rendering",
          generate: true,
          libraryTitle: "3D Design: Rendering"
        }
      ]
    },
    {
      id: "demo3_m5",
      role: "assistant",
      stageKey: "step_5_design",
      content:
        "Finally, I’ll prepare the image source for 3D modeling.",
      visualActions: [
        {
          type: "design_modeling",
          promptKey: "design_modeling",
          generate: true,
          libraryTitle: "3D Design: Modeling"
        }
      ]
    }
  ]
}