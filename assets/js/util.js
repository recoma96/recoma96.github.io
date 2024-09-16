const MODE = {
    LIGHT: 'light',
    DARK: 'dark'
}

const KEY_THEME = 'theme'

const getTheme = () => {
    return localStorage.getItem(KEY_THEME) || MODE.LIGHT;
}

const setTheme = (theme) => {
    const currentTheme = $('html').attr('class');
    if(currentTheme) {
        $('html').removeClass(currentTheme);
    }
    $('html').addClass(theme);
    localStorage.setItem(KEY_THEME, theme);
}

const randomizeAllTags = () => {
    const lightThemes = ['red', 'orange', 'amber', 'lime', 'teal', 'cyan', 'violet', 'fuchsia'];

    const size = lightThemes.length;

    $('.tag').each(function() {
        const idx = Math.floor(Math.random() * size);
        $(this).addClass(`bg-${lightThemes[idx]}-100 hover:bg-${lightThemes[idx]}-200`);
        $(this).addClass('dark:bg-transparent dark:border dark:border-yellow-200 dark:hover:border-yellow-50 dark:rounded-md')
    });
}