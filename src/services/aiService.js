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

const createMatchSummary = (score, matchedSkills = [], missingSkills = []) => {
  if (score === 0 && matchedSkills.length === 0 && missingSkills.length === 0) {
    return 'No recognizable technical keywords were found in the job description. Try adding more detail or specific technologies.';
  }

  return `Match score: ${score}%. Matched: ${matchedSkills.length ? matchedSkills.join(', ') : 'None'}. Missing: ${missingSkills.length ? missingSkills.join(', ') : 'None'}.`;
};

const createApplicationAdvice = (score, matchedSkills = [], missingSkills = []) => {
  if (score === 0 && matchedSkills.length === 0 && missingSkills.length === 0) {
    return 'The job description did not include recognizable skills. Add more detail or target a role that matches your experience better.';
  }

  if (score >= 80) {
    return 'Strong match. You can apply with confidence and mention the relevant skills in your application.';
  }

  if (score >= 50) {
    return 'Moderate match. Highlight your strongest related skills and consider improving the missing skills before applying.';
  }

  return 'Low match. Consider refining your CV or targeting a role that is closer to your current skill set.';
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

      const parsedAdvice = safeParse(response.text, {
        matchSummary: response.text || '',
        strengthsForRole: [],
        missingSkillsAdvice: [],
        cvImprovementTips: [],
        applicationAdvice: '',
      });

      return {
        ...parsedAdvice,
        matchSummary: parsedAdvice.matchSummary || createMatchSummary(score, matchedSkills, missingSkills),
        applicationAdvice: createApplicationAdvice(score, matchedSkills, missingSkills),
      };
    } catch (error) {
      console.error('Job match advice error:', error.message);

      if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn('⚠️  API quota exceeded. Returning fallback match advice.');
        return {
          matchSummary: createMatchSummary(score, matchedSkills, missingSkills),
          strengthsForRole: matchedSkills.slice(0, 3) || [],
          missingSkillsAdvice: matchedSkills.map(s => `Consider learning ${s}`) || [],
          cvImprovementTips: [],
          applicationAdvice: createApplicationAdvice(score, matchedSkills, missingSkills),
          _note: 'Advice provided without AI analysis due to API quota limits',
        };
      }

      return {
        matchSummary: createMatchSummary(score, matchedSkills, missingSkills),
        strengthsForRole: matchedSkills.slice(0, 3) || [],
        missingSkillsAdvice: matchedSkills.map(s => `Consider learning ${s}`) || [],
        cvImprovementTips: [],
        applicationAdvice: createApplicationAdvice(score, matchedSkills, missingSkills),
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