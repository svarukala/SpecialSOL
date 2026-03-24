// scripts/sol-curriculum.ts

export interface SolTopic {
  name: string       // used as the `topic` field in questions table
  solStandard: string // e.g. "3.2"
  description: string // human-readable for the Claude prompt
}

export interface SolSubject {
  math: SolTopic[]
  reading: SolTopic[]
}

export const SOL_CURRICULUM: Record<number, SolSubject> = {
  3: {
    math: [
      { name: 'place value and number sense',   solStandard: '3.1', description: 'Read, write, and identify place value of six-digit whole numbers' },
      { name: 'fractions',                      solStandard: '3.2', description: 'Name, write, and model fractions and mixed numbers; compare and order fractions' },
      { name: 'addition and subtraction',       solStandard: '3.3', description: 'Addition and subtraction of whole numbers up to 9,999; estimate sums/differences' },
      { name: 'multiplication',                 solStandard: '3.4', description: 'Represent multiplication as repeated addition; create/solve multiplication problems (facts 0–10)' },
      { name: 'division',                       solStandard: '3.5', description: 'Represent division as equal sharing and repeated subtraction; create/solve division problems' },
      { name: 'measurement',                    solStandard: '3.7', description: 'Measure length, determine perimeter, area, tell time, count money, read temperature' },
      { name: 'geometry',                       solStandard: '3.12', description: 'Identify plane and solid figures; congruence and symmetry' },
      { name: 'data and graphs',                solStandard: '3.14', description: 'Collect, organize, and display data using picture graphs, bar graphs, and line plots' },
      { name: 'patterns and algebra',           solStandard: '3.16', description: 'Identify, describe, create, and extend patterns; commutative and identity properties' },
    ],
    reading: [
      { name: 'word study and phonics',         solStandard: '3.2', description: 'Use phonics, word analysis, and context to decode multi-syllabic words; prefixes, suffixes, roots' },
      { name: 'vocabulary',                     solStandard: '3.4', description: 'Determine meaning of unfamiliar words using context clues and reference materials' },
      { name: 'fiction comprehension',          solStandard: '3.5', description: 'Read and demonstrate comprehension of fiction: main idea, plot, character, setting, theme' },
      { name: 'nonfiction comprehension',       solStandard: '3.6', description: 'Read and demonstrate comprehension of nonfiction: main idea, supporting details, text features' },
      { name: 'poetry',                         solStandard: '3.7', description: 'Identify rhythm, rhyme, and figurative language in poetry' },
      { name: 'research and reference',         solStandard: '3.10', description: 'Use reference materials to gather information and cite sources' },
    ],
  },
  4: {
    math: [
      { name: 'place value and rounding',       solStandard: '4.1', description: 'Place value and rounding of whole numbers through millions; compare and order' },
      { name: 'fractions and mixed numbers',    solStandard: '4.2', description: 'Compare and order fractions and mixed numbers; represent equivalent fractions' },
      { name: 'decimals',                       solStandard: '4.3', description: 'Read, write, represent, and identify decimals through thousandths' },
      { name: 'multiplication and division',    solStandard: '4.4', description: 'Multiply two-digit by two-digit numbers; estimate products; divide by one-digit divisors' },
      { name: 'fractions computation',          solStandard: '4.5', description: 'Add and subtract fractions and mixed numbers with like denominators' },
      { name: 'measurement',                    solStandard: '4.7', description: 'Measure and convert US customary and metric units; elapsed time; perimeter and area' },
      { name: 'geometry',                       solStandard: '4.10', description: 'Points, lines, angles, parallel/perpendicular lines; classify quadrilaterals and triangles' },
      { name: 'data and probability',           solStandard: '4.13', description: 'Collect, display, and interpret data; predict likelihood of outcomes; represent probability as fraction' },
      { name: 'patterns and algebra',           solStandard: '4.15', description: 'Identify and extend patterns; write and solve one-step equations' },
    ],
    reading: [
      { name: 'word study and roots',          solStandard: '4.2', description: 'Use context and word analysis to decode multi-syllabic words; Latin and Greek roots' },
      { name: 'vocabulary',                    solStandard: '4.4', description: 'Determine meaning of unfamiliar words; multiple-meaning words; figurative language' },
      { name: 'fiction comprehension',         solStandard: '4.5', description: 'Comprehend fiction: plot structure, conflict, character motivation, theme, point of view' },
      { name: 'nonfiction comprehension',      solStandard: '4.6', description: 'Comprehend nonfiction: main idea, fact vs. opinion, text structure, author\'s purpose' },
      { name: 'poetry',                        solStandard: '4.7', description: 'Identify sensory language, metaphor, simile, and personification in poetry' },
      { name: 'research and reference',        solStandard: '4.10', description: 'Use print and digital resources to locate, evaluate, and cite information' },
    ],
  },
  5: {
    math: [
      { name: 'decimals and place value',      solStandard: '5.1', description: 'Read, write, identify place value of decimals through thousandths; round decimals' },
      { name: 'fractions and decimals',        solStandard: '5.2', description: 'Represent and identify equivalences among fractions, mixed numbers, and decimals' },
      { name: 'prime and composite numbers',   solStandard: '5.3', description: 'Identify and describe prime and composite numbers; identify even and odd' },
      { name: 'fractions computation',         solStandard: '5.4', description: 'Add, subtract, and multiply fractions and mixed numbers; solve single- and multi-step problems' },
      { name: 'decimal computation',           solStandard: '5.6', description: 'Add, subtract, multiply, and divide decimals; solve single- and multi-step problems' },
      { name: 'order of operations',           solStandard: '5.7', description: 'Evaluate expressions using order of operations: parentheses, exponents, ×, ÷, +, −' },
      { name: 'measurement and geometry',      solStandard: '5.8', description: 'Perimeter, area, volume; classify angles, triangles, quadrilaterals; diameter, radius, circumference' },
      { name: 'data and probability',          solStandard: '5.14', description: 'Predict probability; represent as fractions/decimals/percents; mean, median, mode, range' },
      { name: 'patterns and algebra',          solStandard: '5.17', description: 'Write variable expressions for patterns; perfect squares and square roots; solve for missing variable' },
    ],
    reading: [
      { name: 'word study and roots',          solStandard: '5.2', description: 'Greek/Latin roots, affixes; determine word meaning from context and word analysis' },
      { name: 'vocabulary and figurative language', solStandard: '5.4', description: 'Connotation, denotation, figurative language, and idioms' },
      { name: 'fiction comprehension',         solStandard: '5.5', description: 'Analyze fiction: theme, character development, conflict, narrator perspective, literary devices' },
      { name: 'nonfiction comprehension',      solStandard: '5.6', description: 'Analyze nonfiction: author\'s purpose, argument, evidence, text structure, bias' },
      { name: 'poetry',                        solStandard: '5.7', description: 'Analyze figurative language, mood, tone, and structure in poetry' },
      { name: 'research and reference',        solStandard: '5.10', description: 'Collect, evaluate, synthesize, and cite information from print and digital resources' },
    ],
  },
}

export function getTopicsForGradeSubject(grade: number, subject: 'math' | 'reading'): SolTopic[] {
  return SOL_CURRICULUM[grade]?.[subject] ?? []
}