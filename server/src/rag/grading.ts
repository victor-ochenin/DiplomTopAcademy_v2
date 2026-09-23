import { noul, score, TypeSafeClient } from '@typesafe-ai/sdk'

// Пороги вердикта — явные именованные константы, а не магия внутри промпта.
// Калибруются на реальных сдачах студентов; менять только здесь.
export const PASS_THRESHOLD = 0.8
export const CRITERION_THRESHOLD = 0.5
export const BLOCKING_THRESHOLD = 0.7
export const BLOCKING_UNCERTAIN_LOW = 0.35

export interface GradingTask {
  id: string
  kind: 'file' | 'project'
  /** Формулировка задания. Обязательна: критерии вида «работает корректно»
   *  невозможно оценить без знания требуемого поведения. */
  question: string
  criteria: string[]
}

export interface GradingVerdict {
  passed: boolean
  coverage: number
  failedCriteria: string[]
  blocking: boolean
  overall: number
  confidence: number
  needsReview: boolean
  usage: { input_tokens: number; output_tokens: number }
}

export const BLOCKING_QUESTION_ID = 'has_blocking_violation'
export const OVERALL_QUESTION_ID = 'overall'

// Минимальная форма клиента, нужная модулю. Позволяет внедрять фейк в тестах
// без сети и без ключа, не подменяя модуль SDK целиком.
export interface TypeSafeLikeClient {
  systemOne(request: unknown): Promise<{
    model: string
    answers: unknown
    usage: { input_tokens: number; output_tokens: number }
  }>
}

// Ключ вопроса-критерия. Индекс, а не текст критерия: id не отправляется модели
// и не влияет на инференс, зато стабилен и не ломается на спецсимволах.
export function criterionQuestionId(index: number): string {
  return `criterion_${index}`
}

// Клиент создаётся лениво: конструктор TypeSafeClient падает без TYPESAFE_API_KEY,
// а модуль импортируется и в тестах, и при неполном .env.
let cachedClient: TypeSafeLikeClient | null = null

// Клиент по умолчанию. Публичный, чтобы служебные проверки могли переиспользовать
// реальную конфигурацию (baseURL, retry, timeout) вместо её дублирования.
export function buildGradingClient(): TypeSafeLikeClient {
  return new TypeSafeClient() as unknown as TypeSafeLikeClient
}

let clientFactory: () => TypeSafeLikeClient = buildGradingClient

// Точка внедрения для тестов: подменить фабрику клиента без реальной сети и ключа.
export function setGradingClientFactory(
  factory: () => TypeSafeLikeClient,
): void {
  clientFactory = factory
  cachedClient = null
}

export function getClient(): TypeSafeLikeClient {
  cachedClient ??= clientFactory()
  return cachedClient
}

export function hasApiKey(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY)
}

// Ответы приходят под динамическими ключами (criterion_0, criterion_1, ...),
// поэтому одного статического вывода типов SDK недостаточно — читаем через
// проверяемый хелпер, который бросает при неожиданной форме ответа.
export function noulValue(
  answers: Record<string, unknown>,
  questionId: string,
): number {
  const answer = answers[questionId]
  if (
    typeof answer !== 'object' ||
    answer === null ||
    (answer as { type?: unknown }).type !== 'noul' ||
    typeof (answer as { noul?: unknown }).noul !== 'number'
  ) {
    throw new Error(`TypeSafe: unexpected answer for question "${questionId}"`)
  }
  return (answer as { noul: number }).noul
}

export function scoreValue(
  answers: Record<string, unknown>,
  questionId: string,
): { score: number; confidence: number } {
  const answer = answers[questionId]
  if (
    typeof answer !== 'object' ||
    answer === null ||
    (answer as { type?: unknown }).type !== 'score' ||
    typeof (answer as { score?: unknown }).score !== 'number' ||
    typeof (answer as { confidence?: unknown }).confidence !== 'number'
  ) {
    throw new Error(`TypeSafe: unexpected answer for question "${questionId}"`)
  }
  const typed = answer as { score: number; confidence: number }
  return { score: typed.score, confidence: typed.confidence }
}

export function choiceValue(
  answers: Record<string, unknown>,
  questionId: string,
): { choice: string; confidence: number } {
  const answer = answers[questionId]
  if (
    typeof answer !== 'object' ||
    answer === null ||
    (answer as { type?: unknown }).type !== 'choice' ||
    typeof (answer as { choice?: unknown }).choice !== 'string' ||
    typeof (answer as { confidence?: unknown }).confidence !== 'number'
  ) {
    throw new Error(`TypeSafe: unexpected answer for question "${questionId}"`)
  }
  const typed = answer as { choice: string; confidence: number }
  return { choice: typed.choice, confidence: typed.confidence }
}

// Один запрос к jev: по одному Noul на каждый критерий задания плюс Noul на
// блокирующие нарушения и общий Score. Вся политика (пороги, композиция) — в коде,
// поэтому вердикт воспроизводим и не зависит от того, как модель сформулировала текст.
export async function gradeSubmission(
  task: GradingTask,
  code: string,
  client: TypeSafeLikeClient = getClient(),
): Promise<GradingVerdict> {
  const response = await client.systemOne({
    state: {
      task: {
        kind: task.kind,
        question: task.question,
        criteria: task.criteria,
      },
      submission: {
        code,
        layout:
          task.kind === 'project'
            ? 'несколько файлов, разделители "--- filename ---"'
            : 'один файл',
      },
    },
    questions: {
      ...Object.fromEntries(
        task.criteria.map((criterion, index) => [
          criterionQuestionId(index),
          noul(`Выполняет ли сдача критерий задания: ${criterion}`, {
            true: 'Код явно и полностью выполняет требование критерия',
            false: 'Требование не выполнено или выполнено частично',
          }),
        ]),
      ),
      [BLOCKING_QUESTION_ID]: noul(
        'Есть ли блокирующее нарушение: код не компилируется, нарушает правила темы (например правила React), или не относится к заданию?',
        {
          true: 'Код сломан или нарушает правила темы',
          false: 'Блокирующих нарушений нет',
        },
      ),
      [OVERALL_QUESTION_ID]: score(
        'Насколько сдача соответствует заданию в целом?',
        [
          'Не решает задачу',
          'Решает частично',
          'Решает задачу, есть замечания',
          'Полностью корректное идиоматичное решение',
        ] as const,
      ),
    },
  })

  const answers = response.answers as unknown as Record<string, unknown>

  const coverage =
    task.criteria.reduce(
      (sum, _criterion, index) =>
        sum + noulValue(answers, criterionQuestionId(index)),
      0,
    ) / task.criteria.length

  const failedCriteria = task.criteria.filter(
    (_criterion, index) =>
      noulValue(answers, criterionQuestionId(index)) < CRITERION_THRESHOLD,
  )

  const violation = noulValue(answers, BLOCKING_QUESTION_ID)
  const blocking = violation >= BLOCKING_THRESHOLD
  const uncertain = violation > BLOCKING_UNCERTAIN_LOW && !blocking

  const overall = scoreValue(answers, OVERALL_QUESTION_ID)
  const passed = !blocking && coverage >= PASS_THRESHOLD && overall.score >= 2

  return {
    passed,
    coverage,
    failedCriteria,
    blocking,
    overall: overall.score,
    confidence: overall.confidence,
    needsReview: uncertain,
    usage: response.usage,
  }
}
