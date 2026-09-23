import { choice } from '@typesafe-ai/sdk'
import { choiceValue, getClient, type TypeSafeLikeClient } from './grading.js'

// Порог уверенности роутинга — явная константа, а не магия в промпте.
// Ниже порога — уточняющий вопрос студенту, без угадывания.
export const ROUTING_CONFIDENCE_MIN = 0.6

export const ROUTING_QUESTION_ID = 'routing'

export type RouteKind =
  'course_question' | 'meta_question' | 'off_topic' | 'clarify'

export interface RouteDecision {
  kind: RouteKind
  /** Какую метку фактически выбрала модель (для логов; может отличаться от kind при clarify). */
  selected: string
  confidence: number
  usage: { input_tokens: number; output_tokens: number }
}

// Фиксированные тексты — политика в коде, модель их не формулирует.
export const CLARIFY_MESSAGE =
  'Уточните, пожалуйста: это вопрос по материалу курса (React/Vue), вопрос о прогрессе или заданиях, либо что-то другое?'

export const OFF_TOPIC_MESSAGE =
  'Я отвечаю только на вопросы по курсу React/Vue, прогрессу и заданиям тренажёра. Пожалуйста, спросите по теме.'

// Один Choice-запрос к jev: классификация намерения + confidence.
// Порог и ветвление — в коде, поэтому маршрут воспроизводим.
export async function routeQuestion(
  question: string,
  client: TypeSafeLikeClient = getClient(),
): Promise<RouteDecision> {
  const response = await client.systemOne({
    state: { question },
    questions: {
      [ROUTING_QUESTION_ID]: choice('Что запрашивает студент?', {
        course_question: 'Вопрос по материалу курса (React/Vue)',
        meta_question:
          'Вопрос о самом ассистенте, прогрессе, заданиях, тренажёре — кто он, что умеет, как пользоваться',
        off_topic: 'Не относится к курсу',
      }),
    },
  })

  const answers = response.answers as unknown as Record<string, unknown>
  const { choice: selected, confidence } = choiceValue(
    answers,
    ROUTING_QUESTION_ID,
  )

  const base = { selected, confidence, usage: response.usage }

  // Ниже порога не гадаем — просим уточнить. Незнакомая метка — так же.
  if (
    confidence < ROUTING_CONFIDENCE_MIN ||
    (selected !== 'course_question' &&
      selected !== 'meta_question' &&
      selected !== 'off_topic')
  ) {
    return { kind: 'clarify', ...base }
  }

  return { kind: selected, ...base }
}
