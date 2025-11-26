'use strict';

// Sayfa her değiştiğinde bu çalışır (SPA uyumlu)
$(window).on('action:ajaxify.end', function (ev, data) {
    // Sadece 'account/profile' sayfasındaysak çalış
    if (ajaxify.data.template.name === 'account/profile') {
        
        // Sunucuya "Ben geldim" sinyali gönder
        // ajaxify.data.uid -> Profili gezilen kişi
        socket.emit('plugins.profileLooks.recordView', {
            targetUid: ajaxify.data.uid
        }, function (err) {
            if (err) console.error(err);
        });
    }
});