import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        AbortController: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        Path2D: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        location: 'readonly',
        history: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        Image: 'readonly',
        indexedDB: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        structuredClone: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        PointerEvent: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        KeyboardEvent: 'readonly',
        EventTarget: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        Notification: 'readonly',
        caches: 'readonly',
        DOMException: 'readonly',
        BarcodeDetector: 'readonly',
        createImageBitmap: 'readonly',
        setImmediate: 'readonly',
        ReadableStream: 'readonly',
        matchMedia: 'readonly',
        // Vite compile-time defines
        __APP_VERSION__: 'readonly',
      }
    },
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-throw-literal': 'error',
      'no-useless-assignment': 'warn',
      'no-useless-escape': 'warn',
      'no-irregular-whitespace': 'warn',
    }
  },
  {
    ignores: ['dist/', 'node_modules/', 'public/']
  }
]
