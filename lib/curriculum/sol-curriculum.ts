// lib/curriculum/sol-curriculum.ts

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
      { name: 'place value and number sense',   solStandard: '3.1',  description: 'Read, write, and identify place value of six-digit whole numbers' },
      { name: 'fractions',                      solStandard: '3.2',  description: 'Name, write, and model fractions and mixed numbers; compare and order fractions' },
      { name: 'addition and subtraction',       solStandard: '3.3',  description: 'Addition and subtraction of whole numbers up to 9,999; estimate sums/differences' },
      { name: 'multiplication',                 solStandard: '3.4',  description: 'Represent multiplication as repeated addition; create/solve multiplication problems (facts 0–10)' },
      { name: 'division',                       solStandard: '3.5',  description: 'Represent division as equal sharing and repeated subtraction; create/solve division problems' },
      { name: 'measurement',                    solStandard: '3.7',  description: 'Measure length, determine perimeter, area, tell time, count money, read temperature' },
      { name: 'geometry',                       solStandard: '3.12', description: 'Identify plane and solid figures; congruence and symmetry' },
      { name: 'data and graphs',                solStandard: '3.14', description: 'Collect, organize, and display data using picture graphs, bar graphs, and line plots' },
      { name: 'patterns and algebra',           solStandard: '3.16', description: 'Identify, describe, create, and extend patterns; commutative and identity properties' },
    ],
    reading: [
      { name: 'word study and phonics',         solStandard: '3.2',  description: 'Use phonics, word analysis, and context to decode multi-syllabic words; prefixes, suffixes, roots' },
      { name: 'vocabulary',                     solStandard: '3.4',  description: 'Determine meaning of unfamiliar words using context clues and reference materials' },
      { name: 'fiction comprehension',          solStandard: '3.5',  description: 'Read and demonstrate comprehension of fiction: main idea, plot, character, setting, theme' },
      { name: 'nonfiction comprehension',       solStandard: '3.6',  description: 'Read and demonstrate comprehension of nonfiction: main idea, supporting details, text features' },
      { name: 'poetry',                         solStandard: '3.7',  description: 'Identify rhythm, rhyme, and figurative language in poetry' },
      { name: 'research and reference',         solStandard: '3.10', description: 'Use reference materials to gather information and cite sources' },
    ],
  },
  4: {
    math: [
      { name: 'place value and rounding',       solStandard: '4.1',  description: 'Place value and rounding of whole numbers through millions; compare and order' },
      { name: 'fractions and mixed numbers',    solStandard: '4.2',  description: 'Compare and order fractions and mixed numbers; represent equivalent fractions' },
      { name: 'decimals',                       solStandard: '4.3',  description: 'Read, write, represent, and identify decimals through thousandths' },
      { name: 'multiplication and division',    solStandard: '4.4',  description: 'Multiply two-digit by two-digit numbers; estimate products; divide by one-digit divisors' },
      { name: 'fractions computation',          solStandard: '4.5',  description: 'Add and subtract fractions and mixed numbers with like denominators' },
      { name: 'measurement',                    solStandard: '4.7',  description: 'Measure and convert US customary and metric units; elapsed time; perimeter and area' },
      { name: 'geometry',                       solStandard: '4.10', description: 'Points, lines, angles, parallel/perpendicular lines; classify quadrilaterals and triangles' },
      { name: 'data and probability',           solStandard: '4.13', description: 'Collect, display, and interpret data; predict likelihood of outcomes; represent probability as fraction' },
      { name: 'patterns and algebra',           solStandard: '4.15', description: 'Identify and extend patterns; write and solve one-step equations' },
    ],
    reading: [
      { name: 'word study and roots',           solStandard: '4.2',  description: 'Use context and word analysis to decode multi-syllabic words; Latin and Greek roots' },
      { name: 'vocabulary',                     solStandard: '4.4',  description: 'Determine meaning of unfamiliar words; multiple-meaning words; figurative language' },
      { name: 'fiction comprehension',          solStandard: '4.5',  description: 'Comprehend fiction: plot structure, conflict, character motivation, theme, point of view' },
      { name: 'nonfiction comprehension',       solStandard: '4.6',  description: "Comprehend nonfiction: main idea, fact vs. opinion, text structure, author's purpose" },
      { name: 'poetry',                         solStandard: '4.7',  description: 'Identify sensory language, metaphor, simile, and personification in poetry' },
      { name: 'research and reference',         solStandard: '4.10', description: 'Use print and digital resources to locate, evaluate, and cite information' },
    ],
  },
  5: {
    math: [
      { name: 'decimals and place value',       solStandard: '5.1',  description: 'Read, write, identify place value of decimals through thousandths; round decimals' },
      { name: 'fractions and decimals',         solStandard: '5.2',  description: 'Represent and identify equivalences among fractions, mixed numbers, and decimals' },
      { name: 'prime and composite numbers',    solStandard: '5.3',  description: 'Identify and describe prime and composite numbers; identify even and odd' },
      { name: 'fractions computation',          solStandard: '5.4',  description: 'Add, subtract, and multiply fractions and mixed numbers; solve single- and multi-step problems' },
      { name: 'decimal computation',            solStandard: '5.6',  description: 'Add, subtract, multiply, and divide decimals; solve single- and multi-step problems' },
      { name: 'order of operations',            solStandard: '5.7',  description: 'Evaluate expressions using order of operations: parentheses, exponents, ×, ÷, +, −' },
      { name: 'measurement and geometry',       solStandard: '5.8',  description: 'Perimeter, area, volume; classify angles, triangles, quadrilaterals; diameter, radius, circumference' },
      { name: 'data and probability',           solStandard: '5.14', description: 'Predict probability; represent as fractions/decimals/percents; mean, median, mode, range' },
      { name: 'patterns and algebra',           solStandard: '5.17', description: 'Write variable expressions for patterns; perfect squares and square roots; solve for missing variable' },
    ],
    reading: [
      { name: 'word study and roots',           solStandard: '5.2',  description: 'Greek/Latin roots, affixes; determine word meaning from context and word analysis' },
      { name: 'vocabulary and figurative language', solStandard: '5.4', description: 'Connotation, denotation, figurative language, and idioms' },
      { name: 'fiction comprehension',          solStandard: '5.5',  description: 'Analyze fiction: theme, character development, conflict, narrator perspective, literary devices' },
      { name: 'nonfiction comprehension',       solStandard: '5.6',  description: "Analyze nonfiction: author's purpose, argument, evidence, text structure, bias" },
      { name: 'poetry',                         solStandard: '5.7',  description: 'Analyze figurative language, mood, tone, and structure in poetry' },
      { name: 'research and reference',         solStandard: '5.10', description: 'Collect, evaluate, synthesize, and cite information from print and digital resources' },
    ],
  },
  6: {
    math: [
      { name: 'integers and absolute value',    solStandard: '6.3',  description: 'Identify, represent, order, and compare integers; find absolute value; locate on a number line' },
      { name: 'fractions, decimals, percents',  solStandard: '6.1',  description: 'Represent and convert between fractions, decimals, and percents; compare and order rational numbers' },
      { name: 'integer operations',             solStandard: '6.4',  description: 'Add, subtract, multiply, and divide integers; solve practical problems involving integers' },
      { name: 'proportional reasoning',         solStandard: '6.2',  description: 'Represent proportional relationships; unit rates, ratios, equivalent ratios; solve proportion problems' },
      { name: 'expressions and properties',     solStandard: '6.13', description: 'Write and evaluate algebraic expressions; apply commutative, associative, and distributive properties' },
      { name: 'one-step equations',             solStandard: '6.14', description: 'Solve one-step linear equations in one variable using inverse operations' },
      { name: 'area and perimeter',             solStandard: '6.7',  description: 'Solve problems involving area of triangles, quadrilaterals, and composite figures; circumference of a circle' },
      { name: 'statistics and data',            solStandard: '6.10', description: 'Describe mean, median, mode, and range; interpret and compare data sets using statistical measures' },
      { name: 'probability',                    solStandard: '6.11', description: 'Determine the probability of an event; represent probability as a fraction, decimal, or percent' },
    ],
    reading: [
      { name: 'vocabulary and word analysis',   solStandard: '6.4',  description: 'Use context clues, roots, affixes, and reference materials to determine meaning of unfamiliar words' },
      { name: 'fiction comprehension',          solStandard: '6.5',  description: 'Analyze fiction: theme, characterization, conflict, figurative language, narrator point of view' },
      { name: 'nonfiction comprehension',       solStandard: '6.6',  description: "Analyze nonfiction: author's purpose, argument and evidence, text structure, fact vs. opinion" },
      { name: 'poetry and drama',               solStandard: '6.7',  description: 'Analyze poetic elements: rhyme, meter, imagery, figurative language, tone, and mood' },
      { name: 'media literacy',                 solStandard: '6.8',  description: 'Evaluate the purpose, audience, and credibility of print and digital media sources' },
      { name: 'research and synthesis',         solStandard: '6.9',  description: 'Locate, evaluate, and synthesize information from multiple sources; cite sources using a standard format' },
    ],
  },
  7: {
    math: [
      { name: 'rational numbers',               solStandard: '7.1',  description: 'Compare, order, and represent rational numbers (fractions, decimals, percents, integers) on a number line' },
      { name: 'percent applications',           solStandard: '7.2',  description: 'Solve practical problems involving percents: discounts, taxes, simple interest, and percent change' },
      { name: 'proportional reasoning',         solStandard: '7.3',  description: 'Identify and represent proportional relationships; solve problems using rates, ratios, and unit rates' },
      { name: 'algebraic expressions',          solStandard: '7.10', description: 'Simplify algebraic expressions using properties; combine like terms; apply the distributive property' },
      { name: 'two-step equations and inequalities', solStandard: '7.11', description: 'Write and solve two-step equations and inequalities; represent solutions on a number line' },
      { name: 'geometry — circles and 3D',      solStandard: '7.4',  description: 'Determine circumference and area of circles; surface area and volume of rectangular prisms and cylinders' },
      { name: 'transformations',                solStandard: '7.7',  description: 'Identify and graph translations, reflections, and rotations on a coordinate plane' },
      { name: 'data analysis',                  solStandard: '7.9',  description: 'Analyze data sets: box-and-whisker plots, histograms, mean absolute deviation; identify outliers' },
      { name: 'probability',                    solStandard: '7.8',  description: 'Determine simple and compound probability; use tree diagrams and organized lists; experimental vs. theoretical' },
    ],
    reading: [
      { name: 'vocabulary and figurative language', solStandard: '7.4', description: 'Analyze connotations, nuances, and figurative language; understand technical vocabulary in context' },
      { name: 'fiction comprehension',          solStandard: '7.5',  description: 'Analyze fiction: complex themes, character motivation, irony, symbolism, narrative techniques' },
      { name: 'nonfiction and argument',        solStandard: '7.6',  description: "Evaluate argument structure: claim, evidence, reasoning, and counterclaim; assess author's credibility" },
      { name: 'poetry and drama',               solStandard: '7.7',  description: 'Analyze structural elements of poetry and drama; evaluate how form contributes to meaning' },
      { name: 'informational text',             solStandard: '7.8',  description: 'Synthesize information from multiple informational texts; compare differing perspectives on a topic' },
      { name: 'research and citations',         solStandard: '7.9',  description: 'Conduct research; evaluate source credibility; synthesize and cite information from varied sources' },
    ],
  },
  8: {
    math: [
      { name: 'real numbers and irrational numbers', solStandard: '8.1', description: 'Identify real numbers; classify irrational numbers; estimate square roots; compare and order real numbers' },
      { name: 'exponents and scientific notation',   solStandard: '8.2', description: 'Evaluate expressions with integer exponents; convert between standard form and scientific notation' },
      { name: 'linear equations',               solStandard: '8.14', description: 'Solve multi-step linear equations in one variable including equations with fractions and variables on both sides' },
      { name: 'slope and linear functions',     solStandard: '8.15', description: 'Identify slope as rate of change; graph linear equations; write equations in slope-intercept form y = mx + b' },
      { name: 'systems of equations',           solStandard: '8.16', description: 'Solve systems of two linear equations by substitution and graphing; interpret the solution in context' },
      { name: 'Pythagorean theorem',            solStandard: '8.9',  description: 'Apply the Pythagorean theorem to find missing side lengths of right triangles and distances on a coordinate plane' },
      { name: 'geometry — angle relationships', solStandard: '8.5',  description: 'Identify and use angle relationships: vertical, supplementary, complementary, corresponding, and alternate' },
      { name: 'geometry — transformations',     solStandard: '8.7',  description: 'Apply dilations, translations, reflections, and rotations; identify congruent and similar figures' },
      { name: 'statistics and scatter plots',   solStandard: '8.12', description: 'Construct and analyze scatter plots; identify positive, negative, or no correlation; draw and use a line of best fit' },
    ],
    reading: [
      { name: 'vocabulary and etymology',       solStandard: '8.4',  description: 'Use etymology, roots, and affixes to determine word meaning; analyze technical and domain-specific vocabulary' },
      { name: 'fiction comprehension',          solStandard: '8.5',  description: 'Analyze complex fiction: unreliable narrators, ambiguity, allegory, extended metaphor, author craft' },
      { name: 'nonfiction and rhetoric',        solStandard: '8.6',  description: 'Analyze rhetorical strategies, appeals (ethos/pathos/logos), argument structure, and logical fallacies' },
      { name: 'poetry and drama',               solStandard: '8.7',  description: 'Analyze how poetic and dramatic structure, voice, and form contribute to meaning and effect' },
      { name: 'informational and media texts',  solStandard: '8.8',  description: 'Evaluate multiple perspectives in informational and media texts; identify bias and assess credibility' },
      { name: 'research and synthesis',         solStandard: '8.9',  description: 'Design and carry out research; synthesize complex information from varied sources; cite accurately' },
    ],
  },
}

/** All supported grade levels, derived from the curriculum — single source of truth. */
export const SUPPORTED_GRADES = Object.keys(SOL_CURRICULUM).map(Number).sort((a, b) => a - b)

export function getTopicsForGradeSubject(grade: number, subject: 'math' | 'reading'): SolTopic[] {
  return SOL_CURRICULUM[grade]?.[subject] ?? []
}
