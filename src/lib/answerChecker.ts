const MCQ_MAP: Record<string, string> = {
  '1': '①',
  '2': '②',
  '3': '③',
  '4': '④',
  '5': '⑤',
}

function normalizeMCQ(answer: string): string {
  const trimmed = answer.trim()
  return MCQ_MAP[trimmed] ?? trimmed
}

export function checkMCQ(userAnswer: string, correct: string): boolean {
  return normalizeMCQ(userAnswer).toLowerCase() === normalizeMCQ(correct).toLowerCase()
}

export function checkShortAnswer(userAnswer: string, correct: string): boolean {
  const userNum = parseFloat(userAnswer.trim())
  const correctNum = parseFloat(correct.trim())

  if (!isNaN(userNum) && !isNaN(correctNum)) {
    return Math.abs(userNum - correctNum) < 0.001
  }

  return userAnswer.trim().toLowerCase() === correct.trim().toLowerCase()
}
