'use strict';

const plugin = {};

// --- 1. WIDGET LİSTESİNE EKLEME (Dependency Yok, Kesin Çalışır) ---
plugin.defineWidgets = async function(widgets) {
    // Bu fonksiyonun içinde require kullanmadığımız için KESİN çalışacak
    console.log('>>> [DEBUG] Widget Listeye Ekleniyor...');
    
    widgets.push({
        widget: "profile-viewers",
        name: "Profilime Bakanlar (v4 Final)", // İsmi değiştirdim ki güncellendiğini anla
        description: "Profil ziyaretçilerini listeler.",
        content: "" 
    });
    return widgets;
};

// --- 2. ZİYARETİ KAYDETME ---
plugin.recordProfileView = async function (params) {
    try {
        // Modülleri BURADA çağırıyoruz (Lazy Load)
        // Böylece hata olsa bile plugin çökmez, sadece bu fonksiyon durur.
        const db = require.main.require('./src/database');
        
        const targetUid = params.userData.uid;
        const viewerUid = params.uid;

        if (viewerUid && targetUid && parseInt(viewerUid) > 0 && parseInt(viewerUid) !== parseInt(targetUid)) {
            const key = `user:${targetUid}:profile_views`;
            await db.sortedSetAdd(key, Date.now(), viewerUid);
        }
    } catch (err) {
        console.error('[Profilime Bakanlar] Kayıt Hatası:', err.message);
    }
    return params;
};

// --- 3. WIDGET GÖRÜNTÜLEME ---
plugin.renderWidget = async function(widget) {
    try {
        // Modülleri BURADA çağırıyoruz (Lazy Load)
        const db = require.main.require('./src/database');
        const user = require.main.require('./src/user');
        const app = require.main.require('./src/app');
        const nconf = require.main.require('nconf');

        // Hedef kullanıcıyı bul
        let targetUid = widget.templateData ? widget.templateData.uid : widget.uid;

        if (!targetUid || parseInt(targetUid) === 0) return null;

        // Veritabanından çek
        const key = `user:${targetUid}:profile_views`;
        const uids = await db.getSortedSetRevRange(key, 0, 4);

        // Veri yoksa
        if (!uids || !uids.length) {
            widget.html = `
                <div class="panel panel-default">
                    <div class="panel-heading"><h3 class="panel-title">${widget.data.title || "Profilime Bakanlar"}</h3></div>
                    <div class="panel-body">Henüz kimse bakmadı.</div>
                </div>`;
            return widget;
        }

        // Kullanıcı detaylarını al
        const viewers = await user.getUsersFields(uids, ['uid', 'username', 'userslug', 'picture']);

        // Render et
        widget.html = await app.renderAsync('widgets/viewers', {
            viewers: viewers,
            title: widget.data.title || "Profilime Bakanlar",
            relative_path: nconf.get('relative_path')
        });

    } catch (err) {
        console.error('[Profilime Bakanlar] Render Hatası:', err);
        widget.html = '<div class="alert alert-danger">Widget Hatası</div>';
    }

    return widget;
};

module.exports = plugin;