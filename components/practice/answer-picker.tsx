'use client'
interface Choice { id: string; text: string; is_correct: boolean }
interface Props {
  choices: Choice[]
  selectedId: string | null
  isCorrect: boolean | null
  onSelect: (choiceId: string) => void
  disabled: boolean
}

export function AnswerPicker({ choices, selectedId, isCorrect, onSelect, disabled }: Props) {
  return (
    <div className="grid gap-3">
      {choices.map((choice) => {
        const isSelected = selectedId === choice.id
        const showResult = isSelected && isCorrect !== null
        return (
          <button
            key={choice.id}
            onClick={() => !disabled && onSelect(choice.id)}
            disabled={disabled && !isSelected}
            className={[
              'w-full text-left p-4 rounded-lg border-2 transition-colors font-medium',
              isSelected && !showResult ? 'border-primary bg-primary/10' : '',
              showResult && isCorrect ? 'border-green-500 bg-green-500/10' : '',
              showResult && !isCorrect ? 'border-yellow-500 bg-yellow-500/10' : '',
              !isSelected ? 'border-border hover:border-primary/50 hover:bg-muted' : '',
            ].join(' ')}
            aria-pressed={isSelected}
          >
            <span className="font-semibold mr-2">{choice.id.toUpperCase()}.</span>
            {choice.text}
          </button>
        )
      })}
    </div>
  )
}
