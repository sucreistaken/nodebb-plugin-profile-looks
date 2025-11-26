'use strict';

const plugin = {};

// --- 1. SİNYALİ KARŞILAMA (SOCKET) ---
plugin.init = async function (params) {
    const socketPlugins = require.main.require('./src/socket.io/plugins');
    const db = require.main.require('./src/database');

    // Socket dinleyicisi oluşturuyoruz
    socketPlugins.profileLooks = {};
    
    // İstemciden gelen 'recordView' sinyalini burada yakalıyoruz
    socketPlugins.profileLooks.recordView = async function (socket, data) {
        try {
            // socket.uid -> Sinyali gönderen kişi (Bakan)
            // data.targetUid -> Hedef profil (Bakılan)
            
            const viewerUid = socket.uid;
            const targetUid = data.targetUid;

            // Kontroller: Giriş yapmış mı? Kendine mi bakıyor?
            if (!viewerUid || viewerUid <= 0) return;
            if (!targetUid || parseInt(viewerUid) === parseInt(targetUid)) return;

            // LOG: Terminalde görebilmen için
            console.log(`>>> [SOCKET] Kayıt: ${viewerUid} -> ${targetUid} profiline baktı.`);

            // Veritabanına Yaz
            const key = `user:${targetUid}:profile_views`;
            await db.sortedSetAdd(key, Date.now(), viewerUid);

        } catch (err) {
            console.error(err);
        }
    };
};

// --- 2. WIDGET TANIMLAMA ---
plugin.defineWidgets = async function(widgets) {
    widgets.push({
        widget: "profile-viewers",
        name: "Profilime Bakanlar (Socket)",
        description: "Profil ziyaretçilerini listeler.",
        content: ""
    });
    return widgets;
};

// --- 3. WIDGET GÖRÜNTÜLEME ---
plugin.renderWidget = async function(widget) {
    try {
        const db = require.main.require('./src/database');
        const user = require.main.require('./src/user');

        let targetUid = widget.templateData ? widget.templateData.uid : widget.uid;
        if (!targetUid || parseInt(targetUid) === 0) return null;

        const key = `user:${targetUid}:profile_views`;
        const uids = await db.getSortedSetRevRange(key, 0, 4);

        // Başlık
        const title = widget.data.title || "Profilime Bakanlar";
        let htmlContent = '';

        if (!uids || !uids.length) {
            htmlContent = '<div style="padding:10px; color:#666;">Henüz görüntülenme yok.</div>';
        } else {
            const viewers = await user.getUsersFields(uids, ['uid', 'username', 'userslug', 'picture']);
            
            htmlContent = '<ul class="list-unstyled" style="padding: 10px;">';
            viewers.forEach(v => {
                let avatar = v.picture 
                    ? `<img src="${v.picture}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; vertical-align: middle;">`
                    : `<div style="width: 32px; height: 32px; background-color: #ddd; border-radius: 50%; display: inline-block; margin-right: 10px; vertical-align: middle; text-align: center; line-height: 32px; font-weight: bold; color: #555;">${v.username.charAt(0).toUpperCase()}</div>`;

                htmlContent += `
                    <li style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                        <a href="/user/${v.userslug}" style="text-decoration: none; color: inherit; display: flex; align-items: center;">
                            ${avatar}
                            <span style="font-weight: 600;">${v.username}</span>
                        </a>
                    </li>`;
            });
            htmlContent += '</ul>';
        }

        widget.html = `
            <div class="card panel panel-default">
                <div class="panel-heading"><h3 class="panel-title"><i class="fa fa-eye"></i> ${title}</h3></div>
                <div class="panel-body" style="padding:0;">${htmlContent}</div>
            </div>`;

    } catch (err) {
        console.error(err);
    }
    return widget;
};

module.exports = plugin;