const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const { run: queueRun } = require('./aiQueue');

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
  return queueRun(async () => {
    try {
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
    } catch (error) {
      // Handle quota and other API errors gracefully
      console.error('CV Analysis error:', error.message);

      if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn('⚠️  API quota exceeded. Returning fallback analysis.');
        return {
          summary: `CV analyzed. Skills detected: ${parsedSkills.join(', ') || 'None detected'}`,
          strengths: parsedSkills.slice(0, 3) || [],
          weaknesses: [],
          suggestions: [],
          recommendedRoles: [],
          _note: 'Summary provided without AI analysis due to API quota limits',
        };
      }

      return {
        summary: `CV analyzed. Skills detected: ${parsedSkills.join(', ') || 'None detected'}`,
        strengths: parsedSkills.slice(0, 3) || [],
        weaknesses: [],
        suggestions: [],
        recommendedRoles: [],
        _note: 'Fallback analysis used after AI error',
      };
    }
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
  return queueRun(async () => {
    try {
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
    } catch (error) {
      console.error('Job match advice error:', error.message);

      if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn('⚠️  API quota exceeded. Returning fallback match advice.');
        return {
          matchSummary: `Match score: ${score}%. Matched: ${matchedSkills.join(', ') || 'None'}. Missing: ${missingSkills.join(', ') || 'None'}`,
          strengthsForRole: matchedSkills.slice(0, 3) || [],
          missingSkillsAdvice: matchedSkills.map(s => `Consider learning ${s}`) || [],
          cvImprovementTips: [],
          applicationAdvice: 'File your application with confidence in your matched skills.',
          _note: 'Advice provided without AI analysis due to API quota limits',
        };
      }

      return {
        matchSummary: `Match score: ${score}%. Matched: ${matchedSkills.join(', ') || 'None'}. Missing: ${missingSkills.join(', ') || 'None'}`,
        strengthsForRole: matchedSkills.slice(0, 3) || [],
        missingSkillsAdvice: matchedSkills.map(s => `Consider learning ${s}`) || [],
        cvImprovementTips: [],
        applicationAdvice: 'File your application with confidence in your matched skills.',
        _note: 'Fallback advice provided after AI error',
      };
    }
  });
};

/**
 * Generate a comprehensive summary for any extracted text
 * Works for CV, resume, documents, or any text-based content
 */
const generateTextSummary = async (extractedText, documentType = 'document', additionalContext = {}) => {
  return queueRun(async () => {
    try {
      const prompt = `
Return ONLY valid JSON.

Analyze and summarize this ${documentType}:

${String(extractedText || '').slice(0, 8000)}

${additionalContext.skills ? `Key skills found: ${additionalContext.skills.join(', ')}` : ''}

Provide a comprehensive analysis with this JSON structure:
{
  "summary": "2-3 sentence executive summary of the document content",
  "keyPoints": ["important point 1", "important point 2", "important point 3"],
  "highlights": ["highlight 1", "highlight 2"],
  "topics": ["topic 1", "topic 2", "topic 3"],
  "sentiment": "positive/neutral/negative",
  "contentQuality": "high/medium/low",
  "recommendations": ["recommendation 1", "recommendation 2"]
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
        summary: 'Summary could not be generated.',
        keyPoints: [],
        highlights: [],
        topics: [],
        sentiment: 'neutral',
        contentQuality: 'medium',
        recommendations: [],
      });
    } catch (error) {
      console.error('Error generating text summary:', error.message);

      if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn('⚠️  API quota exceeded. Using fallback summary.');
        return {
          summary: `Document analyzed: ${additionalContext.skills?.length ? `Skills: ${additionalContext.skills.join(', ')}` : 'Content processed'}`,
          keyPoints: additionalContext.skills?.slice(0, 3) || [],
          highlights: additionalContext.skills?.slice(3, 5) || [],
          topics: additionalContext.skills?.slice(5) || [],
          sentiment: 'neutral',
          contentQuality: 'medium',
          recommendations: [],
          _note: 'Summary provided without AI analysis due to API quota limits',
        };
      }

      return {
        summary: 'Summary generation failed. Please try again.',
        keyPoints: [],
        highlights: [],
        topics: [],
        sentiment: 'neutral',
        contentQuality: 'medium',
        recommendations: [],
        error: error.message,
      };
    }
  });
};

module.exports = {
  generateCvAnalysis,
  generateJobMatchAdvice,
  generateTextSummary,
};