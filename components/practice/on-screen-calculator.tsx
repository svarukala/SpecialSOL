'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props { hidden?: boolean }

// Eval-free: handles a op b (single binary operation)
function compute(a: number, op: string, b: number): number {
  switch (op) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    case '÷': return b !== 0 ? a / b : 0
    default: return b
  }
}

const BUTTONS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['C', '0', '=', '+'],
]

export function OnScreenCalculator({ hidden }: Props) {
  if (hidden) return null

  const [display, setDisplay] = useState('0')
  const [stored, setStored] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  function handleDigit(digit: string) {
    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }

  function handleOperator(op: string) {
    const current = parseFloat(display)
    if (stored !== null && operator && !waitingForOperand) {
      const result = compute(stored, operator, current)
      setDisplay(String(result))
      setStored(result)
    } else {
      setStored(current)
    }
    setOperator(op)
    setWaitingForOperand(true)
  }

  function handleEquals() {
    if (stored === null || operator === null) return
    const result = compute(stored, operator, parseFloat(display))
    setDisplay(String(Math.round(result * 1e10) / 1e10))
    setStored(null)
    setOperator(null)
    setWaitingForOperand(true)
  }

  function handleClear() {
    setDisplay('0')
    setStored(null)
    setOperator(null)
    setWaitingForOperand(false)
  }

  return (
    <Card className="w-fit">
      <CardContent className="p-3 space-y-2">
        <div
          role="status"
          aria-label="Calculator display"
          className="bg-muted rounded px-3 py-2 text-right font-mono text-xl min-w-[140px]"
        >
          {display}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {BUTTONS.flat().map((btn) => (
            <Button
              key={btn}
              variant={['÷', '×', '−', '+'].includes(btn) ? 'secondary' : btn === '=' ? 'default' : 'outline'}
              size="sm"
              className="text-base h-10 w-10"
              onClick={() => {
                if (btn === 'C') handleClear()
                else if (btn === '=') handleEquals()
                else if (['+', '−', '×', '÷'].includes(btn)) handleOperator(btn)
                else handleDigit(btn)
              }}
              aria-label={btn}
            >
              {btn}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
