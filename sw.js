// 🌟 Service Worker:負責在瀏覽器/手機背景接收推播訊息、顯示系統通知、處理點擊通知後的動作。
// 這個檔案要放在 GitHub Pages 網站的「根目錄」(跟 index.html 同一層),瀏覽器才能給它正確的作用範圍(scope)。

const SITE_URL = 'https://jay870122.github.io/DCGI/';

// 🌟 收到推播訊息時觸發:GAS/Worker那邊送過來的payload是JSON格式 {title, body, url, icon}
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '通知', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || '📢 新通知';
  const options = {
    body: data.body || '',
    icon: data.icon || `${SITE_URL}icon.png`, // 🌟 沒放圖示的話瀏覽器會用預設圖示,不會噴錯,只是比較不好看
    badge: data.icon || `${SITE_URL}icon.png`,
    data: { url: data.url || SITE_URL }, // 🌟 點擊通知要開啟的網址,預設開啟首頁
    tag: data.tag || undefined, // 🌟 選填:同一個tag的新通知會取代舊的,不會疊一堆同性質的通知
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 🌟 使用者點擊通知時觸發:嘗試找一個已經開著的分頁直接切過去,沒有的話才開新分頁
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : SITE_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(SITE_URL) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// 🌟 訂閱過期或瀏覽器自動更換訂閱時觸發(例如金鑰輪替):理論上很少發生,但沒處理的話舊訂閱會變成無效卻不會被清掉。
// 這裡重新訂閱後,把新的訂閱資訊送回GAS更新——跟index.html裡subscribeToPush()的邏輯類似。
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true })
      .then((newSubscription) => {
        // 🌟 這裡沒有存取 discordId 的管道(Service Worker背景執行,拿不到頁面上的變數),
        // 沒辦法在這裡直接呼叫GAS更新——如果之後真的遇到這個情況,可以考慮把discordId存進IndexedDB讓這裡讀取。
        console.log('[SW] 推播訂閱已自動更新(尚未同步回後端,需要使用者重新開啟網頁觸發同步)', newSubscription);
      })
  );
});
