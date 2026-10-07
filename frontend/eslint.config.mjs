import tseslint from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.next/**',
      '.wrangler/**',
      'node_modules/**',
      'src/routeTree.gen.ts',
      'worker-configuration.d.ts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      // Existing engine/transport adapters intentionally support heterogeneous game payloads.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }
)
