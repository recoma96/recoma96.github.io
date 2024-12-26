$(() => {
    const _data = window.location.href.split('#');

    if (_data.length == 2) {
        const id = decodeURIComponent(_data[1]);

        const targetPosition = $('#' + id).offset().top;

        $('html, body').animate({
            scrollTop: targetPosition - 100
        }, 400);
        
        const hilightColor = getTheme() === MODE.DARK ? '#713f12' : '#fecdd3'
        $('#' + id).css('background', hilightColor);

        setTimeout(() => {
            $('#' + id).css('transition', 'background-color 1s');
            $('#' + id).css('background', 'inherit');
        }, 1000);
    }
})