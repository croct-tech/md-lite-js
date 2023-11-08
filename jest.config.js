module.exports = {
    transform: {
        '^.+\\.ts$': '@swc/jest',
    },
    restoreMocks: true,
    resetMocks: true,
};
