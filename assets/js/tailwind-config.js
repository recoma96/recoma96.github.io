const px0_10 = { ...Array.from(Array(11)).map((_, i) => `${i}px`) };
const px0_100 = { ...Array.from(Array(101)).map((_, i) => `${i}px`) };
const px0_200 = { ...Array.from(Array(201)).map((_, i) => `${i}px`) };


tailwind.config = {
    darkMode: 'selector',
    theme: {
        extend: {
            colors: colors,
            padding: {
                desktopX: '32em',
                desktopY: '4em',
                
                mobileX: '3em',
                mobileY: '4em',
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
                'footer-light': '#fde04780 0px -20px 50px -12px;'
            },
            minWidth: {
                default: '600px'
            },
            maxWidth: {
                default: '800px'
            }
        },
    }
}