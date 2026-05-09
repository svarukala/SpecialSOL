'use client'

import { useRouter } from 'next/navigation'

interface GradeFilterTabsProps {
  grades: number[]
  selectedGrade: number | null
  childId: string
}

export function GradeFilterTabs({ grades, selectedGrade, childId }: GradeFilterTabsProps) {
  const router = useRouter()

  function navigate(grade: number | null) {
    const params = new URLSearchParams()
    params.set('childId', childId)
    if (grade !== null) params.set('grade', String(grade))
    router.push(`/summer-reading?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => navigate(null)}
        className={`inline-flex items-center rounded-lg px-3 h-8 text-sm font-medium border transition-colors ${
          selectedGrade === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background hover:bg-muted border-border'
        }`}
      >
        All Grades
      </button>
      {grades.map((grade) => (
        <button
          key={grade}
          onClick={() => navigate(grade)}
          className={`inline-flex items-center rounded-lg px-3 h-8 text-sm font-medium border transition-colors ${
            selectedGrade === grade
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted border-border'
          }`}
        >
          Grade {grade}
        </button>
      ))}
    </div>
  )
}
