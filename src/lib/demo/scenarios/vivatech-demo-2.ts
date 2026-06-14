import type { DemoScenario } from "../types"

export const vivatechDemo2: DemoScenario = {
  id: "vivatech_demo_2",
  title: "Sustainable Cosmetic Product",
  description: "A eco-friendly cosmetic product for conscious consumers.",
  productCategory: "Cosmetics",
  triggerKeywords: ["vivatech_demo_2", "sustainable", "eco-friendly"],
  messages: [
    {
      id: "demo2_m1",
      role: "user",
      stageKey: "step_1_idea",
      content:
        "I want to design a smart lifestyle product for young professionals."
    },
    {
      id: "demo2_m2",
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
      id: "demo2_m3",
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
      id: "demo2_m4",
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
      id: "demo2_m5",
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