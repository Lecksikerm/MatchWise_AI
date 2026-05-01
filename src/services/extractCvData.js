const knownSkills = [
    'javascript',
    'typescript',
    'node.js',
    'express',
    'mongodb',
    'postgresql',
    'mysql',
    'react',
    'next.js',
    'tailwind',
    'docker',
    'kubernetes',
    'aws',
    'git',
    'github',
    'redis',
    'socket.io',
    'jwt',
    'rest api',
    'graphql',
    'python',
    'java',
    'c++',
    'html',
    'css',
    'aws lambda',
    'azure',
    'google cloud',
    'data science',
    'machine learning',
    'scrum',
    'agile',
];

const extractCvData = (text) => {
    const lowerText = String(text || '').toLowerCase();

    const skills = [...new Set(
        knownSkills.filter((skill) => lowerText.includes(skill.toLowerCase()))
    )];

    return {
        skills,
        education: [],
        experience: [],
        certifications: [],
        tools: skills,
    };
};

module.exports = extractCvData;