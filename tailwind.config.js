/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
        display: ['Barlow Condensed', 'Oswald', 'sans-serif'],
        brand: ['Palatino Linotype', 'Book Antiqua', 'Georgia', 'serif'],
      },
      colors: {
        asanda: {
          ink: '#123047',
          deep: '#087f84',
          navy: '#1646b8',
          blue: '#245fd1',
          cyan: '#0aafb5',
          aqua: '#18c7a1',
          lime: '#73c947',
          orange: '#c9582d',
          'orange-strong': '#bd4f27',
          mist: '#e1f4ee',
          'blue-soft': '#e8edff',
          'blue-pale': '#f3f6ff',
          'blue-line': '#bccaf0',
          surface: '#e8f5f1',
          foam: '#f4fbf8',
          line: '#cce5df',
        },
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
        }
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.asanda.ink'),
            '--tw-prose-headings': theme('colors.asanda.ink'),
            '--tw-prose-lead': theme('colors.asanda.deep'),
            '--tw-prose-links': theme('colors.asanda.deep'),
            '--tw-prose-bold': theme('colors.asanda.ink'),
            '--tw-prose-counters': theme('colors.asanda.deep'),
            '--tw-prose-bullets': theme('colors.asanda.line'),
            '--tw-prose-hr': theme('colors.asanda.line'),
            '--tw-prose-quotes': theme('colors.asanda.ink'),
            '--tw-prose-quote-borders': theme('colors.asanda.orange'),
            '--tw-prose-captions': theme('colors.slate.500'),
            '--tw-prose-code': theme('colors.asanda.ink'),
            '--tw-prose-pre-code': theme('colors.dark.text'),
            '--tw-prose-pre-bg': theme('colors.dark.bg'),
            '--tw-prose-th-borders': theme('colors.asanda.line'),
            '--tw-prose-td-borders': theme('colors.asanda.line'),
            maxWidth: '68ch',
            color: 'var(--tw-prose-body)',
            lineHeight: '1.75',
            fontSize: '1.0625rem',
            p: {
              marginTop: '1.75rem',
              marginBottom: '1.75rem',
              textWrap: 'pretty',
              hyphens: 'auto',
            },
            '[class*="language-"]': {
              hyphens: 'none',
            },
            h2: {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              fontSize: '2rem',
              lineHeight: '1.08',
              marginTop: '2.5rem',
              marginBottom: '1rem',
              textWrap: 'balance',
              color: 'var(--tw-prose-headings)',
            },
            h3: {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              fontSize: '1.5rem',
              lineHeight: '1.15',
              marginTop: '2rem',
              marginBottom: '0.75rem',
              textWrap: 'balance',
              color: 'var(--tw-prose-headings)',
            },
            strong: {
              fontWeight: '700',
              color: 'var(--tw-prose-bold)',
            },
            a: {
              fontWeight: '600',
              color: 'var(--tw-prose-links)',
              textDecoration: 'underline',
              textDecorationThickness: '2px',
              textUnderlineOffset: '4px',
              transition: 'color 0.15s ease',
              '&:hover': {
                color: theme('colors.asanda.orange'),
              },
            },
            blockquote: {
              marginTop: '2rem',
              marginBottom: '2rem',
              paddingLeft: '1.25rem',
              borderLeftWidth: '4px',
              borderLeftColor: 'var(--tw-prose-quote-borders)',
              fontStyle: 'italic',
              color: 'var(--tw-prose-quotes)',
            },
            ul: {
              marginTop: '1.75rem',
              marginBottom: '1.75rem',
              paddingLeft: '1.5rem',
              listStyleType: 'disc',
            },
            ol: {
              marginTop: '1.75rem',
              marginBottom: '1.75rem',
              paddingLeft: '1.5rem',
              listStyleType: 'decimal',
            },
            li: {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
              hyphens: 'auto',
            },
            'li > p': {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
            },
            img: {
              marginTop: '2rem',
              marginBottom: '2rem',
              borderRadius: '1rem',
            },
          },
        },
        lg: {
          css: {
            maxWidth: '72ch',
            fontSize: '1.125rem',
            lineHeight: '1.8',
            p: {
              marginTop: '2rem',
              marginBottom: '2rem',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

