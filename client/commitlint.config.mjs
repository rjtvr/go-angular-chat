export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // The wire contract spans both stacks, so allow a shared scope.
    'scope-enum': [1, 'always', ['server', 'client', 'wire', 'deps']],
  },
};
