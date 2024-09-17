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

const randomizeAllThemes = (themes, className) => {
    const size = themes.length;
    $(`.${className}`).each(function() {
        const idx = Math.floor(Math.random() * size);
        $(this).addClass(themes[idx]);
    });
}

const randomizeAllTags = () => {
    const themes = [
        'tag-random-red',
        'tag-random-orange',
        'tag-random-amber',
        'tag-random-lime',
        'tag-random-teal',
        'tag-random-cyan',
        'tag-random-violet',
        'tag-random-fuchsia'
    ]

    randomizeAllThemes(themes, 'tag');
}

const randomizeAllPostCards = () => {
    const themes = [
        'form-random-red',
        'form-random-orange',
        'form-random-amber',
        'form-random-lime',
        'form-random-teal',
        'form-random-cyan',
        'form-random-violet',
        'form-random-fuchsia'
    ]

    randomizeAllThemes(themes, 'post-card');
}