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
];

const extractCvData = (text) => {
    const lowerText = text.toLowerCase();

    const skills = knownSkills.filter((skill) => lowerText.includes(skill));

    return {
        skills,
        education: [],
        experience: [],
        certifications: [],
        tools: skills,
    };
};

module.exports = extractCvData;