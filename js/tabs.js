/*************************************************************************
 *  用于处理 tab 切换的逻辑
 *
 * File Name :     ./js/tabs.js
 * Author  :       unasm
 * Mail :          doujm@jiedaibao.com
 * Last_Modified : 2017-07-30 16:30:08
 ************************************************************************/

(function () {
	'use strict';

    function Tabs(dbName) {
        //key 为 tab Id
        this.tabList = {};
        // key 为 hostname
        this.DbName = dbName;
        this.activeTab = -1;
        this.storage = new window.background.Store(this.DbName);
        this.model = new window.background.LogModel(this.storage);
    }

    //用户打开新的Tab, 有之前的tab 则覆盖，没有则添加
    Tabs.prototype.Add = function(tabId, tabInfo) {
        //console.log("came to Add : ", tabId, tabInfo)
        if (tabInfo === undefined) {
            return false;
        }
        if (util.isUrl(tabInfo.url)) {
            var hostname = util.parserUrl(tabInfo.url).hostname;
            if (this.tabList.hasOwnProperty(tabId)) {
                this.tabList[tabId] =  {
                    //tabId: tabId,
                    url : tabInfo.url,
                    startTime : util.getNow(),
                    windowId : tabInfo.windowId,
                    hostname : hostname,
                    index : tabInfo.index,
                        //costTime : 0
                };
            } else {
                this.tabList[tabId] =  {
                    tabId: tabId,
                    url : tabInfo.url,
                    startTime : util.getNow(),
                    windowId : tabInfo.windowId,
                    hostname : hostname,
                    index : tabInfo.index,
                        //costTime : 0
                };
            }
        } else {
            //console.log("not a url : ", tabInfo.url)
        }
    }


    /**
      用户无论打开，关闭，或者跳转新的，都应该计算之前active的 时间
      */
    Tabs.prototype.CalTime = function(tabId) {
        if (this.activeTab == -1 || !this.tabList.hasOwnProperty(this.activeTab)) {
            // activeTab 也许 是当前active 的session 并非是网络请求的tab
            return ;
        }
        if (tabId == undefined) {
            tabId = this.activeTab;
        }
        if (tabId == -1) {
            return ;
        }
        var tabInfo = this.tabList[tabId];
        if (tabInfo !== undefined) {
            var now = util.getNow();
            var costTime = now - tabInfo.startTime;
            this.model.create(tabInfo.url, costTime);
            //this.tabList[this.activeTab].costTime  += now - tabInfo.startTime;
            //清理时间，防止 多次计算
            this.tabList[tabId].startTime = now;
            console.log(tabId + " : stayed " + costTime + "s : " + tabInfo.url);
        }
        // 给这个事件, 添加时间
    }

    //用户更换 table
    Tabs.prototype.Delete = function(tabId) {
        this.CalTime(tabId);
        //因为关闭了，所以不知道下一个active 是谁，设置为-1
        this.SetActive(-1);
        if (!this.tabList.hasOwnProperty(tabId)) {
            delete this.tabList[tabId];
        }
    }


    //用户更换 table
    Tabs.prototype.MoveTo = function(activeInfo) {
        this.CalTime();
        var tabId = activeInfo.tabId;
        this.SetActive(tabId);
        if (!this.tabList.hasOwnProperty(tabId)) {
            this.GetOrSet(tabId);
        } else {
            //更新起止时间
            this.tabList[tabId].startTime = util.getNow();
        }
    }

    //寻找某个指定的index 的 tabId
    Tabs.prototype.FindIndex = function(index) {
        var tabId = -1;
        for (tabId in tabs.tabList) {
            if (this.tabList[tabId].index === index) {
                return tabId;
            }
        }
        return -1;
    }

    // 用户 更换url, 之前的tab 可能
    Tabs.prototype.Update = function(tabId, tabInfo) {

        var index = tabInfo.index;
        var lastTabId = this.FindIndex(tabInfo.index);
        if (lastTabId !== -1 && lastTabId !== this.activeTab) {
            //上一个 并不是active Tab，并且上一个存在url
            // 太过于理想，快速的打开一个，关闭一个，就可能发生这种情况，相同的index，并且上一个不是 active
            //console.log("somehting wrong", index, lastTabId, this.activeTab);
            //alert("some thing wrong");
        }

        this.CalTime();
        if (tabId !== lastTabId) {
            // id 已经变动了， 之前的再也用不到了，
            delete this.tabList[lastTabId];
        } 
        this.Add(tabId, tabInfo);
        this.SetActive(tabId);
    }

    Tabs.prototype.SetActive = function(tabId) {
        this.activeTab = tabId;
    }

    //获得tab 的信息,如果得不到，则返回为空，但是 要从google的 api中初始化
    Tabs.prototype.GetOrSet = function(tabId) {
        if (this.tabList.hasOwnProperty(tabId)) {
            return this.tabList[tabId];
        }
        //如果发生瞬间关闭多个tab的情况，会发生tab已经关闭，而因为效果问题，导致闪到了已经关闭的页面
        try {
            chrome.tabs.get(tabId, function (tabInfo) {
                //console.log("ready to add",tabId,  tabInfo);
                this.Add(tabId, tabInfo)
            }.bind(this));
        } catch(ex) {
            // tab 已经不存在的情况下，会发生这种情况
            debugger;
            console.log("exception", ex) ;
        }

        return {};
    }
    if (window.background == undefined) {
        window.background = {};
    }
    window.background.tabs = Tabs;
})(window);
