/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    '../**/*.{html, js}',
  ],
  darkMode: 'selector',
  theme: {
      extend: {
        colors: {
          light: {
            'text-default': '#27272a',
            primary: { /* tailwind colorset - rose */
                50: '#fdf2f8',
                100: '#fce7f3',
                200: '#fbcfe8',
                300: '#f9a8d4',
                400: '#f472b6',
                500: '#ec4899',
                600: '#db2777',
                700: '#be185d',
                800: '#9d174d',
                900: '#831843',
            },
          },
          dark: {
            'text-default': '#e4e4e7',
              primary: { /* tailwind colorset - orange */
                  default: '#fde047',
                  50: '#fefce8',
                  100: '#fef9c3',
                  200: '#fef08a',
                  300: '#fde047',
                  400: '#facc15',
                  500: '#eab308',
                  600: '#ca8a04',
                  700: '#a16200',
                  800: '#854d0e',
                  900: '#7e2e0e',
              },
          }
        },
        padding: {
            desktopX: '32em',
            desktopY: '6em',
            
            mobileX: '3em',
            mobileY: '6em',
        },
        fontFamily: {
            default: ['Orbit'],
            code: ['Nanum Gothic Coding'],
            footer: ['Nanum Myeongjo']
        },
        boxShadow: {
            'layout': 'rgba(0, 0, 0, 0.15) 10px 0 15px 0px;',
            'navbar-light': '#d946ef80 0px 13px 27px -5px, #701a7590 0px 8px 16px -8px;',
            'navbar-dark': '#fde04780 0px 13px 27px -5px, #fefce890 0px 8px 16px -8px;',
            'paper-styled': 'rgba(0, 0, 0, 0.15) 2.4px 2.4px 3.2px;',
            'hr-light': '0 0 10px 1px #fb7185',
            'hr-dark': '0 0 10px 1px #fde047',
            'footer-light': '#fde04780 0px -20px 50px -12px;',
        },
        minWidth: {
            default: '600px'
        },
        maxWidth: {
            default: '800px'
        },
        zIndex: {
            navbar: '50',
            footer: '20',
            'left-side': '30',
            'main-container': '0',
        }
      },
  },
  safelist: [
    'tag-random-red',
    'tag-random-orange',
    'tag-random-amber',
    'tag-random-lime',
    'tag-random-teal',
    'tag-random-cyan',
    'tag-random-violet',
    'tag-random-fuchsia',
    
    'form-random-red',
    'form-random-orange',
    'form-random-amber',
    'form-random-lime',
    'form-random-teal',
    'form-random-cyan',
    'form-random-violet',
    'form-random-fuchsia',
  ],
  plugins: [],
}