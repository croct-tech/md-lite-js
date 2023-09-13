module.exports = {
    transform: {
        '^.+\\.ts$': '@swc/jest',
    },
    setupFilesAfterEnv: ['jest-extended/all'],
    restoreMocks: true,
    resetMocks: true,
};
