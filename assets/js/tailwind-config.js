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
                code: ["Nanum Gothic Coding"],
            },
            boxShadow: {
                'navbar': 'rgba(0, 0, 0, 0.45) 0px 25px 20px -20px;',
                'blockquote': 'rgba(0, 0, 0, 0.15) 2.4px 2.4px 3.2px;',
                'hr-light': '0 0 10px 1px #fb7185',
                'hr-dark': '0 0 10px 1px #fde047'
            },
            minWidth: {
                deafult: "600px"
            },
            maxWidth: {
                default: "800px"
            }
        },
    }
}