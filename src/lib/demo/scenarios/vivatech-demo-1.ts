import type { DemoScenario } from '../types'

export const vivatechDemo1: DemoScenario = {
  id: 'vivatech_demo_1',

  title: 'Smart Climbing Performance Wearable',

  description:
    'A wearable device that helps climbers track performance, analyze movement patterns, and improve training efficiency.',

  productCategory: 'Sports Wearable',

  triggerKeywords: [
    'vivatech_demo_1',
    'climbing wearable',
    'smart climbing coach',
    'climbing tracker',
  ],

  messages: [
    /* --- STEP 0: START --- */
    {
      id: 'demo1_user_1',
      role: 'user',
      stageKey: 'step_0_start',

      content:
        'I want to create a wearable device that helps climbers effectively record and improve their climbing performance.',
    },

    {
      id: 'demo1_assistant_1',
      role: 'assistant',
      stageKey: 'step_0_start',

      content: [
        'A new project has been created.',
        '',
        "'Aidee' will help transform your idea into a structured product concept. Here is a summary of the information gathered so far.",
        '',
        '<<AIDEE_PROJECT_DIRECTION>>',
        '프로젝트 방향',
        '',
        '# 프로젝트명',
        'Smart Climbing Performance Wearable',
        '',
        '# 프로젝트 목표',
        'Develop a wearable device that collects climbing performance data, movement patterns, fatigue indicators, and route completion records to help climbers improve their training outcomes.',
        '',
        '# 제품 카테고리',
        'Sports Wearable',
        '',
        '# 예산/기간 범위',
        '$20K+ / 6 Months',
        '',
        '# 예상 크기',
        'Compact wrist-mounted or hand-mounted wearable device',
        '',
        '# 주요 기능',
        '- Sensor detection · IoT/Ismart features',
        '',
        '# 최종 활용 목적',
        'Exhibition-ready MVP and early-stage user testing',
        '',
        '# 아이디어 정리',
        'A smart wearable device that automatically captures climbing activities, analyzes performance trends, and provides personalized training feedback.',
        '',
        '# 참고 자료',
        'No reference images have been uploaded. The initial direction is based on survey responses and project requirements.',
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
      id: 'demo1_assistant_2',
      role: 'assistant',
      stageKey: 'step_0_start',

      content: [
        'No reference images have been uploaded yet, so the initial concept direction will be established based on the survey responses.',
        '',
        'If you have additional details about the product’s appearance, materials, form factor, or intended user experience, please feel free to share them.',
      ].join('\n'),
    },

        {
      id: 'demo1_user_2',
      role: 'user',
      stageKey: 'step_0_start',

      content:
        'I do not have a specific visual image in mind yet. However, since the device should not interfere with exercise and needs to accurately measure heart rate and movement, I think a wrist-worn form would be the most suitable.',
    },

    {
      id: 'demo1_assistant_3',
      role: 'assistant',
      stageKey: 'step_0_start',

      content: [
        'Yes, I understand.',
        '',
        'You do not have a specific visual concept yet, but you are considering a wrist-worn device that can measure heart rate and movement accurately without interfering with physical activity.',
        '',
        '---',
        '',
        'Based on the information gathered so far, we can now summarize the project goals and direction.',
        '',
        '### Project Goal',
        'Develop a wrist-worn wearable device concept with climbing performance tracking and analysis features.',
        '',
        '### Product Category',
        'Digital Device',
        '',
        '### Budget / Timeline',
        '$20K – $75K / 3 Months',
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
      id: 'demo1_user_3',
      role: 'user',
      stageKey: 'step_0_start',

      content:
        'View process',
    },

    {
      id: 'demo1_assistant_4',
      role: 'assistant',
      stageKey: 'step_0_start',

      content: [
        'Yes, you selected “Review Process.”',
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
        'Select keywords that define the product’s overall style and atmosphere, then create a moodboard.',
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
        'In this step, we will clarify the project goal and constraints in more detail.',
        '',
        'Shall we continue?',
      ].join('\n'),
    },

    /* --- STEP 1: DEFINE REQUIREMENTS --- */
    {
        id: 'demo1_user_4',
        role: 'user',
        stageKey: 'step_1_idea',
        content:
            'Continue to the next step',
    },

    {
        id: 'demo1_assistant_5',
        role: 'assistant',
        stageKey: 'step_1_idea',

        content: [
            'Certainly. Let’s proceed to the next step.',
            '',
            'Welcome to the **STEP 1. Development Conditions** stage. In this step, we will translate your idea into a structured product concept and establish the goals and constraints that will guide all future decisions.',
            '',
            'At the moment, the Smart Climbing Performance Wearable is positioned as an "idea development project".',
            'What is the single most important outcome you would like this product to achieve?',
        ].join('\n'),
    },

    {
      id: 'demo1_user_5',
      role: 'user',
      stageKey: 'step_1_idea',

      content:
        'I want to provide a new way of recording that innovates the climbing user experience.',
    },
    {
      id: 'demo1_assistant_6',
      role: 'assistant',
      stageKey: 'step_1_idea',

      content: [
        'The primary goal has been set as providing a new recording experience that innovates the climbing user experience.',
        '',
        'Next, we should define the main climbing environment for this wearable device.',
        '',
        'Where do you want this device to be used most often?',
        'Indoor climbing gyms, outdoor natural climbing environments, or both?',
      ].join('\n'),
    },
    {
      id: 'demo1_user_6',
      role: 'user',
      stageKey: 'step_1_idea',

      content:
        'I want it to be flexible enough to be used in both indoor and outdoor climbing environments.',    
    },
    {
      id: 'demo1_assistant_7',
      role: 'assistant',
      stageKey: 'step_1_idea',

      content: [
        'Understood. The device will be planned as a flexible wearable that can be used in both indoor and outdoor climbing environments.',
        'Based on the discussion so far, the core idea and development conditions of the project have been clarified.',
        '',
        '---',
        '',
        '### Project Goal',
        'Provide a new recording experience that innovates the climbing user experience.',
        '',
        '### Product Category',
        'A wrist-worn digital wearable device for both indoor and outdoor climbing environments.',
        '',
        '### Key Features',
        'Climbing record tracking and analysis based on heart-rate sensing, motion sensing, and smart IoT integration.',
        '',
        '### Budget / Timeline',
        '$20K – $75K / 3 Months',
        '',
        '### Final Use Case',
        'Personal ownership and exhibition prototype.',
        '',
        '---',
        '',
        'Next, we will move to **STEP 2. User Clarification**.',
        'In this step, we will define who will use this product in more detail.',
      ].join('\n'),
    },

    /* --- STEP 2: USER CLARIFICATION --- */
    {
        id: 'demo1_user_7',
        role: 'user',
        stageKey: 'step_2_persona',
        content:
            'Continue to the next step',
    },
    {
        id: 'demo1_assistant_8',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'Let’s proceed to the next step.',
            '',
            'In this stage, our Product Strategist and Marketing Specialist will help identify the core users of your product in greater detail.',
            '',
            'Rather than trying to find the perfect target user, the goal is to build one highly convincing user hypothesis.',
            '',
            'Imagine a specific person who might realistically use this product and answer as naturally as possible.',
            '',
            'Can you describe the situations in which this person climbs and the challenges or frustrations they experience during the process?',
        ].join('\n'),
    },
    {
        id: 'demo1_user_8',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'In bouldering, solving problems becomes the most visible indicator of how much exercise I did. On days when I cannot complete any problems, I feel frustrated, almost as if I did not work out at all.',
    },

    {
        id: 'demo1_assistant_9',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I understand.',
            '',
            'In bouldering, whether or not a climber completes a problem often becomes the most visible measure of their workout.',
            '',
            'Because of that, when they fail to complete a problem, they may feel as if the entire session was unproductive, even if they actually trained hard.',
            '',
            'How does this frustration affect the climber’s routine?',
            '',
            '**If they could recognize their physical effort even on days when they do not complete a problem, how might their behavior or attitude change?**',
        ].join('\n'),
    },

    {
        id: 'demo1_user_10',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'I think it would become a source of motivation that helps them continue exercising consistently.',
    },
    {
        id: 'demo1_assistant_10',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I understand that, in bouldering, it is important for users to gain the motivation to keep training consistently even when they do not complete a problem.',
            '',
            'In other words, the value should not come only from success or failure, but also from recognizing progress within the training process itself.',
            '',
            'In your current situation, what methods are users already trying in order to recognize their effort and reduce frustration?',
            '',
            'For example, are they keeping a workout journal, talking with other climbers, or recording videos of their sessions?',
            '',
            'If there is no clear method yet, that is also useful to know.',
        ].join('\n'),
    },

    {
        id: 'demo1_user_11',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'They often record workout videos and subjectively check whether a movement has improved, such as thinking, “This move looks better than before.”',
    },
    {
        id: 'demo1_assistant_12',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I see.',
            '',
            'At the moment, climbers are trying to recognize their progress by recording videos and reviewing their movements afterward.',
            '',
            'However, this approach still relies heavily on subjective judgment, and it requires additional effort to record, organize, and archive videos.',
            '',
            'What limitations do you feel this method has when it comes to measuring actual training performance?',
            '',
            'For example, is it the lack of objective data, the inconvenience of recording and managing videos, or the fact that only certain aspects of performance can be evaluated?',
        ].join('\n'),
    },

    {
        id: 'demo1_user_12',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'There is not enough objective data, and the process of recording and archiving videos is inconvenient.',
    },
    {
        id: 'demo1_assistant_13',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I understand.',
            '',
            'The current limitations are the lack of objective data and the inconvenience of recording, organizing, and archiving workout videos.',
            '',
            'If these issues accumulate, they can make it harder for climbers to stay motivated and clearly recognize their progress over time.',
            '',
            'Based on the discussion so far, I organized the Problem Statements below.',
            '',
            '## Problem Statements',
            '',
            '### Context:',
            'Growth plateau and invisible effort among bouldering climbers',
            '',
            'Active bouldering climbers continue training consistently to improve their skills, but because the sport is strongly centered on completing specific problems, it is difficult to obtain objective indicators of progress. They usually train in indoor climbing gyms for short but intensive sessions, and whether or not they complete a problem often becomes the main measure of success. At the moment, they record workout videos with smartphones and later review those videos subjectively to check whether their movements have improved.',
            '',
            '### Problem:',
            'Inefficient performance tracking that leads to frustration and reduced motivation',
            '',
            'On days when climbers fail to complete a problem, they can easily feel as if the session was wasted, which weakens their motivation to continue training over time. Video recording captures the climbing situation visually, but it does not provide objective data about training intensity, movement volume, or physical effort. In addition, filming, organizing, and storing videos is inconvenient, making it difficult to maintain consistent records. As a result, climbers struggle to understand how much effort they have actually accumulated, which reduces their sense of progress and creates a cycle of frustration.',
            '',
            '### Needs:',
            'Objective data-based achievement and sustainable motivation for growth',
            '',
            'Climbers need a way to recognize their effort through objective data even on days when they do not complete a problem. They want to feel a sense of achievement from the training process itself and maintain motivation to continue exercising consistently. Automatically recorded and analyzed performance data would help them understand their physical development and technical improvement without adding extra effort. This would support long-term climbing growth beyond simple success or failure on individual problems.',
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
        id: 'demo1_user_13',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'Great! Please continue to the next step.',
    },
    {
        id: 'demo1_assistant_14',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'Problem Statements have been finalized.',
            '',
            'Next, shall we derive **Keywords: Experience**?',
            '',
            'When using this product:',
            '- What emotions should climbers feel?',
            '- What actions should they take?',
            '- What kind of atmosphere should the product create within the climbing environment?',
            '',
            'Please freely share any keywords that come to mind for each of these areas.',
        ].join('\n'),
    },

    {
        id: 'demo1_user_14',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'I want users to feel pride, achievement, and satisfaction.',
    },

    {
        id: 'demo1_assistant_15',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I see.',
            '',
            'Positive emotions such as **pride, achievement, and satisfaction** are clearly important to the experience you want to create.',
            '',
            'What kind of behavioral changes would you like users to experience through this product?',
            '',
            'For example:',
            '- Following their training routine more consistently',
            '- Focusing more on specific climbing techniques',
            '- Becoming more aware of their physical progress',
            '- Staying motivated even when they fail to complete a problem',
            '',
            'Please describe the behavioral changes you would like to encourage.',
        ].join('\n'),
    },
    {
        id: 'demo1_user_15',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'I want users to become more aware of their physical changes and enjoy the process of exercising more.',
    },

    {
        id: 'demo1_assistant_16',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I see.',
            '',
            'You identified **awareness of physical change** and **enjoyment of exercise** as important behavioral changes.',
            '',
            'If users can clearly understand their training results, they may engage with exercise in a more enjoyable and consistent way.',
            '',
            'Finally, what kind of atmosphere should this product create when it is placed in a climbing or everyday environment?',
            '',
            'For example, should it feel professional, comfortable and natural, or energetic and motivating?',
            '',
            'Please describe how you want the product’s presence to affect the space around it.',
        ].join('\n'),
    },

    {
        id: 'demo1_user_16',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'I want it to feel comfortable and natural, as if it naturally belongs to the body rather than feeling like a separate device.',
    },
    {
        id: 'demo1_assistant_17',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I understand.',
            '',
            'You want the product to create a comfortable and natural presence, almost as if it belongs to the body rather than feeling like a separate device.',
            '',
            'Based on what you shared, I organized the experience keywords below.',
            '',
            '## Keywords: Experience',
            '',
            '### Emotion',
            'Pride, Achievement, Satisfaction, Growth, Motivation, Confidence, Reward',
            '',
            '### Behavior',
            'Awareness, Enjoyment, Consistency, Immersion, Challenge, Progress, Recovery',
            '',
            '### Space',
            'Comfort, Naturalness, Harmony, Minimal, Efficiency, Focus',
        ].join('\n'),

        visualActions: [
            {
            type: 'keywords_experience',
            libraryTitle: 'Keywords: Experience',
            },
        ],
    },
    {
        id: 'demo1_user_17',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'Great, what is the next step?',
    },

    {
        id: 'demo1_assistant_18',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'Keywords: Experience have been finalized.',
            '',
            'Next, shall we explore **Keywords: Relationship**?',
            '',
            'In this step, we will define how this product should relate to:',
            '- Elements that interrupt the climber’s focus',
            '- The space where the product is placed or used',
            '- The time and rhythm of the climbing session',
            '- Other people involved in the climbing experience',
            '',
            'How would you like this product to interact with the factors that currently interrupt focus during climbing?',
        ].join('\n'),
    },
    {
        id: 'demo1_user_18',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'The elements that interrupt focus are mostly emotional factors such as frustration. I think the product should help transform those feelings into motivation or persistence.',
    },
    {
        id: 'demo1_assistant_19',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I understand.',
            '',
            'You expect the product to transform frustration into motivation and become a source of positive energy rather than another source of pressure.',
            '',
            'Now let’s think about how the product should interact with different environments.',
            '',
            'How should it behave in a climbing gym versus everyday life?',
            '',
            'For example, during workouts it could emphasize performance and training insights, while in everyday situations it could fade into the background as a lightweight companion device.',
            '',
            'What kind of role would you like the product to play across these different contexts?',
        ].join('\n'),
    },

    {
        id: 'demo1_user_19',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'During climbing sessions, I want it to focus on performance and training features. In everyday life, it should function more like a lightweight activity tracker that measures things such as step count and daily movement.',
    },
    {
        id: 'demo1_assistant_20',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I understand.',
            '',
            'You prefer a simpler and more focused usage pattern.',
            '',
            'Rather than becoming an all-in-one health device, you want the product to support everyday activity tracking and climbing performance measurement during waking hours.',
            '',
            'You also prefer to avoid unnecessary features such as sleep tracking, excessive notifications, or reminder-based interactions.',
            '',
            'That means the relationship with time should feel natural and unobtrusive, supporting users when needed without demanding constant attention.',
            '',
            'Finally, let’s think about the product’s relationship with other people.',
            '',
            'How would you like this product to influence interactions between climbers?',
            '',
            'For example, should it encourage competition, collaboration, sharing achievements, learning from others, or simply focus on personal growth?',
        ].join('\n'),
    },

    {
        id: 'demo1_user_20',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'I think personal growth is the most important. However, if users can naturally compare progress with friends and encourage each other, that would be a positive addition.',
    },
    {
        id: 'demo1_assistant_21',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I understand.',
            '',
            'You want the device to focus on measuring essential data during waking hours and exercise sessions, without adding unnecessary functions such as reminders or notifications.',
            '',
            'In other words, the product should support the user’s daily life and training time without becoming intrusive.',
            '',
            'Finally, let’s define the product’s relationship with other people.',
            '',
            'How would you like this product to influence interactions with others?',
            '',
            'For example, should users share data with climbing partners, gain motivation through community comparison, show their growth to others, or use the data only for themselves?',
        ].join('\n'),
    },

    {
        id: 'demo1_user_21',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'I am thinking that the data should be used only personally.',
    },
    {
        id: 'demo1_assistant_22b',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'Understood. The data will stay personal, supporting the user’s own growth.',
            '',
            'Based on our conversation, I organized the relationship keywords below.',
            '',
            '## Keywords: Relationship',
            '',
            '### Focus',
            'Frustration into motivation, positive energy, encouragement, persistence, calm focus, emotional support, resilience, reassurance',
            '',
            '### Environment',
            'Performance mode at the gym, lightweight everyday tracker, context awareness, seamless transition, unobtrusive presence, adaptive behavior',
            '',
            '### Time',
            'Waking-hour tracking, natural rhythm, no sleep tracking, minimal notifications, on-demand support, non-intrusive timing',
            '',
            '### People',
            'Personal growth first, optional progress comparison, mutual encouragement, private data, independence, self-driven motivation',
        ].join('\n'),

        visualActions: [
            {
            type: 'keywords_relationship',
            libraryTitle: 'Keywords: Relationship',
            },
        ],
    },
    {
        id: 'demo1_user_22',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'Great. Please continue to the next step.',
    },
    {
        id: 'demo1_assistant_23',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'Excellent.',
            '',
            'The **Keywords: Relationship** card has been finalized.',
            '',
            'We now have a clear understanding of the user’s emotions, behaviors, environment, usage patterns, and relationship expectations surrounding the product.',
            '',
            '---',
            '',
            'Next, we will create a **Persona**.',
            '',
            'A persona is a representative user profile that helps us make product decisions from the perspective of a specific individual rather than an abstract audience.',
            '',
            'Based on everything we discussed so far, let’s define a realistic climber who would benefit most from this product.',
            '',
            'Can you briefly describe:',
            '',
            '- Age range',
            '- Occupation',
            '- Climbing experience level',
            '- How often they climb',
            '- Their primary motivation for climbing',
            '',
            'Feel free to answer naturally rather than trying to be perfectly accurate.',
        ].join('\n'),
    },
    {
        id: 'demo1_user_23',
        role: 'user',
        stageKey: 'step_2_persona',

        content:
            'I imagine this user as someone who goes climbing two or three times a week after work as part of their lifestyle routine. They would mostly use this device at the climbing gym, and they are the type of person who feels more motivated when clear, visible performance indicators are available.',
    },
    {
        id: 'demo1_assistant_24',
        role: 'assistant',
        stageKey: 'step_2_persona',

        content: [
            'I understand.',
            '',
            'You described a working adult who visits a climbing gym two or three times a week after work, and who feels more motivated when clear, visible performance indicators are available.',
            '',
            'It is also important that this device will mainly be used in climbing gyms.',
            '',
            'Based on this information, I created the Persona Summary below.',
            '',
            '## Persona Summary',
            '',
            '### Demographic Info',
            '- Mid-30s working male',
            '- Lives in Seoul',
            '- Works in a professional field',
            '- Visits climbing gyms 2–3 times a week',
            '- Prefers data-based motivation',
            '- Oriented toward a minimal lifestyle',
            '',
            '### Persona Story',
            'Park Junyoung is a working adult in his mid-30s who relieves stress and gains a sense of achievement through climbing. As his bouldering progress begins to plateau, he questions whether his training is effective and wants to regain motivation through visible indicators of growth. Regardless of whether he completes a problem, he wants to objectively confirm his effort and maintain steady long-term progress.',
            '',
            '### Problem & Needs',
            '- Feels lack of exercise when problems remain unsolved',
            '- Experiences limits of subjective video analysis',
            '- Feels frustrated due to lack of objective performance indicators',
            '- Needs motivation to sustain consistent training',
            '- Wants effortless recording and analysis',
            '',
            '### Current Behavior',
            '- Climbs 2–3 times a week after work',
            '- Occasionally records climbing videos with a smartphone',
            '- Subjectively checks movement improvement',
            '- Continues training through routine discipline',
            '- Feels unmotivated when visible results are lacking',
            '',
            '### Lifestyle Context',
            '- Values efficiency and productivity',
            '- Familiar with digital self-management tools',
            '- Prefers clean and organized environments',
            '- Seeks achievement through leisure activities',
            '- Highly interested in health and wellness',
            '',
            '### Relationship Keyword',
            '- Wants frustration to become motivation',
            '- Prefers natural everyday wearability',
            '- Uses only functions needed for exercise',
            '- Wants data to remain personal',
            '- Values independence from others’ influence',
            '',
            'Would you like to add or revise anything in this persona summary?',
            '',
            'The Persona Card has been generated.',
            '',
            'You can review it, regenerate it, or confirm it. Once confirmed, visualization will be enabled.',
            '',
            '<<AIDEE_PERSONA_CARD>>',
            JSON.stringify({
                demographicInfo: [
                    'Mid-30s working male',
                    'Seoul-based professional',
                    'Climbs 2–3 times weekly',
                    'Prefers data motivation',
                    'Minimal lifestyle oriented',
                ],
                personaStory: [
                    'Climbs after work',
                    'Seeks visible growth',
                    'Wants effort recognized',
                    'Maintains steady progress',
                    'Uses climbing for stress relief',
                ],
                problemNeeds: [
                    'Unsolved problems frustrate',
                    'Subjective video limits',
                    'Lacks objective indicators',
                    'Needs sustained motivation',
                    'Wants effortless tracking',
                ],
                currentBehavior: [
                    'Records videos occasionally',
                    'Reviews movement subjectively',
                    'Climbs after work',
                    'Maintains routine discipline',
                    'Feels down without results',
                ],
                lifestyleContext: [
                    'Values productivity',
                    'Uses digital self-care',
                    'Prefers organized spaces',
                    'Seeks leisure achievement',
                    'Interested in wellness',
                ],
                relationshipKeyword: [
                    'Frustration into motivation',
                    'Natural everyday wear',
                    'Exercise-focused functions',
                    'Personal data only',
                    'Independent growth focused',
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
        id: 'demo1_assistant_25',
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
        id: 'demo1_assistant_26',
        role: 'assistant',
        stageKey: 'step_3_direction',

        content: [
            '## STEP 3. Development Direction',
            '',
            'In this stage, we will use market evidence to define the design and development direction of the climbing performance tracking device.',
            '',
            'Select a research area below to generate its report and visualization.',
            '',
            '<<AIDEE_DIRECTION_WIDGETS>>',
            '<</AIDEE_DIRECTION_WIDGETS>>',
        ].join('\n'),
    },
    {
        id: 'demo1_user_24',
        role: 'user',
        stageKey: 'step_3_direction',

        content:
            'View market size research',
    },
    {
        id: 'demo1_assistant_27',
        role: 'assistant',
        stageKey: 'step_3_direction',

        content: [
            '## Tam Sam Som',
            '',
            'The market size for climbing performance tracking devices appears to have strong potential, supported by the growth of the sports wearable and fitness tracker markets.',
            '',
            'Advances in sensing technology and growing consumer interest in health, fitness, and personal performance tracking are expected to positively influence market expansion.',
            '',
            '### Market Size Summary',
            'Although the climbing-specific performance tracking device market is still in its early stage, it shows strong growth potential through the expansion of the broader sports wearable device market.',
            '',
            '### Current Market Outlook',
            'Approximately $7.5M',
            '',
            '### 10-Year Market Outlook',
            'Approximately $37.5M',
            '',
            '### 20-Year Market Outlook',
            'Approximately $112M',
            '',
            '### 30-Year Market Outlook',
            'Approximately $225M',
            '',
            '### 40-Year Market Outlook',
            'Approximately $375M',
            '',
            '### 50-Year Market Outlook',
            'Approximately $600M',
            '',
            '---',
            '',
            '### 01. TAM (Total Addressable Market)',
            'Global sports and fitness wearable device market.',
            '',
            'This market includes smartwatches, fitness bands, sports sensors, and other wearable devices that support health management and activity tracking. It represents broad consumer demand for monitoring physical performance, wellness, and exercise habits across multiple sports categories beyond climbing.',
            '',
            '### 02. SAM (Serviceable Addressable Market)',
            'Wearable device market specialized for climbing, mountaineering, bouldering, and related extreme sports activities.',
            '',
            'This market includes products focused on improving sports performance, safety, and activity-specific data analysis. The main users are people who want more specialized feedback than general-purpose fitness trackers can provide. At present, this market is led by smaller specialized brands, outdoor technology companies, and early-stage startups.',
            '',
            '### 03. SOM (Serviceable Obtainable Market)',
            'Wrist-worn climbing-specific performance tracking device market focused on personal training data and motivation.',
            '',
            'This target market focuses on climbers who want to measure climbing effort more precisely and receive data-based feedback for skill improvement and motivation. The initial target users are bouldering climbers who feel frustrated when they fail to complete problems and need a way to recognize effort beyond success or failure. The product can secure market share by emphasizing sensing accuracy, convenient user experience, and climbing-specific insights.',
            '',
            '---',
            '',
            '### PROJECT GOAL',
            'The climbing performance tracking device aims to build a unique position in the SOM market by leveraging the growth of the broader TAM market and the unmet potential of the SAM market.',
            '',
            'The Tam Sam Som card has been generated.',
            '',
            'You can review it, regenerate it, or confirm it. Once confirmed, visualization will be enabled.',
            '',
            'The selected research has been completed.',
            '',
            'You can also review other development direction research areas. If the current information is sufficient, shall we proceed to **STEP 4. Style Concept**?',
        ].join('\n'),

        visualActions: [
            {
            type: 'tam_sam_som',
            libraryTitle: 'Tam Sam Som',
            },
        ],
    },
    {
        id: 'demo1_user_25',
        role: 'user',
        stageKey: 'step_3_direction',

        content:
            'View consumer trend research',
    },

    {
        id: 'demo1_assistant_28',
        role: 'assistant',
        stageKey: 'step_3_direction',

        content: [
            '## Keywords: Consumption',
            '',
            '요약: Lifestyle and data-driven consumption trends for wearable sports products',
            '',
            'Recent consumer trends increasingly value lifestyle integration and emotional satisfaction beyond pure functional performance.',
            '',
            'In the sports and outdoor industries experience-driven products and personalized services are on the rise. Data-enabled smart devices are becoming important tools for improving workout quality and long-term habit formation.',
            '',
            'Consumers want to visualize their progress and integrate exercise into their daily lives. Sustainability and minimalism are key purchasing factors. Users prefer products that focus on essential functionality and aesthetic harmony.',
            '',
            '키워드: Data-Driven, Personalized, Achievement, Joy of Tracking, Minimal Design, Sustainable, Aesthetic, Self-Care, Health Focus, Wellness, Ease of Use, Activity Track, Smart Feedback, Community, Wearable Tech, Intuitive, Visual Data, Eco Design, Clean Design, Essentials, Reward System, Recovery, Lifestyle Fit, Nature Balance, Motivation, Precision, Social, Emotional Value, Enjoyable, Smart Device',
            '',
            'The Keywords: Consumption card has been generated.',
            '',
            'You can review it, regenerate it, or confirm it. Once confirmed, visualization will be enabled.',
            '',
            'The selected research has been completed.',
            '',
            'You can also review other development direction research areas. If the current information is sufficient, shall we proceed to **STEP 4. Style Concept**?',
        ].join('\n'),

        visualActions: [
            {
            type: 'keywords_consumption',
            libraryTitle: 'Keywords: Consumption',
            },
        ],
    },
    {
        id: 'demo1_user_26',
        role: 'user',
        stageKey: 'step_3_direction',

        content:
            'View competitor research',
    },

    {
        id: 'demo1_assistant_29',
        role: 'assistant',
        stageKey: 'step_3_direction',

        content: [
            '## Positioning Map: Brand',
            '',
            '**X Axis:** Premium Price ↔ Affordable Price',
            '**Y Axis:** Feature-Focused ↔ Lifestyle-Focused',
            '',
            '### Quadrant 1: Premium Lifestyle-Focused',
            '',
            'Garmin, Apple Watch',
            '',
            'These products offer premium pricing combined with broad lifestyle functionality and focus on everyday experiences through brand-driven design.',
            '',
            '### Quadrant 2: Affordable Lifestyle-Focused',
            '',
            'Fitbit, Xiaomi Mi Band',
            '',
            'These brands provide activity tracking and general wellness monitoring at accessible price points with mass-market appeal.',
            '',
            '### Quadrant 3: Affordable Feature-Focused',
            '',
            'Decathlon, Polar',
            '',
            'These products prioritize sport-specific functionality and focus on practical performance tracking for targeted sports activities.',
            '',
            '### Quadrant 4: Premium Feature-Focused',
            '',
            'Suunto, Coros',
            '',
            'These brands deliver highly accurate performance data for serious athletes and emphasize precision and durability through advanced sensing.',
            '',
            'OUR BRAND: Premium Feature-Focused — Specialized climbing performance wearable',
            '',
            'The climbing performance tracking device provides precise movement tracking and specialized analytics for bouldering climbers.',
            '',
            'Unlike general-purpose smartwatches and fitness bands it focuses on climbing-specific performance data and objective effort measurement. The device helps visualize training volume and progress providing meaningful motivation beyond simple success or failure.',
            '',
            'Compared to affordable feature-focused products it pursues greater precision and climbing specialization. Compared to premium lifestyle products it concentrates on core functions that matter most to dedicated climbers.',
            '',
            'The Positioning Map: Brand card has been generated.',
            '',
            'You can review it, regenerate it, or confirm it. Once confirmed, visualization will be enabled.',
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

    /* -- STEP 4. Style Concept Development -- */
    {
        id: 'demo1_user_27',
        role: 'user',
        stageKey: 'step_4_style',

        content:
            'Proceed to the Style Concept stage!',
    },

    {
        id: 'demo1_assistant_30',
        role: 'assistant',
        stageKey: 'step_4_style',

        content: [
            '## STEP 4. Style Concept Development',
            '',
            'We are now entering the stage where the style concept for the climbing performance tracking device will be defined in greater detail.',
            '',
            'Our Style Design Team has prepared a collection of keywords related to product emotion, color, form, and material expression.',
            '',
            'From the keyword selections provided by the system, please choose up to **five keywords** from each category that you believe best represent the ideal direction for this product.',
            '',
            '<<AIDEE_STYLE_KEYWORD_PICKER>>',
            JSON.stringify({
                emotional: [
                    'Calm', 'Comfortable', 'Stable', 'Warm', 'Focused',
                    'Energetic', 'Immersive', 'Trustworthy', 'Friendly', 'Refined',
                    'Motivating', 'Self-directed', 'Confident', 'Rewarding', 'Inspiring',
                    'Balanced', 'Empowering', 'Purposeful', 'Progressive', 'Accomplished',
                ],
                color: [
                    'Bright', 'Warm', 'Cool', 'Neutral', 'Vivid',
                    'Muted', 'Deep', 'Transparent', 'Natural', 'Minimal',
                    'Vintage', 'Rich', 'Dark', 'Light', 'Monochrome',
                    'Metallic', 'Pastel', 'Gradient', 'Organic', 'Clean',
                ],
                structure: [
                    'Compact', 'Lightweight', 'Ergonomic', 'Streamlined', 'Minimal',
                    'Rounded', 'Geometric', 'Slim', 'Balanced', 'Modular',
                    'Flexible', 'Robust', 'Adaptive', 'Portable', 'Integrated',
                    'Precise', 'Modern', 'Elegant', 'Functional', 'Wearable',
                ],
                texture: [
                    'Silicone', 'Matte Metal', 'Fabric Texture', 'Soft-touch Polymer', 'Aluminum',
                    'Titanium', 'Carbon Fiber', 'Recycled Plastic', 'Rubber', 'Ceramic',
                    'Mesh Fabric', 'Composite', 'Sustainable Material', 'Textured Surface', 'Smooth Finish',
                    'Lightweight Alloy', 'Durable Composite', 'Water-resistant Material', 'Breathable Material', 'Premium Finish',
                ],
                selected: {
                    emotional: ['Motivating', 'Trustworthy', 'Immersive', 'Self-directed', 'Refined'],
                    color: ['Natural', 'Neutral', 'Deep', 'Minimal', 'Metallic'],
                    structure: ['Ergonomic', 'Compact', 'Lightweight', 'Streamlined', 'Balanced'],
                    texture: ['Silicone', 'Matte Metal', 'Soft-touch Polymer', 'Fabric Texture', 'Durable Composite'],
                },
            }),
            '<</AIDEE_STYLE_KEYWORD_PICKER>>',
        ].join('\n'),
    },
    {
        id: 'demo1_user_28',
        role: 'user',
        stageKey: 'step_4_style',

        content:
            'I selected the following style keywords:\n\n' +
            '**Emotion**: Motivating, Trustworthy, Immersive, Self-directed, Refined\n' +
            '**Color**: Natural, Neutral, Deep, Minimal, Metallic\n' +
            '**Structure**: Ergonomic, Compact, Lightweight, Streamlined, Balanced\n' +
            '**Texture**: Silicone, Matte Metal, Soft-touch Polymer, Fabric Texture, Durable Composite',
    },
    {
        id: 'demo1_assistant_31',
        role: 'assistant',
        stageKey: 'step_4_style',

        content: [
            'I reviewed the style keywords you selected.',
            '',
            'You are aiming for a product that feels **motivating, immersive, and refined**, combined with a **natural, neutral, deep, minimal, and metallic** color direction.',
            '',
            'The form language should be **ergonomic, compact, lightweight, streamlined, and balanced**, while the material expression should feel **silicone-based, matte metallic, soft-touch, durable, and comfortable for long-term wear**.',
            '',
            'Overall, the concept points toward a wearable device that blends naturally into everyday life while delivering a focused and motivating climbing experience.',
            '',
            'Now, based on these keywords, I have prepared **three style moodboard directions** for the product.',
            '',
            'Please review the options below and select the style direction that best matches your vision.',
        ].join('\n'),

        visualActions: [
            {
                type: 'moodboard',
                generate: true,
                queries: [
                    'minimal metallic sports wearable product design',
                    'modern climbing gear close up neutral background',
                    'premium fitness tracker lifestyle minimal design',
                ],
            },
        ],
    },

    /* -- STEP 5. Design Concept Confirmation -- */
    {
        id: 'demo1_user_29',
        role: 'user',
        stageKey: 'step_4_style',

        content:
            'I selected a style reference and created a moodboard.',
    },
    {
        id: 'demo1_assistant_32',
        role: 'assistant',
        stageKey: 'step_5_design',

        content: [
            'The style references and moodboard generation have been completed. The visual direction of the product is now clearly defined.',
            '',
            'Next, we will move to **STEP 5. Design Concept Confirmation**.',
            '',
            'In this stage, you will review actual product design concepts based on the finalized style direction and select the design concept that best represents your vision.',
            '',
            'Once the design concept is confirmed, we will be able to establish the final product design direction and proceed to the next phase of development.',
        ].join('\n'),

        visualActions: [
            {
                type: 'design_rendering',
                generate: true,
                promptKey: 'design_rendering',
            },
        ],
    },
    {
        id: 'demo1_assistant_33',
        role: 'assistant',
        stageKey: 'step_5_design',

        content: [
            'Take a moment to review the four design concepts above and choose the one that best captures your vision.',
            '',
            'When you have found your favorite, press **Confirm** on that concept. I will immediately turn it into an interactive 3D model using Meshy AI.',
            '',
            'Once the model is ready, you can rotate it freely and inspect its form, proportions, and details from every angle before we move on.',
        ].join('\n'),
    },
  ],

  // STEP 6 — appended once the Meshy 3D model is ready (see onModelReady).
  finalProposalMessage: {
    id: 'demo1_assistant_34',
    role: 'assistant',
    stageKey: 'step_6_rfp',

    content: [
        '## STEP 6. Evaluation & Product Development Proposal',
        '',
        '### 1. Project Overview',
        '',
        '**Project Name**',
        'Climbing Performance Tracking Device',
        '',
        '**One-line Product Definition**',
        'A wrist-worn smart digital device that accurately and precisely measures climbing activity while also supporting everyday use, helping climbers sustain growth and motivation.',
        '',
        '**Project Goal**',
        'Idea development and concept refinement',
        '',
        '**Final Use Case**',
        'Data analysis for improving climbing performance',
        '',
        '---',
        '',
        '### 2. Persona',
        '',
        '**Main Target**',
        'Bouldering climbers',
        '',
        '**Usage Context**',
        'Mainly used during workouts at climbing gyms, while also functioning as a lightweight daily activity tracker in everyday life.',
        '',
        '**Core Needs / Problems**',
        'The user needs a way to reduce frustration when failing to complete climbing problems and gain motivation to continue exercising through objective, data-based achievement.',
        '',
        '---',
        '',
        '### 3. Product Direction',
        '',
        '**Core Value**',
        'The product contributes to climbing skill improvement through accurate and detailed activity measurement, transforming frustration into motivation and helping users rediscover the enjoyment of training.',
        '',
        '**Style Keywords**',
        'Energetic, immersive, sensory, neutral, vivid, modern, metallic, monochromatic, linear, minimal, structured, compact, matte, lightweight, elastic, minimal sporty',
        '',
        '**Directions to Avoid**',
        '- Complex controls or interfaces',
        '- Direct data sharing or community-centered features',
        '- Excessive features such as sleep tracking or recovery analytics',
        '- Unnecessary alarms and notifications',
        '',
        '---',
        '',
        '### 4. Functional Requirements',
        '',
        '**Must-have Core Features**',
        '- Accurate and detailed measurement of climbing activity intensity and volume',
        '- Sensor detection',
        '- IoT / smart functions for data transmission and analysis',
        '- Data-based feedback and visualization',
        '- Wrist-worn design',
        '- Lightweight daily activity tracking for everyday life',
        '',
        '**Nice-to-have Features**',
        '- Optional expansion into additional sports activity tracking',
        '- Personalized training insights',
        '- Session comparison over time',
        '',
        '---',
        '',
        '### 5. Implementation & Production Conditions',
        '',
        '**Budget Range**',
        '$20K – $75K',
        '',
        '**Target Timeline**',
        '1 Month',
        '',
        '**Size / Form Factor**',
        'Wrist-worn device, palm-sized, within 10 cm',
        '',
        '**Implementation Considerations**',
        '- Integrate precise sensor technology and algorithms for accurate climbing activity measurement',
        '- Ensure lightweight and comfortable wrist wearability with elastic materials',
        '- Design an intuitive and concise UI/UX aligned with a minimal sporty style',
        '- Secure durability suitable for climbing environments, including impact and water resistance',
        '- Develop effective data visualization and feedback systems that transform frustration into motivation',
        '- Implement stable daily activity tracking and data synchronization',
        '',
        '---',
        '',
        '### 6. References & Research',
        '',
        '**Reference Summary**',
        'A strong and refined wearable device direction based on a minimal sporty style, emphasizing active energy while expressing functionality through aesthetics.',
        '',
        'The climbing-specific performance tracking market is still in its early stage, but it has high growth potential through the expansion of the broader sports wearable market. The product aims to establish a unique position in the SOM market.',
        '',
        'Consumer trends emphasize data-driven growth, personalized experiences, emotional satisfaction, minimal design, and sustainability.',
        '',
        'Competitor analysis suggests that the product should target the premium feature-focused segment, similar to brands such as Suunto and Coros, while differentiating itself from general-purpose smartwatches through climbing-specific precision data and performance improvement support.',
        '',
        '---',
        '',
        '### 7. Success Criteria',
        '',
        '- Reduce frustration by providing objective activity data even when a bouldering problem is not completed',
        '- Help users recognize their effort quantitatively and stay motivated to continue training',
        '- Minimize the burden of workout recording through automatic data capture and analysis',
        '- Provide in-depth data analysis and feedback that meaningfully supports climbing performance improvement',
        '- Enable natural everyday wearability for managing daily activity habits',
        '',
        // RFP document block powers the "Project Proposal" library badge + modal.
        '<<AIDEE_RFP_JSON>>',
        JSON.stringify({
            projectName: 'Climbing Performance Tracking Device',
            oneLineDefinition:
                'A wrist-worn smart digital device that accurately and precisely measures climbing activity while also supporting everyday use, helping climbers sustain growth and motivation.',
            projectGoal: 'Idea development and concept refinement',
            finalPurpose: 'Data analysis for improving climbing performance',
            mainTarget: 'Bouldering climbers',
            usageContext:
                'Mainly used during workouts at climbing gyms, while also functioning as a lightweight daily activity tracker in everyday life.',
            coreNeeds:
                'The user needs a way to reduce frustration when failing to complete climbing problems and gain motivation to continue exercising through objective, data-based achievement.',
            coreValue:
                'The product contributes to climbing skill improvement through accurate and detailed activity measurement, transforming frustration into motivation and helping users rediscover the enjoyment of training.',
            styleKeywords: [
                'Energetic', 'Immersive', 'Sensory', 'Neutral', 'Vivid', 'Modern',
                'Metallic', 'Monochromatic', 'Linear', 'Minimal', 'Structured',
                'Compact', 'Matte', 'Lightweight', 'Elastic', 'Minimal sporty',
            ],
            avoidDirections: [
                'Complex controls or interfaces',
                'Direct data sharing or community-centered features',
                'Excessive features such as sleep tracking or recovery analytics',
                'Unnecessary alarms and notifications',
            ],
            mustHaveFeatures: [
                'Accurate and detailed measurement of climbing activity intensity and volume',
                'Sensor detection',
                'IoT / smart functions for data transmission and analysis',
                'Data-based feedback and visualization',
                'Wrist-worn design',
                'Lightweight daily activity tracking for everyday life',
            ],
            niceToHaveFeatures: [
                'Optional expansion into additional sports activity tracking',
                'Personalized training insights',
                'Session comparison over time',
            ],
            budgetRange: '$20K – $75K',
            timeline: '1 Month',
            sizeOrForm: 'Wrist-worn device, palm-sized, within 10 cm',
            implementationNotes: [
                'Integrate precise sensor technology and algorithms for accurate climbing activity measurement',
                'Ensure lightweight and comfortable wrist wearability with elastic materials',
                'Design an intuitive and concise UI/UX aligned with a minimal sporty style',
                'Secure durability suitable for climbing environments, including impact and water resistance',
                'Develop effective data visualization and feedback systems that transform frustration into motivation',
                'Implement stable daily activity tracking and data synchronization',
            ],
            referenceSummary:
                'A strong and refined wearable device direction based on a minimal sporty style, emphasizing active energy while expressing functionality through aesthetics.',
            researchInsights: [
                'The climbing-specific performance tracking market is still in its early stage, but it has high growth potential through the expansion of the broader sports wearable market. The product aims to establish a unique position in the SOM market.',
                'Consumer trends emphasize data-driven growth, personalized experiences, emotional satisfaction, minimal design, and sustainability.',
                'Competitor analysis suggests that the product should target the premium feature-focused segment, similar to brands such as Suunto and Coros, while differentiating itself from general-purpose smartwatches through climbing-specific precision data and performance improvement support.',
            ],
            successCriteria: [
                'Reduce frustration by providing objective activity data even when a bouldering problem is not completed',
                'Help users recognize their effort quantitatively and stay motivated to continue training',
                'Minimize the burden of workout recording through automatic data capture and analysis',
                'Provide in-depth data analysis and feedback that meaningfully supports climbing performance improvement',
                'Enable natural everyday wearability for managing daily activity habits',
            ],
            nextActions: [
                'Finalize the design concept and prepare for prototyping',
                'Validate sensing accuracy and wearability with early users',
                'Match with manufacturing and development partners',
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
}