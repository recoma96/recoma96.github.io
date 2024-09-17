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
    const tagThemes = [
        'tag-random-red',
        'tag-random-orange',
        'tag-random-amber',
        'tag-random-lime',
        'tag-random-teal',
        'tag-random-cyan',
        'tag-random-violet',
        'tag-random-fuchsia'
    ]


    const size = tagThemes.length;

    $('.tag').each(function() {
        const idx = Math.floor(Math.random() * size);
        $(this).addClass(tagThemes[idx]);
    });
}