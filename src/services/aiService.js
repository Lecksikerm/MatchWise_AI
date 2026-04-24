const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const cleanJson = (text) => {
  return String(text || '')
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
};

const safeParse = (text, fallback) => {
  try {
    return JSON.parse(cleanJson(text));
  } catch {
    return fallback;
  }
};

const generateCvAnalysis = async (cvText, parsedSkills = []) => {
  const prompt = `
Return ONLY valid JSON.

Analyze this CV:

${String(cvText || '').slice(0, 6000)}

Extracted skills:
${parsedSkills.join(', ')}

Use this JSON structure:
{
  "summary": "short professional summary",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "recommendedRoles": ["role 1", "role 2"]
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  });

  return safeParse(response.text, {
    summary: response.text || '',
    strengths: [],
    weaknesses: [],
    suggestions: [],
    recommendedRoles: [],
  });
};

const generateJobMatchAdvice = async ({
  cvText,
  jobTitle,
  jobDescription,
  score,
  matchedSkills = [],
  missingSkills = [],
}) => {
  const prompt = `
Return ONLY valid JSON.

The user wants to apply for this job.

Job title:
${jobTitle}

Job description:
${jobDescription}

CV:
${String(cvText || '').slice(0, 6000)}

Match score:
${score}%

Matched skills:
${matchedSkills.join(', ')}

Missing skills:
${missingSkills.join(', ')}

Use this JSON structure:
{
  "matchSummary": "summary of how well the CV fits the job",
  "strengthsForRole": ["strength 1", "strength 2"],
  "missingSkillsAdvice": ["advice 1", "advice 2"],
  "cvImprovementTips": ["tip 1", "tip 2"],
  "applicationAdvice": "final application advice"
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  });

  return safeParse(response.text, {
    matchSummary: response.text || '',
    strengthsForRole: [],
    missingSkillsAdvice: [],
    cvImprovementTips: [],
    applicationAdvice: '',
  });
};

module.exports = {
  generateCvAnalysis,
  generateJobMatchAdvice,
};