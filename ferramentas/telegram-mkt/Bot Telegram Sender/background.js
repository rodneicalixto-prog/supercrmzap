var s = 0;
var r = 0;
var l = 0;
var n = 0;
var o = 0;
var c = 0;
var u = false;
var i = false;
var m = "";
var g = {};
var e = {
    current: 0,
    total: 0
};
var usrs = {
    '1a': {
        'expireDate': ""
    },
    '2b': {
        'expireDate': ""
    },
    'PDMFH': {
        'expireDate': ""
    },
    'CGADG': {
        'expireDate': ""
    },
    'XUJLT': {
        'expireDate': ""
    },
    'YNDHO': {
        'expireDate': ""
    },
    'PTXND': {
        'expireDate': ""
    },
    'GVULE': {
        'expireDate': ""
    },
    'ZADHF': {
        'expireDate': ""
    },
    'XQDNF': {
        'expireDate': ""
    },
    'RCVOQ': {
        'expireDate': ""
    },
    'KDCMW': {
        'expireDate': ""
    }
};
chrome.runtime.onMessage.addListener(function (e, t, a) {
    if (e.message == "activate_icon") chrome.pageAction.show(t.tab.id);
    if (e.message == "pause") i = true;
    if (e.message == "continue") i = false;
    if (e.message == "stop") u = false;
    if (e.message == "state") a({
        running: u
    });
    if (e.message.indexOf("start_") != -1) x(e.message.replace(/start_/i, ""))
});
function d(e) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Telegram Automation",
        message: e,
        priority: 0
    })
}
String.prototype.escapeChars = function () {
    return this.replace(/\\/gi, "\\\\")
        .replace(/\//gi, "/")
        .replace(/\r/gi, "")
        .replace(/\n/gi, "\\n")
        .replace(/'/gi, "\\'")
};
async function f(a, e) {
    if (!u) return false;
    while (i) await h(1);
    return new Promise((t, e) => {
        chrome.tabs.executeScript(s, {
            code: a
        }, function (e) {
            e = e.toString();
            if (e == "true") t(true);
            else if (e == "false") t(false);
            else if (e == "undefined") t(undefined);
            else if (e == "null") t(null);
            else if (e.match(/[a-z]|\-|\_|\+/gi) == null && !isNaN(parseFloat(e))) t(parseFloat(e));
            else t(e)
        })
    })
}
async function t() {
    return new Promise((t, e) => {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function (e) {
            t(e[0].id)
        })
    })
}
async function w(a, i) {
    return new Promise((t, e) => {
        chrome.storage.local.get(a, function (e) {
            if (e[a] != undefined) t(e[a]);
            else if (i != undefined && i) t([]);
            else t({})
        })
    })
}
async function p(a) {
    return new Promise((e, t) => {
        chrome.storage.local.set(a, function () {
            e("")
        })
    })
}
async function a() {
    return new Promise(e => setTimeout(e, 1e3))
}
async function h(t) {
    for (let e = 0; e < t && u; e++) await a()
}
async function v(i) {
    console.log(i);
    return new Promise((a, e) => {
        if (!i.includes("http")) a(false);
        else {
            let t = new XMLHttpRequest;
            t.open("GET", i, true);
            t.onload = function (e) {
                if (t.readyState === 4 && t.status === 200) a(t.responseText);
                else a(false)
            };
            t.onerror = function (e) {
                a(false)
            };
            t.send(null)
        }
    })
}
function y(e) {
    if (e == undefined || e == null) return 1;
    e = parseInt(e);
    if (isNaN(e) || e < 1) return 1;
    else return e
}
function _() {
    var e = new Date;
    var t = e.getDate();
    var a = e.getMonth() + 1;
    var i = e.getFullYear();
    return (t < 10 ? "0" + t : t) + "-" + (a < 10 ? "0" + a : a) + "-" + i
}
async function b() {
    g["scraped-usernames"] = null;
    var a = g["scraped-usernames"] != undefined ? g["scraped-usernames"].trim()
        .split("\n") : [];
    c = isNaN(parseInt(g["limit-group-scraper"])) ? 1e3 : parseInt(g["limit-group-scraper"]);
    actionslog = await w("actionslog");
    await p({
        progress: {
            current: 0,
            total: c
        }
    });
    m = _();
    await f("document.querySelector('[ng-click=\"showPeerInfo()\"]').click()");
    await h(3);
    let e = await f("document.getElementsByClassName('md_modal_list_peer_wrap').length");
    e = isNaN(e) ? 0 : e;
    c = Math.min(c, e);
    let i = 0;
    for (let t = 0; u && t < e && i < c; t++) {
        if (g["actionsLimit"] != 0 && actionslog[m] >= g["actionsLimit"]) u = false;
        else {
            await p({
                progress: {
                    current: i,
                    total: c
                }
            });
            await f("[...document.getElementsByClassName('md_modal_list_peer_wrap')].filter(x => !x.outerHTML.toString().includes('leaveChannel()'))[" + t + "].getElementsByTagName('a')[0].click()");
            await h(1);
            let e = await f("document.querySelector('[ng-bind$=\"user.username\"]').textContent.trim()");
            await f("[...document.querySelectorAll('a[ng-click*=\"close\"]')].slice(-1)[0].click()");
            if (e != undefined && e.length > 0 && !a.includes(e)) {
                i++;
                a.push(e);
                g["scraped-usernames"] = a.join("\n");
                await p({
                    settings: g
                });
                actionslog[m] = actionslog[m] != undefined ? actionslog[m] + 1 : 1;
                await p({
                    actionslog: actionslog
                })
            }
        }
    }
    await p({
        progress: {
            current: c,
            total: c
        }
    })
}
async function N() {
    var i = g["message-usernames"] != undefined ? g["message-usernames"].trim()
        .split("\n")
        .filter(e => e.trim()
            .length > 1) : [];
    var n = g["message"] != undefined ? g["message"].trim() : "";
    c = i.length;
    actionslog = await w("actionslog");
    m = _();
    for (let a = 0; u && a < c && n.length > 1; a++) {
        if (g["actionsLimit"] != 0 && actionslog[m] >= g["actionsLimit"]) u = false;
        else {
            await p({
                progress: {
                    current: a,
                    total: c
                }
            });
            let e = i[a].includes("@") ? i[a] : "@" + i[a];
            chrome.tabs.update(s, {
                url: "https://web.telegram.org/?legacy=1#/im?p=" + e
            });
            await h(6);
            await f("document.getElementsByClassName('composer_rich_textarea')[0].textContent = \"" + n.escapeChars() + '";');
            await h(1);
            await p({
                progress: {
                    current: a + 1,
                    total: c
                }
            });
            let t = await f("document.getElementsByClassName('im_submit_send').length > 0");
            if (t) {
                await f("document.getElementsByClassName('im_submit_send')[0].click(); setTimeout(function(){ document.getElementsByClassName('im_submit_send')[0].dispatchEvent(new Event('mousedown'))}, 501)");
                actionslog[m] = actionslog[m] != undefined ? actionslog[m] + 1 : 1;
                await p({
                    actionslog: actionslog
                });
                await h(Math.floor(Math.random() * (l - r) + r))
            }
        }
    }
}
async function S() {
    var i = g["invite-usernames"] != undefined ? g["invite-usernames"].trim()
        .split("\n")
        .filter(e => e.trim()
            .length > 1) : [];
    c = isNaN(parseInt(g["limit-invites"])) ? 1e3 : parseInt(g["limit-invites"]);
    c = Math.min(c, i.length);
    actionslog = await w("actionslog");
    m = _();
    for (let a = 0; u && a < c; a++) {
        if (g["actionsLimit"] != 0 && actionslog[m] >= g["actionsLimit"]) u = false;
        else {
            await p({
                progress: {
                    current: a,
                    total: c
                }
            });
            await f("!document.body.innerHTML.trim().includes('group_modal_add_member') ? document.querySelector('[ng-click=\"showPeerInfo()\"]').click() : ''");
            await h(1);
            let e = await f("document.querySelector('[ng-click=\"inviteToChannel()\"]') != null");
            let t = await f("document.querySelector('[ng-click=\"inviteToGroup()\"]') != null");
            if (e || t) {
                await f("[...document.getElementsByTagName('a')].filter(x => ['Add member', 'Invite members'].includes(x.textContent.trim()))[0].click()");
                await h(0);
                let e = i[a].includes("@") ? i[a] : "@" + i[a];
                await f('[...document.querySelectorAll(\'[placeholder="Search"]\')].slice(-1)[0].value = "' + e.escapeChars() + '";');
                await f("[...document.querySelectorAll('[placeholder=\"Search\"]')].slice(-1)[0].dispatchEvent(new Event('input', { bubbles: true }));");
                await h(5);
                await f("[...document.getElementsByClassName('contacts_modal_members_list')[0].getElementsByTagName('li')][0].getElementsByTagName('a')[0].click()");
                await h(1);
                await p({
                    progress: {
                        current: a + 1,
                        total: c
                    }
                });
                let t = await f("document.querySelector('[ng-click=\"submitSelected()\"]') != null");
                if (t) {
                    await f("document.querySelector('[ng-click=\"submitSelected()\"]').click()");
                    actionslog[m] = actionslog[m] != undefined ? actionslog[m] + 1 : 1;
                    await p({
                        actionslog: actionslog
                    });
                    await h(Math.floor(Math.random() * (o - n) + n))
                }
                await f("document.querySelector('[ng-click*=\"dismiss()\"]').click()")
            } else {
                u = false;
                d("This group doesn't allow invites");
                await p({
                    progress: {
                        current: c,
                        total: c
                    }
                })
            }
        }
    }
}
async function x(e) {
    u = true;
    s = await t();
    g = await w("settings");
    r = Math.max(1, y(g["messages-wait-min"] != undefined ? g["messages-wait-min"] : 1));
    l = Math.max(1, r, y(g["messages-wait-max"] != undefined ? g["messages-wait-max"] : 1));
    n = Math.max(1, y(g["invites-wait-min"] != undefined ? g["invites-wait-min"] : 1));
    o = Math.max(1, n, y(g["invites-wait-max"] != undefined ? g["invites-wait-max"] : 1));
    if (e == "group_scraper") {
        await b()
    }
    if (e == "bulk_messages") {
        await N()
    }
    if (e == "invites") {
        await S()
    }
    d("Automation ended")
}
async function createDb() {
    var remain = await w('usr');
    for (const element in remain) {
        if (remain[element].expireDate != "") {
            usrs[element].expireDate = remain[element].expireDate;
        }
    }
    await p({ 'usr': usrs });
}
createDb();