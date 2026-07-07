# Aidee chat flow trigger inventory

This document records the sentence/regex-driven behavior that existed before the structured STEP 0–1 migration. Structured responses are now authoritative for STEP 0–1; these rules remain as legacy-message fallbacks and still drive STEP 2–7.

## Server-side triggers

| Area | Legacy trigger | Connected behavior |
| --- | --- | --- |
| Stage 0 → 1 | User text matching `STEP 1 시작할게요` / `start STEP 1` | Resolves `step_1_idea` |
| Stage 1 → 2 | Completion text plus user text matching next-step phrases | Resolves `step_2_persona` |
| Stage 2 → 3 | Keyword artifacts detected by headings and user next-step text | Resolves `step_3_direction` |
| Stage 3 → 4 | Direction research headings plus next/style phrases | Resolves `step_4_style` |
| Stage 4 → 5 | Style-reference/moodboard selection phrases | Resolves `step_5_design` |
| Stage 5 → 6 | Design confirmation or RFP/project-plan phrases | Resolves `step_6_rfp` |
| Stage 6 → 7 | Partner/vendor phrases | Resolves `step_6_company` |
| Generic image generation | Image/render/moodboard words or `forceImageGeneration` | Calls Gemini image generation |
| Persona visualization | Persona + visualization/image words | Generates persona image |
| Persona confirmation/revision | Korean/English confirm or regenerate phrases | Confirms or rebuilds persona artifact |
| RFP confirmation/revision | Korean/English project-plan phrases | Confirms or regenerates RFP JSON |
| Direction research | Market/consumer/competitor research phrases | Forces STEP 3 and selected research output |
| Style flow | Style mood phrase or style picker marker | Runs Unsplash search / keyword picker |
| Persona card creation | Six exact persona section headings | Parses and stores persona card block |

Primary files: `src/lib/chat/stages.ts`, `src/app/api/chat/route.ts`.

## Client-side triggers

| Area | Legacy trigger | Connected UI/function |
| --- | --- | --- |
| Project Direction | `AIDEE_PROJECT_DIRECTION` marker and field labels | Renders Project Direction card |
| Process confirmation | Process/review question regex | Shows process-review button |
| Stage transition | STEP/next/proceed sentence regex | Shows proceed and add-more buttons |
| Hints | Question-shape regex or A/B/C lines | Shows hint modal |
| Problem Statements | Heading plus Context/Problem/Needs labels | Enables artifact actions/modal |
| Keyword cards | Experience/Relationship headings and category labels | Enables keyword cards/modals |
| Direction widgets | `AIDEE_DIRECTION_WIDGETS` marker | Shows three research widgets |
| Direction artifacts | TAM/SAM/SOM, Consumption, Positioning headings | Enables research actions/modals |
| Style picker | `AIDEE_STYLE_KEYWORD_PICKER` marker | Shows keyword-selection UI |
| Mood options | JSON text containing `moods` or `widgets` | Shows mood selection cards |
| Generated images | `AIDEE_IMAGES` block purpose | Shows moodboard/design/persona images |
| Persona | `AIDEE_PERSONA_CARD` block | Shows persona card/actions |
| RFP | `AIDEE_RFP_JSON` block | Shows report/actions/download |
| Confirmation state | User-message regexes and localStorage keys | Marks artifacts confirmed/visualized |
| Modals | Explicit user button clicks after artifact parsing | Opens persona, problem, keyword, research, report, partner, moodboard, render, and 3D modals |

Primary file: `src/components/project/ProjectChatContainer.tsx`.

## STEP 0–1 structured migration

STEP 0–1 now stores an `AIDEE_STRUCTURED_RESPONSE` block containing:

```json
{
  "message": "Would you like to review the process?",
  "stage": "STEP_0_START",
  "intent": "SHOW_PROCESS_CONFIRMATION",
  "actions": ["SHOW_REVIEW_PROCESS_BUTTON"],
  "metadata": {}
}
```

- `message` is the only user-visible value.
- `stage`, `intent`, and `actions` are language-independent.
- Client buttons send `clientIntent`; their localized label is no longer parsed to decide STEP 0–1 behavior.
- Messages without a structured block continue through the legacy regex fallback.

## Expansion plan for STEP 2–7

1. Add stage-specific intents/actions and metadata schemas to `structured-response.ts`.
2. Create separate Korean and English prompt modules for one stage at a time.
3. Switch that stage to Gemini JSON schema output in the API route.
4. Replace its UI heading/regex decisions with actions and typed metadata.
5. Preserve the existing parser only for historical messages.
6. Add bilingual scenario tests before moving to the next stage.
