module.exports = {
    testEnvironment: 'jsdom',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['lcov', 'text', 'html'],
    testMatch: ['**/*.test.js'],
    collectCoverageFrom: [
        '!**/*.test.js',
        '!**/node_modules/**',
        '!**/vendor/**',
    ]
};