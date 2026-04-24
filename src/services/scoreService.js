const normalize = (text) => {
    return String(text || '').toLowerCase();
};

const extractRequiredSkills = (jobDescription) => {
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
        'ci/cd',
        'testing',
        'jest',
        'api integration',
    ];

    const lowerJob = normalize(jobDescription);

    return knownSkills.filter((skill) => lowerJob.includes(skill));
};

const calculateMatchScore = ({ cvSkills, jobDescription }) => {
    const requiredSkills = extractRequiredSkills(jobDescription);

    if (requiredSkills.length === 0) {
        return {
            score: 0,
            requiredSkills: [],
            matchedSkills: [],
            missingSkills: [],
            recommendations: [
                'The job description does not contain enough recognizable technical skills.',
            ],
        };
    }

    const normalizedCvSkills = cvSkills.map((skill) => normalize(skill));

    const matchedSkills = requiredSkills.filter((skill) =>
        normalizedCvSkills.includes(skill)
    );

    const missingSkills = requiredSkills.filter(
        (skill) => !normalizedCvSkills.includes(skill)
    );

    const score = Math.round((matchedSkills.length / requiredSkills.length) * 100);

    const recommendations = [];

    if (missingSkills.length > 0) {
        recommendations.push(
            `Add or improve these skills in your CV: ${missingSkills.join(', ')}.`
        );
    }

    if (score >= 80) {
        recommendations.push('Strong match. You can confidently apply for this role.');
    } else if (score >= 50) {
        recommendations.push('Moderate match. Improve missing skills before applying.');
    } else {
        recommendations.push('Low match. Consider improving your CV or targeting a closer role.');
    }

    return {
        score,
        requiredSkills,
        matchedSkills,
        missingSkills,
        recommendations,
    };
};

module.exports = {
    calculateMatchScore,
    extractRequiredSkills,
};