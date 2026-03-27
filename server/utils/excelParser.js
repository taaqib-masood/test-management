const xlsx = require('xlsx');

const parseExcelRequest = (buffer) => {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Map Excel columns to question fields
    // Expected columns: question, type, options, rect_answ, difficulty, category
    const questions = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;

        // Support multiple possible column names (case-insensitive)
        const questionText = row['question'] || row['Question'] || row['QUESTION'] || '';
        const typeRaw = row['type'] || row['Type'] || row['TYPE'] || '';
        const optionsRaw = row['options'] || row['Options'] || row['OPTIONS'] || '';
        const correctAnswer = row['rect_answ'] || row['Rect_answ'] || row['correct_answer'] || row['Correct Answer'] || row['correctAnswer'] || '';
        const difficulty = row['difficulty'] || row['Difficulty'] || row['DIFFICULTY'] || 'medium';
        const category = row['category'] || row['Category'] || row['CATEGORY'] || 'General';

        if (!questionText || !correctAnswer) continue;

        // Parse options — may be comma-separated, pipe-separated, or space-separated
        let options = [];
        const optStr = String(optionsRaw).trim();
        if (optStr.includes('|')) {
            options = optStr.split('|').map(o => o.trim()).filter(o => o);
        } else if (optStr.includes(',')) {
            options = optStr.split(',').map(o => o.trim()).filter(o => o);
        } else {
            // Single option or space-separated (for short options like docker commands)
            options = optStr.split(/\s+/).map(o => o.trim()).filter(o => o);
        }

        // Determine type
        let type = 'MCQ';
        const typeLower = String(typeRaw).toLowerCase().trim();
        if (typeLower === 'true/false' || typeLower === 'true_false' || typeLower === 'tf') {
            type = 'True/False';
        } else if (typeLower === 'mcq' || typeLower === 'multiple_choice' || typeLower === 'multiple choice' || typeLower === 'multiple') {
            type = 'MCQ';
        }

        // Normalize difficulty
        let diff = String(difficulty).toLowerCase().trim();
        if (!['easy', 'medium', 'hard'].includes(diff)) {
            diff = 'medium';
        }

        questions.push({
            text: String(questionText).trim(),
            type,
            options,
            correctAnswer: String(correctAnswer).trim(),
            difficulty: diff,
            category: String(category).trim() || 'General'
        });
    }

    return questions;
};

module.exports = { parseExcelRequest };
