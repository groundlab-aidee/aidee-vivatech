export const STEP5_SHAPES = [
  '직선으로 둘러싸인 다각형',
  '곡선으로 이루어진 도형',
  '직선과 곡선이 결합된 도형',
] as const

export const STEP5_FORMS = ['기하학적 형태', '유기적 형태', '복합 형태'] as const

export type Step5Combination = { shape: string; form: string }
