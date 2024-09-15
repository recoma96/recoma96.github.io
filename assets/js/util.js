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