import { demoScenarios } from "./scenarios"

export function findDemoScenarioFromText(text: string) {
  const normalized = text.toLowerCase()

  return (
    demoScenarios.find((scenario) =>
      scenario.triggerKeywords.some((keyword) =>
        normalized.includes(keyword.toLowerCase())
      )
    ) ?? null
  )
}