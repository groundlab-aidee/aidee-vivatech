import { vivatechDemo1 } from "./scenarios/vivatech-demo-1"
import { vivatechDemo2 } from "./scenarios/vivatech-demo-2"
import { vivatechDemo3 } from "./scenarios/vivatech-demo-3"

export const demoScenarios = [
  vivatechDemo1,
  vivatechDemo2,
  vivatechDemo3,
]

export function getDemoScenarioById(id: string) {
  return demoScenarios.find((scenario) => scenario.id === id) ?? null
}