'use strict'

var d = {
    work: 52 * 60,
    pause: 17 * 60,
    delay: 4 * 60,
    sound: !1,
    setItAllUp: function(){
        chrome.idle.setDetectionInterval(d.delay)
        chrome.browserAction.setBadgeBackgroundColor({color: '#404040'})
        window.onload = function(){
            d.sound = new Howl({
              src: ['sounds/def1.mp3']
            });
        };
    }
}

var t = {
    terminated: !1,
    workTime: !0,
    pauseTabId: !1,
    pauseWinId: !1,
    snoozing: !1,
    timing: d.work,
    timer: !1,
    work: function(e) {
        if(t.pauseTabId)
            chrome.tabs.remove(t.pauseTabId)
        if(t.pauseWinId)
            chrome.windows.remove(t.pauseWinId, function(){
                t.pauseWinId = !1
            })
        t.timer = setTimeout(function() {
            d.sound.play();
            t.notify(2)
        }, e * 1000);
        t.workTime = !0
        t.timing = e
        t.setBadge()
    },
    snooze: function(){
        t.snoozing = !0
        t.workTime = !0
        t.setBadge()
        clearTimeout(t.timer)
    },
    notify: function(e){
        if(e == 1)
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/pause.png',
                title: 'Don\'t do this!',
                message: 'Please! Release your mouse and relax 😠'
            })
        if(e == 2)
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/pause.png',
                title: 'Don\'t do this!',
                message: 'It\'s time for a break!',
                buttons: [{title: 'Take a break!'}, {title: 'Additional 5 min.'}],
                requireInteraction: !0
            }, function(id){
                t.workTime = !1
                t.setBadge(!0)
                chrome.notifications.onButtonClicked.addListener(function(iid, btnId){
                    if(id == iid && btnId == 0)
                        t.init(!0)
                    if(id == iid && btnId == 1) 
                        t.init(!1, 300)
                })
            })
    },
    pause: function() {
        chrome.windows.getCurrent(function(e){
            if(!e){
                chrome.windows.create({'url': chrome.extension.getURL('timer.html'), focused: !0, type: 'popup'}, function(win) { 
                    t.pauseWinId = win.id
                })
            }else{
                chrome.tabs.create({ 'url': chrome.extension.getURL('timer.html') }, function(tab) { t.pauseTabId = tab.id });
            }
        })
        t.workTime = !1
        t.timing = d.pause
        t.setBadge()
    },
    setIcon: function(e = !1){
        var icon = (t.workTime ? (t.snoozing ? 'stop' : 'play') : 'pause')
        icon = e?e:icon
        console.log(icon)
        chrome.browserAction.setIcon({ path: 'images/' + icon + '.png' })
    },
    setBadge: function(e = !1) {
        t.setIcon()
        if (t.badgeTime)
            clearInterval(t.badgeTime)
        var i = 0;
        t.badgeTime = setInterval(function() {
            i++;
            if(e)
                i%2?t.setIcon('pause'):t.setIcon('pause.sm')
            if (!t.timing || t.timing < 0 || t.snoozing) {
                chrome.browserAction.setBadgeText({ text: '' })
            } else {
                t.timing--;
                var time2Show = Math.floor(t.timing / 60)
                var seccontds = (t.timing - time2Show*60)
                seccontds = seccontds<10?'0'+seccontds:seccontds
                time2Show = time2Show + ':' + seccontds
                time2Show = t.timing<0?'':time2Show
                chrome.browserAction.setBadgeText({ text: time2Show })
            }
        }, 1000);
    },
    terminate: function(){
        if (t.timer)
            clearTimeout(t.timer)
        if (t.badgeTime)
            clearInterval(t.badgeTime)
        t.workTime = false
        t.snoozing = false
        chrome.browserAction.setBadgeText({ text: '' })
        t.setIcon('stop')
        t.terminated = !0
    },
    init: function(e = !1, c = !1) {
        if (t.timer)
            clearTimeout(t.timer)

        t.workTime = !e
        t.terminated = t.snoozing = false
        !c?c = d.work:c
        t.workTime ? t.work(c) : t.pause()
    }
}

d.setItAllUp()
sGet((e)=>{
    !e?t.init():t.terminate()
    sSet()
})



chrome.runtime.onMessage.addListener(function(e){
    if(e.c==1)
        t.init()
    if(e.c==2)
        t.init(!0)
    if(e.c==3)
        t.terminate()
    sSet()
})
chrome.idle.onStateChanged.addListener(function(e){
    if(e != 'active'){
        if(!t.workTime)
            t.snooze()
    }else if(t.workTime){
        t.init()
    }else{
        t.notify(1)
    }
})
chrome.tabs.onRemoved.addListener((id) => {
    if (t.pauseTabId == id)
        t.init()
})
chrome.windows.onRemoved.addListener((id) => {
    if (t.pauseWinId == id){
        t.init()
        t.pauseWinId = !1
    }
})
function sGet(callback){
    chrome.storage.local.get('data', function(items){
        callback(items.data)
    })
}
function sSet(){
    chrome.storage.local.set({data: t.terminated})
}