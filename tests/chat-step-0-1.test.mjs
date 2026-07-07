import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appendStructuredResponseBlock,
  deriveLegacyStructuredResponse,
  extractStructuredResponseBlock,
  parseStructuredChatResponse,
  resolveStageFromClientIntent,
} from '../src/lib/chat/structured-response.ts'

test('Korean STEP 0 scenario exposes process action without sentence-driven UI', () => {
  const response = parseStructuredChatResponse({
    actions: ['SHOW_REVIEW_PROCESS_BUTTON'],
    intent: 'SHOW_PROCESS_CONFIRMATION',
    message: '전체 개발 프로세스를 함께 확인해볼까요?',
    metadata: {},
    stage: 'STEP_0_START',
  })

  assert.equal(response?.intent, 'SHOW_PROCESS_CONFIRMATION')
  assert.deepEqual(response?.actions, ['SHOW_REVIEW_PROCESS_BUTTON'])
  assert.equal(
    resolveStageFromClientIntent({
      clientIntent: 'START_STEP_1',
      currentStage: 'step_0_start',
    }),
    'step_1_idea'
  )
})

test('English STEP 1 scenario exposes transition action with common machine values', () => {
  const response = parseStructuredChatResponse({
    actions: ['SHOW_STAGE_PROCEED_BUTTONS'],
    intent: 'REQUEST_STEP_2_TRANSITION',
    message: 'The core idea and development requirements are now organized.',
    metadata: {},
    stage: 'STEP_1_IDEA',
  })

  assert.equal(response?.stage, 'STEP_1_IDEA')
  assert.equal(response?.intent, 'REQUEST_STEP_2_TRANSITION')
  assert.equal(
    resolveStageFromClientIntent({
      clientIntent: 'CONTINUE_TO_STEP_2',
      currentStage: 'step_1_idea',
    }),
    'step_2_persona'
  )
})

test('structured block keeps machine fields out of the visible message', () => {
  const original = {
    actions: ['SHOW_HINT_BUTTON'],
    intent: 'ASK_STEP_1_REQUIREMENT',
    message: 'What is the primary product goal?',
    metadata: {},
    stage: 'STEP_1_IDEA',
  }
  const stored = appendStructuredResponseBlock(original)
  const extracted = extractStructuredResponseBlock(stored)

  assert.equal(extracted.cleanedText, original.message)
  assert.deepEqual(extracted.response, original)
})

test('invalid structured JSON is rejected safely', () => {
  assert.equal(
    parseStructuredChatResponse({
      actions: ['UNKNOWN_ACTION'],
      intent: 'GENERAL_RESPONSE',
      message: 'Hello',
      metadata: {},
      stage: 'STEP_0_START',
    }),
    null
  )
})

test('legacy Korean and English messages remain compatible fallbacks', () => {
  const korean = deriveLegacyStructuredResponse({
    currentStage: 'step_0_start',
    message: '전체 개발 프로세스를 함께 확인해볼까요?',
  })
  const english = deriveLegacyStructuredResponse({
    currentStage: 'step_0_start',
    message: 'Would you like to review the full development process?',
  })

  assert.equal(korean.intent, 'SHOW_PROCESS_CONFIRMATION')
  assert.equal(english.intent, 'SHOW_PROCESS_CONFIRMATION')
  assert.deepEqual(korean.actions, english.actions)
})
