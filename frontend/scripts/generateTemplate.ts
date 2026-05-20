import * as XLSX from 'xlsx'
import path from 'path'

const headers = ['Section', 'Type', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct', 'Marks', 'Expected Answer']

const exampleRows = [
  ['Product Knowledge', 'MCQ', 'What is 2+2?', '3', '4', '5', '6', 'B', 1, ''],
  ['Sales Skills', 'Subjective', 'Describe your sales approach in 2-3 sentences.', '', '', '', '', '', 2, 'Should mention identifying customer needs, presenting value, and closing technique'],
]

const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows])
ws['!cols'] = headers.map((_h, i) => ({ wch: i === 2 || i === 9 ? 40 : 15 }))

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Questions')
XLSX.writeFile(wb, path.join(process.cwd(), 'public', 'exam-template.xlsx'))
console.log('Template generated at public/exam-template.xlsx')
