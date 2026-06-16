import type { DemoScenario } from '../types'

const demo2DesignRenderingPrompts = [
  `A premium desktop speaker designed as an adjustable sculptural object for a curated home office.

The product combines the language of a precision desk lamp, studio equipment, and a compact speaker. It has a weighted base, a short articulated support structure, refined mechanical joints, and a directional perforated speaker head that can be tilted toward the user.

The design should feel bold, precise, and collectible without looking like aggressive consumer electronics. It should be something the user proudly displays beside a monitor rather than hiding behind it.

Monochromatic signal red finish, matte powder coated metal, subtle rubber joint details, clean geometric forms, compact desk scale.

Studio product photography on a light gray seamless background, soft diffused lighting, realistic shadows, photorealistic industrial design render, full product visible, no branding, no text, no people.`,

  `A sculptural desktop speaker designed as a collectible ceramic object for a design-conscious workspace.

The product has a rounded monolithic body with a gently tilted speaker face, soft organic geometry, and a precise circular perforated grille pattern. It should feel closer to a small sculpture, ceramic pot, or refined home object than a conventional tech device.

The form should visually belong among a monitor, lamp, plant, books, and carefully curated desk accessories. It should feel calm, warm, timeless, and display-worthy.

Matte cream ceramic-like finish, subtle seam lines, compact desk scale, soft rounded edges, minimal controls.

High-end studio product photography, light gray background, soft natural shadows, premium lifestyle object, photorealistic render, no branding, no text, no people.`,

  `A premium sculptural desktop speaker designed as a contemporary design object.

The speaker is constructed from a series of concentric circular tubular rings that gradually increase in diameter, creating a spiral-like architectural silhouette. At the center sits a circular speaker driver integrated seamlessly within the ring structure.

The outermost ring extends downward into two minimal vertical supports connected to a smooth rounded rectangular base. The overall composition feels like a piece of modern gallery furniture, kinetic sculpture, and industrial design prototype.

Monochromatic ultramarine blue finish throughout the entire object. Matte powder-coated metal surface with subtle texture. Minimal controls integrated into the base with two small circular buttons. Thin matching blue cable trailing softly behind the product.

Clean geometric proportions, highly refined industrial design language, collectible design object aesthetic, inspired by contemporary design galleries and premium home office accessories.

Studio product photography on a seamless warm light-gray background. Soft diffused lighting, realistic shadows, shallow depth of field, photorealistic rendering, centered composition, full product visible.

No branding, no logo, no text, no people, no additional objects, high-end industrial design visualization, award-winning product render.`,

  `A premium minimalist desktop speaker inspired by Scandinavian industrial design.

The product consists of a simple rectangular monolithic body supporting a large circular front-facing speaker that dominates the composition. The speaker appears as a perfect disc attached to a compact geometric base, creating a bold contrast between circular and rectangular forms.

A single oversized rotary volume knob is integrated into the lower front corner. Small subtle indicator lights and minimal interface details are carefully placed without disrupting the simplicity of the design.

The overall form should feel calm, iconic, timeless, and highly intentional. Inspired by modern industrial design, contemporary gallery objects, and premium audio equipment.

Monochromatic coral pink finish across the entire product including the speaker grille, housing, controls, and cable. Matte powder-coated surface, soft rounded edges, refined proportions, seamless construction.

Compact desktop scale suitable for a home office, creative studio, or modern living space.

Studio product photography on a seamless light gray background. Soft diffused lighting, realistic shadows, subtle depth of field, photorealistic rendering, centered composition.

No branding, no logos, no text, no people, no additional objects, high-end industrial design render, award-winning product visualization.`,
]

export const vivatechDemo2: DemoScenario = {
  id: 'vivatech_demo_2',

  title: 'Articulated Robotic Arm Desk Speaker',

  description:
    'A positionable desktop speaker designed as a robotic arm sculpture — combining directional sound control with bold aesthetic expression for home office and interior-conscious users.',

  productCategory: 'Home Audio / Desk Accessory',

  triggerKeywords: [
    'vivatech_demo_2',
    'robotic arm speaker',
    'desk speaker design',
    'articulated speaker',
  ],

  messages: [
    /* --- STEP 0: START --- */
    {
      id: 'demo2_user_1',
      role: 'user',
      stageKey: 'step_0_start',
      content:
        'I want to design a desktop speaker that looks like a robotic arm. It should be positionable and feel like a piece of art on a desk.',
    },

    {
      id: 'demo2_assistant_1',
      role: 'assistant',
      stageKey: 'step_0_start',
      content: [
        'A new project has been created.',
        '',
        "'Aidee' will help transform your idea into a structured product concept. Here is a summary of the information gathered so far.",
        '',
        '<<AIDEE_PROJECT_DIRECTION>>',
        'Project Direction',
        '',
        '# Project Name',
        'Articulated Robotic Arm Desk Speaker',
        '',
        '# Project Goal',
        'Design a positionable desktop speaker in the form of a robotic arm that functions as both a high-quality audio device and a sculptural desk object.',
        '',
        '# Product Category',
        'Home Audio / Desk Accessory',
        '',
        '# Budget / Timeline',
        '$10K – $50K / 3–6 Months',
        '',
        '# Expected Size',
        'Compact desk-top product (approx. 30–50 cm tall)',
        '',
        '# Key Features',
        'simple structure',
        '',
        '# Final Use Case',
        'Personal use and exhibition-ready MVP',
        '',
        '# Idea Summary',
        'A desktop speaker that doubles as a statement piece — inspired by industrial robotic arms, reimagined for the modern home office with a bold monochromatic design and freely positionable joints.',
        '',
        '# Reference Materials',
        'No reference images have been uploaded. The initial direction is based on the project description.',
        '',
        '<</AIDEE_PROJECT_DIRECTION>>',
      ].join('\n'),

      visualActions: [
        {
          type: 'project_direction',
          libraryTitle: 'Project Direction',
        },
      ],
    },

    {
      id: 'demo2_assistant_2',
      role: 'assistant',
      stageKey: 'step_0_start',
      content: [
        'No reference images have been uploaded yet, so the initial concept direction will be established based on your description.',
        '',
        'If you have additional thoughts about the product\'s form, materials, sound quality expectations, or target environment, feel free to share.',
      ].join('\n'),
    },

    {
      id: 'demo2_user_2',
      role: 'user',
      stageKey: 'step_0_start',
      content:
        'I imagine it sitting on a work desk next to a monitor. The arm should rotate and tilt so the speaker can be pointed in any direction. The whole thing should feel bold and sculptural — like something you would find in a design store.',
    },

    {
      id: 'demo2_assistant_3',
      role: 'assistant',
      stageKey: 'step_0_start',
      content: [
        'Understood.',
        '',
        'You are envisioning a desk-top speaker that sits alongside a monitor, with multi-joint articulation for precise directional control. The aesthetic should feel intentional and sculptural — the kind of object that attracts attention in a design-forward workspace.',
        '',
        '---',
        '',
        '### Project Goal',
        'Design a positionable robotic arm speaker that is equally compelling as a sound device and a desk sculpture.',
        '',
        '### Product Category',
        'Home Audio / Desk Accessory',
        '',
        '### Budget / Timeline',
        '$10K – $50K / 3–6 Months',
        '',
        '### Final Use Case',
        'Personal ownership and exhibition prototype',
        '',
        '---',
        '',
        'Would you like to review the full development process together?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_3',
      role: 'user',
      stageKey: 'step_0_start',
      content: 'View process',
    },

    {
      id: 'demo2_assistant_4',
      role: 'assistant',
      stageKey: 'step_0_start',
      content: [
        'Yes, you selected "Review Process."',
        'The Aidee team will structure your idea through the following 7-step process.',
        '',
        '---',
        '',
        '### 1. Development Conditions',
        'Clarify the project goal, product category, budget, timeline, and basic development constraints.',
        '### 2. User Clarification',
        'Define the core user and build a concrete persona for the product.',
        '### 3. Development Direction',
        'Analyze market trends and competitors to define the strategic direction of the product.',
        '### 4. Style Concept',
        'Select keywords that define the product\'s overall style and atmosphere, then create a moodboard.',
        '### 5. Design Concept Confirmation',
        'Review concrete design concepts, make revisions, and confirm the final direction.',
        '### 6. Project Proposal',
        'Generate a final project proposal that summarizes all discussions and decisions.',
        '### 7. Partner Matching',
        'Recommend potential partners who can support actual design, development, or production.',
        '',
        '---',
        '',
        'Next, we will move to **STEP 1. Define Requirements**.',
        'Shall we continue?',
      ].join('\n'),
    },

    /* --- STEP 1: DEFINE REQUIREMENTS --- */
    {
      id: 'demo2_user_4',
      role: 'user',
      stageKey: 'step_1_idea',
      content: 'Continue to the next step',
    },

    {
      id: 'demo2_assistant_5',
      role: 'assistant',
      stageKey: 'step_1_idea',
      content: [
        'Welcome to **STEP 1. Development Conditions**.',
        '',
        'In this step, we will translate your idea into a structured product concept and establish the goals and constraints that will guide all future decisions.',
        '',
        'What is the single most important outcome you would like this product to achieve?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_5',
      role: 'user',
      stageKey: 'step_1_idea',
      content:
        'I want to prove that a speaker can be a design object — something people buy for how it looks as much as how it sounds.',
    },

    {
      id: 'demo2_assistant_6',
      role: 'assistant',
      stageKey: 'step_1_idea',
      content: [
        'The primary goal has been set: to create a speaker that is valued equally for its aesthetic presence and its audio performance.',
        '',
        'Where will this product primarily be used?',
        '',
        'For example — a home office desk, a living room shelf, a studio workspace, or a retail display environment?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_6',
      role: 'user',
      stageKey: 'step_1_idea',
      content:
        'Mainly a home office desk, but it should look good enough to work in a living room or a creative studio as well.',
    },

    {
      id: 'demo2_assistant_7',
      role: 'assistant',
      stageKey: 'step_1_idea',
      content: [
        'Understood. The product will be designed primarily for a home office desk, while remaining visually cohesive in living room and creative studio settings.',
        '',
        'Based on the discussion so far, the core idea and development conditions have been clarified.',
        '',
        '---',
        '',
        '### Project Goal',
        'Create a speaker that functions as a design object — valued for its sculptural form as much as its sound quality.',
        '',
        '### Product Category',
        'Desktop speaker with articulated robotic arm form factor.',
        '',
        '### Key Features',
        'Multi-joint positionable arm, integrated speaker driver, monochromatic sculptural finish, coiled cable connection.',
        '',
        '### Budget / Timeline',
        '$10K – $50K / 3–6 Months',
        '',
        '### Final Use Case',
        'Personal ownership and exhibition prototype.',
        '',
        '---',
        '',
        'Next, we will move to **STEP 2. User Clarification**.',
      ].join('\n'),
    },

    /* --- STEP 2: USER CLARIFICATION --- */
    {
      id: 'demo2_user_7',
      role: 'user',
      stageKey: 'step_2_persona',
      content: 'Continue to the next step',
    },

    {
      id: 'demo2_assistant_8',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Let\'s proceed to **STEP 2. User Clarification**.',
        '',
        'In this stage, our Product Strategist and Marketing Specialist will help identify the core users of your product in greater detail.',
        '',
        'Imagine a specific person who might realistically purchase and use this product.',
        '',
        'Can you describe their daily environment and how they currently think about the objects on their desk?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_8',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'They probably work from home several days a week and spend a lot of time at their desk. They care about how their workspace looks — they might follow interior accounts on Instagram or buy furniture from design brands. They want their desk to feel intentional, not just functional.',
    },

    {
      id: 'demo2_assistant_9',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'I understand.',
        '',
        'This person treats their desk as an extension of their personal identity — every object is a deliberate choice.',
        '',
        'What frustrations do they currently experience with the audio products available to them?',
        '',
        '**If they could find a speaker that truly matched the rest of their curated workspace, how might that change their relationship with it?**',
      ].join('\n'),
    },

    {
      id: 'demo2_user_10',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'Most speakers are either boring black boxes or they try too hard to look "techy." Neither feels right for a carefully designed space. If something looked genuinely beautiful, they would probably display it prominently rather than hiding it behind a monitor.',
    },

    {
      id: 'demo2_assistant_10',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'That is a sharp observation.',
        '',
        'The current market offers two unsatisfying extremes: generic utilitarian boxes and overtly aggressive tech aesthetics. Neither serves someone who has invested in building a refined environment.',
        '',
        'What do they currently do to make their desk feel more designed?',
        '',
        'For example — do they choose peripherals by color, collect small sculptures or plants, follow specific design movements, or curate objects they find at independent shops?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_11',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'They mix functional items with decorative ones — a nice lamp, a ceramic pot, maybe a small sculpture. Everything tends to follow a consistent color palette. They are the type to buy a more expensive version of something just because it looks right.',
    },

    {
      id: 'demo2_assistant_12',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Understood.',
        '',
        'They are operating with an interior design mindset at the desk scale — consistent palette, mix of functional and decorative, willing to pay a premium for the right aesthetic.',
        '',
        'What specific limitations do they feel when trying to add audio to this kind of space?',
        '',
        'Is it primarily a visual mismatch, a size problem, a cable management issue, or something about how speakers are typically marketed?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_12',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'Mostly visual mismatch. The speaker ends up being the one object that breaks the aesthetic. Cable management is also annoying, but the bigger issue is that no speaker feels like it belongs in a design-conscious space.',
    },

    {
      id: 'demo2_assistant_13',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Understood.',
        '',
        'The core friction is aesthetic incompatibility — the speaker is the weakest link in an otherwise intentional environment.',
        '',
        'Based on the discussion so far, I organized the Problem Statements below.',
        '',
        '## Problem Statements',
        '',
        '### Context:',
        'Design-conscious remote workers building curated home office environments',
        '',
        'Young professionals working from home invest significant thought into the objects they place in their workspace. They follow interior design trends, choose peripherals with aesthetic intent, and treat their desk as a reflection of personal taste. They purchase considered objects from design brands and independent stores, maintaining a consistent visual language across the space.',
        '',
        '### Problem:',
        'No speaker exists that genuinely belongs in a design-forward workspace',
        '',
        'Existing desktop speakers fall into two unsatisfying categories: generic black or grey boxes that disappear but add no value, or aggressively "tech" products that actively clash with refined interiors. Neither option serves someone who has carefully curated every other object on their desk. As a result, the speaker becomes the one compromise — hidden behind a monitor, tolerated rather than celebrated.',
        '',
        '### Needs:',
        'A speaker that earns its place as a visible, intentional desk object',
        '',
        'This user wants a speaker that they are proud to display prominently. It should function as a sculptural object with a consistent design language, integrate naturally into a curated palette, and deliver audio quality worthy of its price point. The ideal product removes the need to choose between sound and aesthetics.',
        '',
        'Is there anything you would like to add?',
      ].join('\n'),

      visualActions: [
        {
          type: 'problem_statements',
          libraryTitle: 'Problem Statements',
        },
      ],
    },

    {
      id: 'demo2_user_13',
      role: 'user',
      stageKey: 'step_2_persona',
      content: 'That is perfect. Please continue.',
    },

    {
      id: 'demo2_assistant_14',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Problem Statements have been finalized.',
        '',
        'Next, shall we derive **Keywords: Experience**?',
        '',
        'When using this product:',
        '- What emotions should the user feel?',
        '- What actions should the product encourage?',
        '- What kind of atmosphere should it create in the space?',
        '',
        'Please freely share any keywords that come to mind.',
      ].join('\n'),
    },

    {
      id: 'demo2_user_14',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'I want users to feel proud when someone notices it, curious when they first see it, and satisfied every time they adjust its position.',
    },

    {
      id: 'demo2_assistant_15',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Those are strong emotional anchors — **pride, curiosity, and tactile satisfaction**.',
        '',
        'What kind of behavioral shift would you like this product to create?',
        '',
        'For example:',
        '- Moving the speaker to a more visible position on the desk',
        '- Adjusting it throughout the day as part of a small ritual',
        '- Using it as a conversation starter with guests or colleagues on video calls',
        '- Simply spending more time at their desk because it feels better',
        '',
        'What behavioral change matters most to you?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_15',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'I think the most important one is that they stop hiding it. The product should make users want to display it front and center.',
    },

    {
      id: 'demo2_assistant_16',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Understood.',
        '',
        '**Visibility** — moving from something hidden to something proudly displayed — is the core behavioral shift.',
        '',
        'Finally, what kind of atmosphere should this product create in the space around it?',
        '',
        'For example, should it feel like a precision instrument, a collectible art object, an industrial relic, or something warmer and more domestic?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_16',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'Something between a precision instrument and a collectible — it should feel considered and slightly unexpected, like it came from a design studio rather than a consumer electronics brand.',
    },

    {
      id: 'demo2_assistant_17',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Perfect.',
        '',
        'Based on what you shared, I organized the experience keywords below.',
        '',
        '## Keywords: Experience',
        '',
        '### Emotion',
        'Pride, Curiosity, Satisfaction, Delight, Ownership, Identity, Confidence, Appreciation',
        '',
        '### Behavior',
        'Display, Adjust, Interact, Collect, Share, Customize, Explore, Position',
        '',
        '### Space',
        'Considered, Unexpected, Studio-like, Precise, Collectible, Intentional, Bold, Focused',
      ].join('\n'),

      visualActions: [
        {
          type: 'keywords_experience',
          libraryTitle: 'Keywords: Experience',
          cardData: {
            title: 'Keywords: Experience',
            description:
              'A speaker experience that feels immediately connected to a curated workspace, allowing users to place, adjust, and display the product with confidence. Without unnecessary complexity or visual mismatch, the product naturally belongs among monitors, lamps, plants, books, and personal desk objects. Through intuitive positioning, stable structure, refined material expression, and display-worthy presence, it becomes more than an audio device — a long-lasting object that supports ownership, taste, and everyday workspace rituals.',
            keywords: [
              'Proud Display',
              'Curated Workspace',
              'Tactile Adjustment',
              'Visual Confidence',
              'Desk Identity',
              'Daily Ritual',
              'Conversation Starter',
              'Lasting Ownership',
            ],
          },
        },
      ],
    },

    {
      id: 'demo2_user_17',
      role: 'user',
      stageKey: 'step_2_persona',
      content: 'Great. What comes next?',
    },

    {
      id: 'demo2_assistant_18',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Keywords: Experience have been finalized.',
        '',
        'Next, shall we explore **Keywords: Relationship**?',
        '',
        'In this step, we will define how this product should relate to:',
        '- Other objects sharing the desk',
        '- The physical and digital workspace environment',
        '- The rhythm of the user\'s day',
        '- Other people who see or interact with it',
        '',
        'How would you like this product to coexist with the other objects on the desk?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_18',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'It should feel like it belongs to the same family as the other objects — not competing, but complementing. If the desk has a neutral palette, the speaker should anchor it. If someone has a more expressive setup, it should hold its own.',
    },

    {
      id: 'demo2_assistant_19',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Understood.',
        '',
        'The speaker should function as a visual anchor — strong enough to stand alone, harmonious enough to sit within a curated collection.',
        '',
        'How should it relate to the user\'s working environment throughout the day?',
        '',
        'For example, should it feel active and present during focused work, or quiet and ambient in the background? Should adjusting its position feel like a conscious ritual or a casual habit?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_19',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'I think adjusting it should feel like a small ritual — the way someone might reposition a lamp or rotate a plant. It adds intention to the workspace without demanding attention.',
    },

    {
      id: 'demo2_assistant_20',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'I like that framing.',
        '',
        'The act of positioning becomes a micro-ritual — a small physical gesture that reinforces the sense of ownership and care in the space.',
        '',
        'How should this product relate to time — is it something that changes with the user\'s evolving taste, or should it feel timeless and permanent?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_20',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'Timeless. It should not look dated in five years. The kind of object you keep and move with you when you change apartments.',
    },

    {
      id: 'demo2_assistant_21',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Understood — designed to last and to travel with its owner.',
        '',
        'Finally, how should this product relate to other people?',
        '',
        'For example, should it prompt conversation, signal taste to visitors, appear on video calls as part of a background, or simply be recognized by others who appreciate design?',
      ].join('\n'),
    },

    {
      id: 'demo2_user_21',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'All of those, honestly. It should be recognizable enough that someone who appreciates design will immediately understand it, and interesting enough that someone who does not will ask about it.',
    },

    {
      id: 'demo2_assistant_22b',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'Understood. It should communicate clearly on two levels — immediately legible to those with design literacy, intriguing to everyone else.',
        '',
        'Based on our conversation, I organized the relationship keywords below.',
        '',
        '## Keywords: Relationship',
        '',
        '### Objects',
        'Anchor, Complement, Coexist, Harmonize, Palette, Curated, Collection, Presence',
        '',
        '### Environment',
        'Ritual, Intentional, Quiet, Focused, Studio, Workspace, Ambient, Grounding',
        '',
        '### Time',
        'Timeless, Durable, Lasting, Heirloom-quality, Enduring, Portable, Permanent, Ageless',
        '',
        '### People',
        'Signal, Conversation, Recognition, Taste, Legible, Intriguing, Shared appreciation, Identity',
      ].join('\n'),

      visualActions: [
        {
          type: 'keywords_relationship',
          libraryTitle: 'Keywords: Relationship',
          cardData: {
            title: 'Keywords: Relationship',
            description:
              'A speaker that does not compete with its surroundings but strengthens them — standing as a visual anchor while remaining completely at home within a carefully curated collection. It communicates sophistication without aggression, belongs alongside design-forward tools and objects, and becomes a subtle conversation starter about taste and intentional purchasing. Over months and years, it remains relevant, lasting, and eventually iconic within the personal story of the workspace.',
            keywords: [
              'Visual Anchor',
              'Harmonious Fit',
              'Studio Presence',
              'Timeless Design',
              'Conversation Starter',
              'Workspace Ritual',
              'Taste Signal',
              'Lasting Icon',
            ],
          },
        },
      ],
    },

    {
      id: 'demo2_user_22',
      role: 'user',
      stageKey: 'step_2_persona',
      content: 'Great. Please continue to the next step.',
    },

    {
      id: 'demo2_assistant_23',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'The **Keywords: Relationship** card has been finalized.',
        '',
        'Next, we will create a **Persona**.',
        '',
        'Based on everything we discussed, let\'s define a realistic user who would benefit most from this product.',
        '',
        'Can you briefly describe:',
        '- Age range',
        '- Occupation or lifestyle',
        '- How they approach buying objects for their space',
        '- What their desk currently looks like',
        '',
        'Feel free to answer naturally.',
      ].join('\n'),
    },

    {
      id: 'demo2_user_23',
      role: 'user',
      stageKey: 'step_2_persona',
      content:
        'Late 20s to mid-30s. Works in a creative or knowledge-based field — design, tech, media, marketing. Buys fewer things but spends more on each one. Their desk probably has a good monitor arm, a mechanical keyboard in a neutral color, a nice lamp, and a couple of carefully chosen objects. They would spend $300 on a speaker if it looked right.',
    },

    {
      id: 'demo2_assistant_24',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'That is a precise and convincing portrait.',
        '',
        'Based on this, I created the Persona Summary below.',
        '',
        '## Persona Summary',
        '',
        '### Demographic Info',
        '- Late 20s to mid-30s',
        '- Works in design, tech, media, or creative industries',
        '- Remote or hybrid work schedule',
        '- Urban apartment dweller',
        '- Buys less but invests more per object',
        '- Follows design and interior accounts online',
        '',
        '### Persona Story',
        'Jamie is a 31-year-old UX designer working remotely from a carefully arranged apartment in the city. Every object on their desk has been chosen with intention — a matte white monitor arm, a custom keycap keyboard, a concrete pen holder, a small ceramic pot. The one compromise is the speaker: a mid-range bluetooth box that works fine but feels completely out of place. Jamie has been looking for a replacement for two years but has not found anything that earns a prominent spot on the desk.',
        '',
        '### Problem & Needs',
        '- Cannot find a speaker that matches a design-forward workspace',
        '- Current options feel either invisible or aesthetically aggressive',
        '- Wants an object that is proudly displayed, not hidden',
        '- Needs audio quality to match the price premium',
        '- Wants something that will not look dated in five years',
        '',
        '### Current Behavior',
        '- Researches products extensively before purchasing',
        '- Reads design blogs and follows independent brands on social media',
        '- Places the current speaker behind the monitor to hide it',
        '- Buys peripheral accessories from design-oriented brands',
        '- Occasionally adjusts objects on the desk as part of a workspace ritual',
        '',
        '### Lifestyle Context',
        '- Values craft, materiality, and considered design',
        '- Spends significantly on home and workspace objects',
        '- Treats purchases as long-term investments',
        '- Hosts friends and colleagues at home regularly',
        '- Work and personal aesthetics are closely aligned',
        '',
        '### Relationship Keyword',
        '- Speaker as anchor object for the desk palette',
        '- Positioning as a small daily ritual',
        '- Object that signals taste to visitors',
        '- Timeless over trend-driven',
        '- Proud to display rather than hide',
        '',
        'Would you like to add or revise anything in this persona?',
        '',
        'The Persona Card has been generated.',
        '',
        '<<AIDEE_PERSONA_CARD>>',
        JSON.stringify({
          demographicInfo: [
            'Late 20s to mid-30s',
            'Creative or knowledge-work professional',
            'Remote or hybrid work schedule',
            'Urban apartment dweller',
            'Design-conscious buyer',
          ],
          personaStory: [
            'Curates every desk object',
            'Cannot find a fitting speaker',
            'Hides current speaker behind monitor',
            'Invests in long-lasting pieces',
            'Workspace reflects personal identity',
          ],
          problemNeeds: [
            'No speaker fits a refined desk',
            'Generic options break the aesthetic',
            'Wants visible, proud placement',
            'Needs timeless design language',
            'Audio quality must match price',
          ],
          currentBehavior: [
            'Researches purchases thoroughly',
            'Follows design and interior brands',
            'Hides speaker behind monitor',
            'Repositions desk objects as ritual',
            'Buys fewer but higher-quality items',
          ],
          lifestyleContext: [
            'Values craft and materiality',
            'Treats objects as investments',
            'Hosts visitors at home regularly',
            'Work and personal aesthetics aligned',
            'Spends significantly on workspace',
          ],
          relationshipKeyword: [
            'Speaker as desk anchor',
            'Positioning as daily ritual',
            'Signals taste to visitors',
            'Timeless over trend-driven',
            'Displayed, not hidden',
          ],
        }),
        '<</AIDEE_PERSONA_CARD>>',
      ].join('\n'),

      visualActions: [
        {
          type: 'persona',
          generate: true,
          promptKey: 'persona',
          libraryTitle: 'Persona',
        },
      ],
    },

    {
      id: 'demo2_assistant_25',
      role: 'assistant',
      stageKey: 'step_2_persona',
      content: [
        'The Persona Card has been confirmed.',
        '',
        'Next, we will move to **STEP 3. Development Direction**.',
        '',
        'In this stage, we will define the product direction more clearly through market sizing, consumption trends, and competitor analysis.',
      ].join('\n'),
    },

    /* --- STEP 3: DEVELOPMENT DIRECTION --- */
    {
      id: 'demo2_assistant_26',
      role: 'assistant',
      stageKey: 'step_3_direction',
      content: [
        '## STEP 3. Development Direction',
        '',
        'In this stage, we will use market evidence to define the design and development direction of the articulated desk speaker.',
        '',
        'Select a research area below to generate its report and visualization.',
        '',
        '<<AIDEE_DIRECTION_WIDGETS>>',
        '<</AIDEE_DIRECTION_WIDGETS>>',
      ].join('\n'),
    },

    {
      id: 'demo2_user_24',
      role: 'user',
      stageKey: 'step_3_direction',
      content: 'View market size research',
    },

    {
      id: 'demo2_assistant_27',
      role: 'assistant',
      stageKey: 'step_3_direction',
      content: [
        '## Tam Sam Som',
        '',
        'The premium design-object speaker market sits at the intersection of two growing categories: the high-end portable audio market and the design home accessories market.',
        '',
        'Both are expanding as remote work normalizes investment in home environments and as younger consumers increasingly treat functional objects as collectibles.',
        '',
        '### Market Size Summary',
        'The market for speakers positioned as design objects is nascent but benefits from strong tailwinds in premium audio and home design spending.',
        '',
        '### Current Market Outlook',
        'Approximately $2.1B (premium portable and desktop speaker segment)',
        '',
        '### 5-Year Market Outlook',
        'Approximately $3.8B',
        '',
        '### 10-Year Market Outlook',
        'Approximately $6.2B',
        '',
        '---',
        '',
        '### 01. TAM (Total Addressable Market)',
        'Global premium consumer audio market.',
        '',
        'This includes all high-end wireless and wired speakers, soundbars, and desktop audio products priced above $150. It reflects broad demand for elevated audio experiences in home and workspace settings across all demographics.',
        '',
        '### 02. SAM (Serviceable Addressable Market)',
        'Premium desktop speakers targeted at design-conscious consumers aged 25–45.',
        '',
        'This segment includes buyers who evaluate audio products on aesthetic merit alongside performance. Key competitors include Transparent Speaker, Teenage Engineering, and Bang & Olufsen. The segment is characterized by limited distribution through design stores and direct-to-consumer channels.',
        '',
        '### 03. SOM (Serviceable Obtainable Market)',
        'Articulated or positionable design-object speakers for home office and creative workspace environments.',
        '',
        'This highly specific niche does not yet have a dominant player. An articulated robotic arm form factor would occupy an entirely new product category within the premium design speaker space, with initial distribution through design retail, direct-to-consumer, and exhibition channels.',
        '',
        '---',
        '',
        '### PROJECT GOAL',
        'The product aims to create a new category within the SAM — positionable sculptural speakers — while building brand equity that can scale into broader premium audio.',
        '',
        'The Tam Sam Som card has been generated.',
        '',
        'The selected research has been completed.',
        '',
        'You can also review other development direction research areas. Shall we proceed to **STEP 4. Style Concept**?',
      ].join('\n'),

      visualActions: [
        {
          type: 'tam_sam_som',
          libraryTitle: 'Tam Sam Som',
        },
      ],
    },

    {
      id: 'demo2_user_25',
      role: 'user',
      stageKey: 'step_3_direction',
      content: 'View consumer trend research',
    },

    {
      id: 'demo2_assistant_28',
      role: 'assistant',
      stageKey: 'step_3_direction',
      content: [
        '## Keywords: Consumption',
        '',
        'Summary: Object-oriented consumption and workspace identity trends among design-literate young adults',
        '',
        'Consumer behavior among design-conscious young adults increasingly blurs the line between functional products and collectible objects.',
        '',
        'Remote work has accelerated investment in workspace environments. Consumers who previously allocated design budgets to living rooms now apply the same logic to their desks. Products that combine genuine utility with strong aesthetic identity command significant price premiums and generate organic word-of-mouth.',
        '',
        'The concept of "considered consumption" — buying fewer, better things — is particularly strong in this segment. Brand storytelling, material quality, and design provenance matter as much as specifications.',
        '',
        'Keywords: Object-as-Identity, Considered Consumption, Workspace Curation, Premium Utility, Design Provenance, Sculptural Function, Monochrome Palette, Collectible Tech, Independent Brand, Limited Edition, Craft + Technology, Heirloom Quality, Display-worthy, Form-follows-feeling, Anti-generic, Slow Design, Bold Minimalism, Creative Professional, Lifestyle Signal, Tactile Satisfaction',
        '',
        'The Keywords: Consumption card has been generated.',
        '',
        'The selected research has been completed.',
        '',
        'Shall we proceed to **STEP 4. Style Concept**?',
      ].join('\n'),

      visualActions: [
        {
          type: 'keywords_consumption',
          libraryTitle: 'Keywords: Consumption',
        },
      ],
    },

    {
      id: 'demo2_user_26',
      role: 'user',
      stageKey: 'step_3_direction',
      content: 'View competitor research',
    },

    {
      id: 'demo2_assistant_29',
      role: 'assistant',
      stageKey: 'step_3_direction',
      content: [
        '## Positioning Map: Brand',
        '',
        '**X Axis:** High Audio Performance ↔ High Aesthetic Value',
        '**Y Axis:** Mass Market ↔ Niche / Design-forward',
        '',
        '### Quadrant 1: Niche + High Aesthetic Value',
        '',
        'Teenage Engineering, Transparent Speaker, Muuto',
        '',
        'These products are purchased primarily for their visual identity and design provenance. Audio performance is secondary to form.',
        '',
        '### Quadrant 2: Niche + High Audio Performance',
        '',
        'Genelec, Focal, Devialet',
        '',
        'These brands deliver exceptional audio quality for audiophiles and professional users. Aesthetic is functional and precise rather than decorative.',
        '',
        '### Quadrant 3: Mass Market + High Audio Performance',
        '',
        'Sonos, Bose, Sony',
        '',
        'These brands provide reliable audio performance at accessible price points with broad distribution. Design is competent but not distinctive.',
        '',
        '### Quadrant 4: Mass Market + High Aesthetic Value',
        '',
        'Bang & Olufsen, Marshall',
        '',
        'These brands successfully sell premium aesthetics to a broader audience, though their visual language has become widely recognized and therefore less exclusive.',
        '',
        'OUR BRAND: Niche + Equal Weight on Aesthetic and Performance',
        '',
        'The articulated desk speaker occupies the intersection of Quadrant 1 and Quadrant 2 — a product that refuses to compromise on either audio quality or aesthetic ambition.',
        '',
        'Unlike Teenage Engineering or Transparent Speaker, the form factor introduces physical interaction (positioning) as a third dimension of value. Unlike Genelec, the product is explicitly designed for lifestyle environments rather than professional studios.',
        '',
        'The Positioning Map: Brand card has been generated.',
        '',
        'All development direction research has been completed.',
        '',
        'Shall we proceed to **STEP 4. Style Concept**?',
      ].join('\n'),

      visualActions: [
        {
          type: 'positioning_map',
          libraryTitle: 'Positioning Map: Brand',
        },
      ],
    },

    /* --- STEP 4: STYLE CONCEPT --- */
    {
      id: 'demo2_user_27',
      role: 'user',
      stageKey: 'step_4_style',
      content: 'Proceed to the Style Concept stage!',
    },

    {
      id: 'demo2_assistant_30',
      role: 'assistant',
      stageKey: 'step_4_style',
      content: [
        '## STEP 4. Style Concept Development',
        '',
        'We are now entering the stage where the visual and material identity of the speaker will be defined.',
        '',
        'Our Style Design Team has prepared a collection of keywords across four dimensions.',
        '',
        'Please choose up to **five keywords** from each category.',
        '',
        '<<AIDEE_STYLE_KEYWORD_PICKER>>',
        JSON.stringify({
          emotional: [
            'Bold', 'Playful', 'Precise', 'Confident', 'Calm',
            'Provocative', 'Refined', 'Expressive', 'Iconic', 'Focused',
            'Unexpected', 'Warm', 'Authoritative', 'Curious', 'Timeless',
            'Energetic', 'Meditative', 'Industrial', 'Poetic', 'Assured',
          ],
          color: [
            'Monochromatic', 'Signal Red', 'Matte Black', 'Warm White', 'Deep Navy',
            'Concrete Grey', 'Olive', 'Burnt Orange', 'Sand', 'Forest Green',
            'Off-white', 'Charcoal', 'Cobalt', 'Terracotta', 'Graphite',
            'Cream', 'Ink', 'Stone', 'Dusty Rose', 'Chrome',
          ],
          structure: [
            'Articulated', 'Sculptural', 'Modular', 'Jointed', 'Cantilevered',
            'Compact', 'Geometric', 'Asymmetric', 'Balanced', 'Mechanical',
            'Organic', 'Angular', 'Rounded', 'Layered', 'Extended',
            'Stable', 'Dynamic', 'Minimal', 'Structural', 'Positionable',
          ],
          texture: [
            'Matte Powder Coat', 'Cast Aluminium', 'ABS Plastic', 'Coiled Cable',
            'Brushed Metal', 'Smooth Polymer', 'Perforated Surface', 'Rubber Joint',
            'Anodized Finish', 'Soft-touch Coating', 'Textured Grip', 'Polished Steel',
            'Composite Body', 'Woven Mesh', 'Raw Concrete', 'Ceramic Glaze',
            'Recycled Nylon', 'Injection Mould', 'Lacquered Wood', 'Knurled Surface',
          ],
          selected: {
            emotional: ['Bold', 'Iconic', 'Unexpected', 'Precise', 'Timeless'],
            color: ['Monochromatic', 'Signal Red', 'Matte Black', 'Warm White', 'Concrete Grey'],
            structure: ['Articulated', 'Sculptural', 'Jointed', 'Positionable', 'Mechanical'],
            texture: ['Matte Powder Coat', 'Cast Aluminium', 'Coiled Cable', 'Perforated Surface', 'Rubber Joint'],
          },
        }),
        '<</AIDEE_STYLE_KEYWORD_PICKER>>',
      ].join('\n'),
    },

    {
      id: 'demo2_user_28',
      role: 'user',
      stageKey: 'step_4_style',
      content:
        'I selected the following style keywords:\n\n' +
        '**Emotion**: Bold, Iconic, Unexpected, Precise, Timeless\n' +
        '**Color**: Monochromatic, Signal Red, Matte Black, Warm White, Concrete Grey\n' +
        '**Structure**: Articulated, Sculptural, Jointed, Positionable, Mechanical\n' +
        '**Texture**: Matte Powder Coat, Cast Aluminium, Coiled Cable, Perforated Surface, Rubber Joint',
    },

    {
      id: 'demo2_assistant_31',
      role: 'assistant',
      stageKey: 'step_4_style',
      content: [
        'I reviewed the style keywords you selected.',
        '',
        'You are aiming for something **bold, iconic, and unexpected** — a product that makes an immediate visual statement while feeling timeless and precisely made.',
        '',
        'The color direction spans **monochromatic signal red through matte black and warm white** — suggesting a product that can be offered in strong single-color editions, each creating a distinct character.',
        '',
        'The form should feel **articulated, sculptural, and mechanical** — celebrating the jointed arm structure as the central design feature rather than concealing it.',
        '',
        'The material palette of **matte powder coat, cast aluminium, perforated speaker grille, and rubber joints** communicates both quality and industrial intent.',
        '',
        'Based on these keywords, I have prepared **three style moodboard directions** for the product.',
        '',
        'Please review the options below and select the style direction that best matches your vision.',
      ].join('\n'),

      visualActions: [
        {
          type: 'moodboard',
          generate: true,
          queries: [
            'red robotic arm sculpture minimal white background studio',
            'bold monochrome industrial design object desk accessory',
            'precision mechanical product design matte powder coat detail',
          ],
        },
      ],
    },

    /* --- STEP 5: DESIGN CONCEPT --- */
    {
      id: 'demo2_user_29',
      role: 'user',
      stageKey: 'step_4_style',
      content: 'I selected a style reference and created a moodboard.',
    },

    {
      id: 'demo2_assistant_32',
      role: 'assistant',
      stageKey: 'step_5_design',
      content: [
        'The style references and moodboard have been completed. The visual direction of the product is now clearly defined.',
        '',
        'Next, we will move to **STEP 5. Design Concept Confirmation**.',
        '',
        'In this stage, you will review actual product design concepts based on the finalized style direction and select the concept that best represents your vision.',
        '',
        'Once the design concept is confirmed, we will establish the final product design direction and proceed.',
      ].join('\n'),

      visualActions: [
        {
          type: 'design_rendering',
          generate: true,
          prompts: demo2DesignRenderingPrompts,
          count: 4,
        },
      ],
    },

    {
      id: 'demo2_assistant_33',
      role: 'assistant',
      stageKey: 'step_5_design',
      content: [
        'Take a moment to review the four design concepts above and choose the one that best captures your vision.',
        '',
        'When you have found your favorite, press **Confirm** on that concept. I will immediately turn it into an interactive 3D model using Meshy AI.',
        '',
        'Once the model is ready, you can rotate it freely and inspect its form, proportions, and joint details from every angle before we move on.',
      ].join('\n'),
    },

    /* --- STEP 6: FINAL PROPOSAL --- */
    {
      id: 'demo2_assistant_34',
      role: 'assistant',
      stageKey: 'step_6_rfp',

      content: [
      '## STEP 6. Evaluation & Product Development Proposal',
      '',
      '### 1. Project Overview',
      '',
      '**Project Name**',
      'Articulated Robotic Arm Desk Speaker',
      '',
      '**One-line Product Definition**',
      'A positionable desktop speaker in the form of a precision robotic arm — designed to function equally as a high-fidelity audio device and a sculptural desk object.',
      '',
      '**Project Goal**',
      'Prove that a speaker can be a design object — purchased and displayed for its aesthetic presence as much as its sound.',
      '',
      '**Final Use Case**',
      'Personal ownership, home office and creative workspace display, exhibition prototype',
      '',
      '---',
      '',
      '### 2. Persona',
      '',
      '**Main Target**',
      'Design-conscious young professionals aged 28–36 working in creative or knowledge-based industries',
      '',
      '**Usage Context**',
      'Primarily used as a desktop speaker in a home office environment, visible and prominently displayed rather than hidden.',
      '',
      '**Core Needs / Problems**',
      'No existing speaker fits a carefully curated design-forward workspace. The user needs a product that is proud to display — one that anchors the desk palette and signals taste to others.',
      '',
      '---',
      '',
      '### 3. Product Direction',
      '',
      '**Core Value**',
      'The product removes the trade-off between sound quality and aesthetic ambition, creating a new category of positionable design-object speakers for discerning workspace environments.',
      '',
      '**Style Keywords**',
      'Bold, Iconic, Unexpected, Precise, Timeless, Monochromatic, Signal Red, Matte Black, Articulated, Sculptural, Jointed, Mechanical, Matte Powder Coat, Cast Aluminium, Coiled Cable, Perforated',
      '',
      '**Directions to Avoid**',
      '- Generic consumer electronics aesthetic',
      '- Wireless-first design that eliminates the coiled cable as a visual feature',
      '- Overly complex controls or digital interfaces',
      '- Trend-driven color choices that will date quickly',
      '- Feature bloat (voice assistant, RGB lighting, app dependency)',
      '',
      '---',
      '',
      '### 4. Functional Requirements',
      '',
      '**Must-have Core Features**',
      '- Multi-joint articulated arm with stable positioning in any angle',
      '- Integrated full-range speaker driver with adequate bass response for desk use',
      '- Coiled cable connection as both functional and aesthetic feature',
      '- Monochromatic finish available in multiple colorways',
      '- Stable weighted base with minimal footprint',
      '',
      '**Nice-to-have Features**',
      '- Detachable/swappable speaker head for future colorway expansions',
      '- Passive radiator for enhanced low-frequency response',
      '- Optional wireless adapter accessory for users who prefer cable-free use',
      '',
      '---',
      '',
      '### 5. Implementation & Production Conditions',
      '',
      '**Budget Range**',
      '$10K – $50K',
      '',
      '**Target Timeline**',
      '3–6 Months',
      '',
      '**Size / Form Factor**',
      'Desktop object, approximately 35–50 cm tall, compact base under 15 cm diameter',
      '',
      '**Implementation Considerations**',
      '- Joint mechanism must support reliable repositioning without loosening over time',
      '- Matte powder coat finish requires consistent application across all arm segments',
      '- Speaker driver placement within articulated head introduces acoustic chamber design challenges',
      '- Cable routing through or alongside the arm joints must feel intentional, not incidental',
      '- Weight distribution must prevent tipping at extreme arm positions',
      '',
      '---',
      '',
      '### 6. References & Research',
      '',
      '**Reference Summary**',
      'A precision-crafted, monochromatic sculptural speaker that draws from industrial robotic arm aesthetics and positions itself at the intersection of design collectible and high-fidelity audio.',
      '',
      'The premium design-object speaker market is nascent but growing strongly, with no dominant player in the articulated or positionable form factor category. Strong tailwinds from remote work culture and workspace curation spending support the timing.',
      '',
      'Consumer trends point toward considered consumption, object-as-identity purchasing, and workspace investment among design-literate young adults. Premium utility with design provenance commands significant price tolerance in this segment.',
      '',
      'Competitor analysis places this product at the intersection of Teenage Engineering (design provenance, collector appeal) and Genelec (audio performance credibility) — a position currently unoccupied in the market.',
      '',
      '---',
      '',
      '### 7. Success Criteria',
      '',
      '- The product is placed visibly on the desk, not hidden behind a monitor',
      '- Users describe it unprompted as a design object when recommending it to others',
      '- Audio quality receives credible positive assessment from audio-literate reviewers',
      '- The product remains visually coherent with design-forward desk setups 5+ years after launch',
      '- It generates conversation — on video calls, in person, and on social media — without any effort from the brand',
      '',
      '<<AIDEE_RFP_JSON>>',
      JSON.stringify({
        projectName: 'Articulated Robotic Arm Desk Speaker',
        oneLineDefinition:
          'A positionable desktop speaker in the form of a precision robotic arm — designed to function equally as a high-fidelity audio device and a sculptural desk object.',
        projectGoal: 'Prove that a speaker can be a design object — purchased and displayed for its aesthetic presence as much as its sound.',
        finalPurpose: 'Personal ownership, home office and creative workspace display, exhibition prototype',
        mainTarget: 'Design-conscious young professionals aged 28–36 in creative or knowledge-based industries',
        usageContext:
          'Primarily used as a desktop speaker in a home office environment, displayed prominently rather than hidden.',
        coreNeeds:
          'A speaker that fits a carefully curated design-forward workspace — one that anchors the desk palette and is proud to display.',
        coreValue:
          'Removes the trade-off between sound quality and aesthetic ambition, creating a new category of positionable design-object speakers.',
        styleKeywords: [
          'Bold', 'Iconic', 'Unexpected', 'Precise', 'Timeless',
          'Monochromatic', 'Signal Red', 'Matte Black', 'Articulated',
          'Sculptural', 'Jointed', 'Mechanical', 'Matte Powder Coat',
          'Cast Aluminium', 'Coiled Cable', 'Perforated',
        ],
        avoidDirections: [
          'Generic consumer electronics aesthetic',
          'Wireless-first design that removes the coiled cable as a visual feature',
          'Overly complex controls or digital interfaces',
          'Trend-driven color choices that will date quickly',
          'Feature bloat — voice assistant, RGB lighting, app dependency',
        ],
        mustHaveFeatures: [
          'Multi-joint articulated arm with stable positioning in any angle',
          'Integrated full-range speaker driver with adequate bass response',
          'Coiled cable connection as both functional and aesthetic feature',
          'Monochromatic finish available in multiple colorways',
          'Stable weighted base with minimal footprint',
        ],
        niceToHaveFeatures: [
          'Detachable speaker head for future colorway expansions',
          'Passive radiator for enhanced low-frequency response',
          'Optional wireless adapter accessory',
        ],
        budgetRange: '$10K – $50K',
        timeline: '3–6 Months',
        sizeOrForm: 'Desktop object, approximately 35–50 cm tall, base under 15 cm diameter',
        implementationNotes: [
          'Joint mechanism must support reliable repositioning without loosening over time',
          'Matte powder coat finish requires consistent application across all arm segments',
          'Speaker driver placement within articulated head introduces acoustic chamber design challenges',
          'Cable routing through or alongside arm joints must feel intentional',
          'Weight distribution must prevent tipping at extreme arm positions',
        ],
        referenceSummary:
          'A precision-crafted, monochromatic sculptural speaker drawing from industrial robotic arm aesthetics, positioned at the intersection of design collectible and high-fidelity audio.',
        researchInsights: [
          'The premium design-object speaker market is nascent but growing, with no dominant player in the articulated or positionable form factor category.',
          'Consumer trends among design-literate young adults point toward considered consumption, object-as-identity purchasing, and workspace investment.',
          'Competitor analysis places this product between Teenage Engineering (design provenance) and Genelec (audio credibility) — a position currently unoccupied.',
        ],
        successCriteria: [
          'The product is placed visibly on the desk, not hidden behind a monitor',
          'Users describe it as a design object when recommending it to others',
          'Audio quality receives credible positive assessment from reviewers',
          'The product remains visually coherent with design-forward setups 5+ years after launch',
          'It generates conversation on video calls, in person, and on social media',
        ],
        nextActions: [
          'Finalize joint mechanism specification and acoustic chamber design',
          'Prototype first colorway (Signal Red) for exhibition and user testing',
          'Identify manufacturing partners with powder coat and precision casting capability',
        ],
      }),
      '<</AIDEE_RFP_JSON>>',
      ].join('\n'),

      visualActions: [
        {
          type: 'project_report',
          libraryTitle: 'Project Proposal',
        },
      ],
    },

    {
      id: 'demo2_user_29',
      role: 'user',
      stageKey: 'step_6_company',
      content:
        'Great, what\'s next?',
    },

    {
      id: 'demo2_assistant_35',
      role: 'assistant',
      stageKey: 'step_6_company',
      content: [
        '## STEP 7. Partner Connection',
        '',
        '### Current Project Stage Analysis',
        '',
        'The articulated desktop speaker concept has been finalized, including user definition, experience and relationship keywords, market positioning, style direction, and the selected design concept.',
        '',
        'The project now requires detailed industrial design development, acoustic engineering validation, mechanical structure design, 3D CAD modeling, prototyping, and preparation for future manufacturing.',
        '',
        '### Recommended Partner Type',
        '',
        '**Industrial Design & Prototype Development Studio**',
        '',
        '### Why This Partner Type?',
        '',
        'The core product vision and design language have already been established. The next challenge is transforming the selected concept into a manufacturable product while preserving its sculptural and design-forward identity.',
        '',
        'This requires partners capable of integrating industrial design refinement, mechanical engineering, acoustic component packaging, prototyping, and production feasibility evaluation within a single workflow.',
        '',
        'While Aidee cannot directly provide real-time supplier matching or contact information, the following criteria can help identify suitable development partners.',
        '',
        '### Partner Selection Criteria',
        '',
        '**Expertise**',
        '- Industrial design',
        '- Mechanical engineering',
        '- Acoustic product development',
        '- Consumer electronics',
        '- Prototype fabrication',
        '- Small-batch manufacturing',
        '',
        '**Relevant Experience**',
        '- Premium consumer electronics',
        '- Audio products',
        '- Design-led hardware products',
        '- Smart home devices',
        '- Crowdfunding-oriented product launches',
        '',
        '**Integrated Capability**',
        '- Concept refinement',
        '- CAD development',
        '- Functional prototyping',
        '- Manufacturing preparation',
        '',
        '**Communication & Collaboration**',
        '- Strong design sensitivity',
        '- Rapid iteration process',
        '- Ability to balance aesthetics and engineering requirements',
        '',
        '### Key RFP Summary',
        '',
        'When contacting potential partners, consider sharing the following information:',
        '',
        '**Project Overview**',
        '- Sculptural articulated desktop speaker',
        '- Premium design-object positioning',
        '- Intended for design-conscious home office users',
        '',
        '**Target Persona**',
        '- Design-conscious professionals',
        '- Remote and hybrid workers',
        '- Consumers who curate premium workspaces',
        '',
        '**Design Direction**',
        '- Architectural and collectible-object inspired',
        '- Timeless industrial design language',
        '- Display-worthy presence',
        '- High aesthetic value combined with premium audio performance',
        '',
        '**Core Product Goals**',
        '- Adjustable and positionable form factor',
        '- Strong visual identity',
        '- High-quality desktop audio experience',
        '- Long-term ownership and display value',
        '',
        '**Project Scope**',
        '- Detailed industrial design',
        '- 3D CAD modeling',
        '- Mechanical engineering',
        '- Acoustic integration',
        '- Prototype development',
        '- Manufacturing feasibility review',
        '',
        'With these materials prepared, you will be ready to begin discussions with professional industrial design and prototype development partners.',
        '',
        '**Would you like to connect with potential development partners?**',
      ].join('\n'),
    },

    {
      id: 'demo2_user_partner_1',
      role: 'user',
      stageKey: 'step_6_company',
      content: 'Yes, please connect me with the recommended partners.',
    },

    {
      id: 'demo2_assistant_partner_2',
      role: 'assistant',
      stageKey: 'step_6_company',
      content: [
        'Finally, here are the partners we recommend for prototyping and production. Based on the requirements and design direction defined earlier, we suggest **design partners by category**.',
        '',
        '<<AIDEE_PARTNER_CONNECTION>>',
      ].join('\n'),
    },
  ],
}