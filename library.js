'use strict';

const plugin = {};

// Zaman formatlayıcı (X dakika önce)
function timeAgo(timestamp) {
    if (!timestamp) return "";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " yıl";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " ay";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " gün";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " sa";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " dk";
    return "Şimdi";
}

// --- 1. SOCKET DİNLEYİCİSİ (Kayıt İşlemi) ---
plugin.init = async function (params) {
    const socketPlugins = require.main.require('./src/socket.io/plugins');
    const db = require.main.require('./src/database');

    // Socket alanını oluştur
    if (!socketPlugins.profileLooks) {
        socketPlugins.profileLooks = {};
    }

    // İstemciden gelen sinyali dinle (main.js'teki isimle aynı olmalı)
    // Önceki kodlarımda 'record' demiştik, senin logda 'recordView' gördüm.
    // Her ihtimale karşı ikisini de tanımlıyorum, hangisi gelirse çalışsın.
    const recordFunction = async function (socket, data) {
        const viewerUid = socket.uid; 
        const targetUid = data.targetUid;

        if (!viewerUid || viewerUid <= 0) return;
        if (!targetUid) return;
        if (parseInt(viewerUid) === parseInt(targetUid)) return;

        // 1. ZAMAN GÜNCELLE (Ziyaret Listesi)
        await db.sortedSetAdd(`user:${targetUid}:profile_views`, Date.now(), viewerUid);
        
        // 2. SAYAÇ ARTIR (Kaç kere baktı?)
        await db.sortedSetIncrBy(`user:${targetUid}:profile_view_counts`, 1, viewerUid);
    };

    socketPlugins.profileLooks.record = recordFunction;
    socketPlugins.profileLooks.recordView = recordFunction; // Yedek
};

// --- 2. WIDGET TANIMLAMA ---
plugin.defineWidgets = async function(widgets) {
    widgets.push({
        widget: "profile-viewers",
        name: "Profilime Bakanlar (v7 Final)",
        description: "Ziyaretçileri sayaçla gösterir.",
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

        // 1. Son bakanların ID'lerini ve Zamanlarını çek
        const viewsData = await db.getSortedSetRevRangeWithScores(`user:${targetUid}:profile_views`, 0, 4);

        const title = widget.data.title || "Profilime Bakanlar";
        let htmlContent = '';

        if (!viewsData || !viewsData.length) {
            htmlContent = '<div style="padding:10px; color:#999;">Henüz kimse bakmadı.</div>';
        } else {
            const uids = viewsData.map(item => item.value);
            
            // 2. Kullanıcı bilgilerini çek
            const viewers = await user.getUsersFields(uids, ['uid', 'username', 'userslug', 'picture']);

            // 3. SAYAÇLARI ÇEK (GÜNCELLENEN KISIM)
            // db.getSortedSetScores yerine db.sortedSetScore kullanıyoruz.
            // Promise.all ile hepsini aynı anda istiyoruz.
            const countPromises = uids.map(uid => db.sortedSetScore(`user:${targetUid}:profile_view_counts`, uid));
            const counts = await Promise.all(countPromises);

            htmlContent = '<ul class="list-unstyled" style="padding: 5px 10px;">';
            
            viewers.forEach((v, index) => {
                const timestamp = viewsData[index].score; 
                const timeString = timeAgo(timestamp);
                
                // Sayacı al (null gelirse 1 yap)
                const count = counts[index] ? parseInt(counts[index], 10) : 1;

                let avatar = v.picture 
                    ? `<img src="${v.picture}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; object-fit: cover;">`
                    : `<div style="width: 32px; height: 32px; background-color: #eee; border-radius: 50%; display: inline-block; margin-right: 10px; text-align: center; line-height: 32px; font-weight: bold; color: #555;">${v.username.charAt(0).toUpperCase()}</div>`;

                htmlContent += `
                    <li style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center;">
                            <a href="/user/${v.userslug}" style="text-decoration: none;">${avatar}</a>
                            <div style="display: flex; flex-direction: column;">
                                <a href="/user/${v.userslug}" style="font-weight: 600; color: inherit; text-decoration: none;">${v.username}</a>
                                <span style="font-size: 11px; color: #999;">${timeString} önce</span>
                            </div>
                        </div>
                        <span style="background:#f1f1f1; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; color: #666;">${count}x</span>
                    </li>`;
            });
            htmlContent += '</ul>';
        }

        widget.html = `
            <div class="card panel panel-default">
                <div class="panel-heading"><h3 class="panel-title">${title}</h3></div>
                <div class="panel-body" style="padding:0;">${htmlContent}</div>
            </div>`;

    } catch (err) {
        console.error(err);
        widget.html = '<div class="alert alert-danger">Hata oluştu.</div>';
    }
    return widget;
};

module.exports = plugin;