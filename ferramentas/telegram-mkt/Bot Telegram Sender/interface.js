async function o(n, s) {
    return new Promise((t, e) => {
        chrome.storage.local.get(n, function (e) {
            if (e[n] != undefined) t(e[n]);
            else if (s != undefined && s) t([]);
            else t({})
        })
    })
}
async function a(n) {
    return new Promise((e, t) => {
        chrome.storage.local.set(n, function () {
            e("")
        })
    })
}
function e() {
    let e = new Date;
    let t = e.getDate();
    let n = e.getMonth() + 1;
    let s = e.getFullYear();
    let a = e.getHours();
    let l = e.getMinutes();
    let o = e.getSeconds();
    return (n < 10 ? "0" + n : n) + "." + (t < 10 ? "0" + t : t) + "." + s + "-" + (a < 10 ? "0" + a : a) + ":" + (l < 10 ? "0" + l : l) + ":" + (o < 10 ? "0" + o : o)
}
function i() {
    var e = new Date;
    var t = e.getDate();
    var n = e.getMonth() + 1;
    var s = e.getFullYear();
    return (t < 10 ? "0" + t : t) + "-" + (n < 10 ? "0" + n : n) + "-" + s
}
var n = async function () {
    let e = await o("settings");
    let t = await o("progress");
    let n = await o("actionslog");
    let s = i();
    let a = document.getElementById("myBar");
    let l = Math.round(t.current / t.total * 100);
    a.style.width = l + "%";
    document.getElementById("progressStats")
        .textContent = " " + t.current + "/" + t.total;
    if (n[s] != undefined && n[s] >= e["actionsLimit"] && e["actionsLimit"] > 0) {
        a.style.width = "100%";
        document.getElementById("progressStats")
            .textContent = "Daily actions limit reached"
    } else if (t.current != undefined && t.current == t.total) {
        document.getElementById("stop")
            .style.display = "none";
        document.getElementById("return")
            .style.display = "block";
        document.getElementById("progressStats")
            .textContent = "Complete"
    } else {
        document.getElementById("stop")
            .style.display = "block";
        document.getElementById("return")
            .style.display = "none"
    }
};
var t = async function () {
    var e = document.getElementsByClassName("category-type");
    for (var t = 0; t < e.length; t++) e[t].addEventListener("click", s, false);
    chrome.runtime.sendMessage({
        message: "state"
    }, function (e) {
        if (e.running == "true" || e.running === true) {
            n();
            document.querySelector('li[tab="progress-tab"]')
                .click();
            setInterval(n, 500)
        } else { }
    })
};
var s = async function () {
    var e = document.getElementsByClassName("category-type");
    await a({
        stage: "none"
    });
    for (var t = 0; t < e.length; t++)
        if (e[t] == this) {
            e[t].classList.add("selected");
            var n = e[t].getAttribute("tab");
            document.getElementById(n)
                .style.display = "block";
            if (n == "progress-tab") {
                document.getElementsByClassName("left-rail-facets")[0].style.display = "none"
            } else {
                document.getElementsByClassName("left-rail-facets")[0].style.display = "block";
                m()
            }
        } else {
            e[t].classList.remove("selected");
            document.getElementById(e[t].getAttribute("tab"))
                .style.display = "none"
        }
    y()
};
var l = async function () {
    window.close()
};
function d(e, t) {
    var n = document.createElement("a");
    n.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(t));
    n.setAttribute("download", e);
    n.click()
}
var c = async function () {
    var e = this;
    var t = await o("settings");
    t[e.id] = e.type == "checkbox" ? e.checked : e.value;
    await a({
        settings: t
    })
};
var m = async function () {
    var e = await o("settings");
    var t = document.getElementsByClassName("automation-settings");
    for (var n = 0; n < t.length; n++) {
        if (e[t[n].id] != undefined) {
            if (t[n].type != null && t[n].type == "checkbox") document.getElementById(t[n].id)
                .checked = e[t[n].id];
            else document.getElementById(t[n].id)
                .value = e[t[n].id]
        }
        t[n].addEventListener("input", c)
    }
};
var y = async function () {
    var n = await o("settings");
    var e = await o("subscriptionstatus");
    if (e == "active") {
        var s = 0
    } else {
        var s = 500
    }
    n["actionsLimit"] = s;
    await a({
        settings: n
    });
    if (s == 0) {
        document.getElementsByClassName("freeversion")[0].style.display = "none";
        document.getElementsByClassName("freeversion")[1].style.display = "none";
        document.getElementsByClassName("startfalse")[0].style.display = "none";
        document.getElementsByClassName("startfalse")[1].style.display = "none";
        document.getElementsByClassName("starttrue")[0].style.display = "block";
        document.getElementsByClassName("starttrue")[1].style.display = "block";
        u()
    } else {
        document.getElementsByClassName("freeversion")[0].style.display = "block";
        document.getElementsByClassName("freeversion")[1].style.display = "block";
        let e = await o("actionslog");
        let t = i();
        document.getElementsByClassName("dailyactions")[0].textContent = (e[t] != undefined ? e[t] : "0") + "/" + s;
        document.getElementsByClassName("dailyactions")[1].textContent = (e[t] != undefined ? e[t] : "0") + "/" + s;
        if (e[t] != undefined && e[t] >= n["actionsLimit"]) {
            document.getElementsByClassName("startfalse")[0].style.display = "block";
            document.getElementsByClassName("startfalse")[1].style.display = "block";
            document.getElementsByClassName("starttrue")[0].style.display = "none";
            document.getElementsByClassName("starttrue")[1].style.display = "none";
            document.getElementsByClassName("startfalse")[0].getElementsByTagName("p")[0].textContent = "Daily actions limit reached - upgrade for unlimited";
            document.getElementsByClassName("startfalse")[1].getElementsByTagName("p")[0].textContent = "Daily actions limit reached - upgrade for unlimited";
        } else {
            u()
        }
    }
};
var u = function () {
    try {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function (e) {
            chrome.tabs.executeScript(e[0].id, {
                code: "document.querySelector('[ng-click=\"showPeerInfo()\"]') != null"
            }, function (e) {
                if (e != null && e[0]) {
                    document.getElementsByClassName("starttrue")[0].style.display = "block";
                    document.getElementsByClassName("startfalse")[0].style.display = "none";
                } else {
                    document.getElementsByClassName("starttrue")[0].style.display = "none";
                    document.getElementsByClassName("startfalse")[0].style.display = "block";
                    document.getElementsByClassName("startfalse")[0].getElementsByTagName("p")[0].textContent = "Navigate to a Telegram group to begin using this feature";
                }
            })
        })
    } catch (e) { }
};
var r = function () {
    chrome.runtime.sendMessage({
        message: "pause"
    });
    window.close()
};
var g = function () {
    chrome.runtime.sendMessage({
        message: "continue"
    });
    window.close()
};
async function p(e, t) {
    const n = {
        method: "GET",
        "async": true,
        headers: {
            "Content-Type": "application/json"
        },
        contentType: "json"
    };
    const s = await fetch("https://a.com/telegramextension/subscriptionverify.php?email=" + e + "&sessioncode=" + t, n);
    const a = await s.json();
    return a.status
}
async function E() {
    email = await o("email");
    sessionCode = await o("sessioncode");
    subscriptionStatus = await o("subscriptionstatus");
    if (subscriptionStatus == "active") {
        document.getElementsByClassName("freeversion")[0].style.display = "none";
        document.getElementsByClassName("freeversion")[1].style.display = "none";
        document.getElementsByClassName("view-subscription-button")[0].style.display = "block";
        document.getElementsByClassName("view-subscription-button")[1].style.display = "block";

        document.getElementById("current-email")
            .textContent = email;
        document.getElementById("current-status")
            .textContent = subscriptionStatus;

        document.getElementById("upgrade-options")
            .style.display = "none";
        document.getElementById("active-options")
            .style.display = "block";
        document.getElementsByClassName("freeversion")[0].style.display = "none";
        document.getElementsByClassName("freeversion")[1].style.display = "none";
        document.getElementsByClassName("view-subscription-button")[0].style.display = "block";
        document.getElementsByClassName("view-subscription-button")[1].style.display = "block";

    } else {
        document.getElementsByClassName("freeversion")[0].style.display = "block";
        document.getElementsByClassName("freeversion")[1].style.display = "block";
        document.getElementsByClassName("view-subscription-button")[0].style.display = "none";
        document.getElementsByClassName("view-subscription-button")[1].style.display = "none";

        document.getElementById("current-email")
            .textContent = "not set";
        document.getElementById("current-status")
            .textContent = "inactive";
        document.getElementById("upgrade-options")
            .style.display = "block";
        document.getElementById("active-options")
            .style.display = "none";
    }
}
async function b(e) {
    const t = {
        method: "GET",
        "async": true,
        headers: {
            "Content-Type": "application/json"
        },
        contentType: "json"
    };
    const n = await fetch("https://a.com/telegramextension/sendmanagesubemail.php?email=" + e, t);
    const s = await n.json();
    return s.status
}
async function B(e, t) {
    const n = {
        method: "GET",
        "async": true,
        headers: {
            "Content-Type": "application/json"
        },
        contentType: "json"
    };
    const s = await fetch("https://a.com/telegramextension/portaldirect.php?email=" + e + "&sessioncode=" + t, n);
    console.log("https://a.com/telegramextension/portaldirect.php?email=" + e + "&sessioncode=" + t);
    if (s["ok"] == false) {
        var a = [];
        a["status"] = "error"
    } else {
        var a = await s.json()
    }
    console.log(a);
    return a
}
async function f(e) {
    const t = {
        method: "GET",
        "async": true,
        headers: {
            "Content-Type": "application/json"
        },
        contentType: "json"
    };
    const n = await fetch("https://a.com/telegramextension/sendlogincode.php?email=" + e, t);
    const s = await n.json();
    return s.status
}
async function v(e, t) {
    const n = {
        method: "GET",
        "async": true,
        headers: {
            "Content-Type": "application/json"
        },
        contentType: "json"
    };
    const s = await fetch("https://a.com/telegramextension/logincodeverify.php?email=" + e + "&logincode=" + t, n);
    const a = await s.json();
    return a
}
async function C() {
    stage = await o("stage");
    if (stage == "receiving-code") {
        document.getElementById("upgrade-tab")
            .style.display = "none";
        document.getElementById("group-scraper-tab")
            .style.display = "none";
        document.getElementById("messages-tab")
            .style.display = "none";
    } else {
        document.getElementById("group-scraper-tab")
            .style.display = "block";
    }
}
async function I(e, t) {
    const n = {
        method: "GET",
        "async": true,
        headers: {
            "Content-Type": "application/json"
        },
        contentType: "json"
    };
    const s = await fetch("https://a.com/telegramextension/endsession.php?email=" + e + "&sessioncode=" + t, n);
    const a = await s.json();
    return a.status
}
async function getSubscriptionStatus(email) {
    var usr = await o('usr');
    if (email in usr) {
        return "active";
    }
    return "inactive";
}

async function sendManageSubEmail(email) {
    var usr = await o('usr');
    if (email in usr) {
        var comp = usr[email].expireDate;
        var _remain = parseInt(comp) - signUpTime();
        if (_remain > 0) {
            var minutes = Math.floor((_remain / (1000 * 60)) % 60),
                hours = Math.floor((_remain / (1000 * 60 * 60)) % 24),
                days = Math.floor(_remain / (1000 * 60 * 60 * 24));

            hours = (hours < 10) ? "0" + hours : hours;
            minutes = (minutes < 10) ? "0" + minutes : minutes;

            return days + ' days ' + hours + ' hours ' + minutes + ' minutes';
        }
    }
    return 0;
}

function signUpTime() {
    let d = new Date();
    return d.getTime();
}

var firstRegister = async function (accName) {
    var status = await o('usr');
    if (status[accName].expireDate == "") {
        status[accName].expireDate = signUpTime() + (1000 * 3600 * 24 * 30);
        await a({ 'usr': status });
    }
}

async function testExpired1(key) {
    var status = await o('usr');
    if (key in status) {
        var comp = status[key].expireDate;
        if ((parseInt(comp) - signUpTime()) / (1000 * 3600 * 24) > 0) {
            return false;
        }
    }
    return true;
}

document.addEventListener("DOMContentLoaded", async function () {
    m();
    E();
    y();
    C();
    t();
    setTimeout(function () { }, 200);
    document.getElementById("start-group-scraper")
        .addEventListener("click", async function () {
            var status = await o('usr');
            var stt = await o('settings');
            if (email in status) {
                var testExpired = await testExpired1(email);
                if (testExpired) {
                    alert('Your account might expire. Purchase to get a new one');
                }
                else {
                    chrome.runtime.sendMessage({
                        message: "start_group_scraper"
                    });
                    t();
                    document.getElementById("scraped-usernames")
                        .value = null
                }
            }
            if (!(email in status) && parseInt(stt['actionsLimit']) != 0) {
                chrome.runtime.sendMessage({ message: "start_group_scraper" });
                t();
            }
        });
    document.getElementById("bulk-messages")
        .addEventListener("click", async function () {
            var status = await o('usr');
            var stt = await o('settings');
            if (email in status) {
                var testExpired = await testExpired1(email);
                if (testExpired) {
                    alert('Your account might expire. Purchase to get a new one');
                }
                else {
                    chrome.runtime.sendMessage({
                        message: "start_bulk_messages"
                    });
                    t()
                }
            }     
            if (!(email in status) && parseInt(stt['actionsLimit']) != 0) {
                chrome.runtime.sendMessage({ message: "start_bulk_messages" });
                t();
            }       
        });
    document.getElementById("stop")
        .addEventListener("click", function () {
            chrome.runtime.sendMessage({
                message: "stop"
            });
            y();
            document.querySelector('li[tab="group-scraper-tab"]')
                .click()
        });
    document.getElementById("return")
        .addEventListener("click", function () {
            chrome.runtime.sendMessage({
                message: "stop"
            });
            y();
            document.querySelector('li[tab="group-scraper-tab"]')
                .click()
        });
    document.getElementsByClassName("upgrade")[0].addEventListener("click", function () {
        document.getElementById("upgrade-tab")
            .style.display = "block";
        document.getElementById("group-scraper-tab")
            .style.display = "none";
        document.getElementById("messages-tab")
            .style.display = "none";
    });
    document.getElementsByClassName("upgrade")[1].addEventListener("click", function () {
        document.getElementById("upgrade-tab")
            .style.display = "block";
        document.getElementById("group-scraper-tab")
            .style.display = "none";
        document.getElementById("messages-tab")
            .style.display = "none";
    });
    document.getElementById("upgrade-button")
        .addEventListener("click", function () {
            document.getElementById("group-scraper-tab")
                .style.display = "block";
            document.getElementById("messages-tab")
                .style.display = "none";
            document.getElementById("upgrade-tab")
                .style.display = "none";
            y();
            E()
        });
    document.getElementById("scraped-usernames")
        .addEventListener("click", function () {
            document.getElementById("scraped-usernames")
                .select();
            document.execCommand("copy")
        });
    document.getElementById("copy-usernames")
        .addEventListener("click", function () {
            document.getElementById("scraped-usernames")
                .select();
            document.execCommand("copy")
        });
    document.getElementsByClassName("view-subscription-button")[0].addEventListener("click", function () {
        document.getElementById("group-scraper-tab")
            .style.display = "none";
        document.getElementById("messages-tab")
            .style.display = "none";
        document.getElementById("upgrade-tab")
            .style.display = "block"
    });
    document.getElementsByClassName("view-subscription-button")[1].addEventListener("click", function () {
        document.getElementById("group-scraper-tab")
            .style.display = "none";
        document.getElementById("messages-tab")
            .style.display = "none";
        document.getElementById("upgrade-tab")
            .style.display = "block"
    });
    document.getElementById("purchase-upgrade-button")
        .addEventListener("click", function () {
            chrome.tabs.create({
                url: 'https://telegramextension.com/product/telegram-sender/'
            })
        });
    document.getElementsByClassName("go-to-tg")[0].addEventListener("click", function () {
        chrome.tabs.create({
            url: "https://web.telegram.org/?legacy=1#/im"
        })
    });
    document.getElementsByClassName("go-to-tg-alert")[0].addEventListener("click", function () {
        chrome.tabs.create({
            url: "https://web.telegram.org"
        })
    });
    document.getElementById("login-button")
        .addEventListener("click", async function () {
            email = document.getElementById("email")
                .value;
            loginCodeStatus = await getSubscriptionStatus(email);
            if (loginCodeStatus == "active") {
                await a({
                    stage: "receiving-code"
                });
                await a({
                    "login-email": email
                });
                await a({
                    stage: "none"
                });
                await a({
                    email: email
                });
                await a({
                    sessioncode: sessionCode
                });
                await a({
                    subscriptionstatus: "active"
                });
                await firstRegister(email);

                document.getElementsByClassName("freeversion")[0].style.display = "none";
                document.getElementsByClassName("freeversion")[1].style.display = "none";
                document.getElementsByClassName("view-subscription-button")[0].style.display = "block";
                document.getElementsByClassName("view-subscription-button")[1].style.display = "block";

                document.getElementById("current-email")
                    .textContent = email;
                document.getElementById("current-status")
                    .textContent = loginCodeStatus;

                document.getElementById("upgrade-options")
                    .style.display = "none";
                document.getElementById("active-options")
                    .style.display = "block";
                document.getElementsByClassName("freeversion")[0].style.display = "none";
                document.getElementsByClassName("freeversion")[1].style.display = "none";
                document.getElementsByClassName("view-subscription-button")[0].style.display = "block";
                document.getElementsByClassName("view-subscription-button")[1].style.display = "block";

                document.getElementById("upgrade-tab")
                    .style.display = "block";
                document.getElementById("activated-success")
                    .style.display = "block";
                document.getElementById("activated-error")
                    .style.display = "none";
                document.getElementById("login-start-error")
                    .style.display = "none"
                document.getElementById("login-start-error")
                    .style.display = "none"

            } else {
                document.getElementById("login-start-error")
                    .style.display = "block"
                document.getElementById("logout-success")
                    .style.display = "none";
            }
        });
    document.getElementById("logout-button")
        .addEventListener("click", async function () {
            await a({
                email: null
            });
            await a({
                sessioncode: null
            });
            await a({
                subscriptionstatus: "inactive"
            });
            document.getElementById("upgrade-options")
                .style.display = "block";
            document.getElementById("active-options")
                .style.display = "none";
            document.getElementById("current-email")
                .textContent = "not set";
            document.getElementById("current-status")
                .textContent = "inactive";
            document.getElementById("logout-success")
                .style.display = "block";
            document.getElementsByClassName("freeversion")[0].style.display = "block";
            document.getElementsByClassName("freeversion")[1].style.display = "block";
            document.getElementsByClassName("view-subscription-button")[0].style.display = "none";
            document.getElementsByClassName("view-subscription-button")[1].style.display = "none";
            y()
        });
    document.getElementById("manage-subscription-button")
        .addEventListener("click", async function () {
            email = await o("login-email");
            if (email.length > 0) {
                subscriptionStatus = await getSubscriptionStatus(email);
                if (subscriptionStatus == "active") {
                    sendEmail = await sendManageSubEmail(email);
                    if (sendEmail != 0) {
                        document.getElementById('manage-subscription-success').style.display = 'block';
                        document.getElementById('manage-subscription-success').innerHTML = 'Time remain: ' + sendEmail;
                        document.getElementById('manage-subscription-error').style.display = 'none';
                    } else {
                        document.getElementById('manage-subscription-success').style.display = 'none';
                        document.getElementById('manage-subscription-error').style.display = 'block';
                        document.getElementById('manage-subscription-error').innerHTML = 'Expired !';
                    }
                }
            }
        })
});