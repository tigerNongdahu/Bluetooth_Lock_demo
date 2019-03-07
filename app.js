//app.js

//wx91ff41cf2b309179

App({
  onLaunch: function () {
    this.globalData.sysinfo = wx.getSystemInfoSync()
  },

  onHide: function () {
    var pages = getCurrentPages()
    var page = pages[pages.length - 1];
    if (page.route.indexOf('connectBluetooth') != -1){
      wx.navigateBack({
        delta: 2
      })
    }

    if (page.route.indexOf('searchBluetooth') != -1) {
      wx.navigateBack({
        delta: 1
      })
    }
  },
  
  getModel: function () {
    return this.globalData.sysinfo["model"]
  },
  getVersion: function () {
    return this.globalData.sysinfo["version"]
  },
  getSystem: function () {
    return this.globalData.sysinfo["system"]
  },
  getPlatform: function () {
    return this.globalData.sysinfo["platform"]
  },
  getSDKVersion: function () {
    return this.globalData.sysinfo["SDKVersion"]
  },
  getWindowWidth: function () {
    return this.globalData.sysinfo["windowWidth"]
  },
  getWindowHeight: function () {
    return this.globalData.sysinfo["windowHeight"]
  },
  //比较两个版本
  versionCompare: function (ver1, ver2) { //版本比较
    var version1pre = parseFloat(ver1)
    var version2pre = parseFloat(ver2)
    var version1next = parseInt(ver1.replace(version1pre + ".", ""))
    var version2next = parseInt(ver2.replace(version2pre + ".", ""))
    if (version1pre > version2pre)
      return true
    else if (version1pre < version2pre)
      return false
    else {
      if (version1next > version2next)
        return true
      else
        return false
    }
  },
  /**
   * 根据系统版本，判断当前的蓝牙功能是否可用
   */
  getBluetoothDeviceAvailableBySysVersion: function () {
    if (this.getPlatform() == 'android' && this.versionCompare('6.5.7', this.getVersion())) {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，请更新至最新版本',
        showCancel: false
      })
      return false;
    } else if (this.getPlatform() == 'ios' && this.versionCompare('6.5.6', this.getVersion())) {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，请更新至最新版本',
        showCancel: false
      })
      return false;
    } else {
      return true;
    }
  },

  /**
 * 蓝牙错误码对应
 */
  getBluetoothErrorCode: function (code) {
    var str = '开启蓝牙失败'
    if (code == 10000) {
      str = '未开启蓝牙'
    } else if (code == 10001) {
      str = '当前蓝牙适配器不可用，请打开蓝牙'
    } else if (code == 10002) {
      str = '没有找到指定设备'
    } else if (code == 10003) {
      str = '连接失败'
    } else if (code == 10004) {
      str = '获取数据失败'
    } else if (code == 10005) {
      // str = '没有找到指定特征值'
      str = '获取数据失败'
    } else if (code == 10006) {
      str = '当前连接已断开'
    } else if (code == 10007) {
      // str = '当前特征值不支持此操作'
      str = '数据错误'
    } else if (code == 10008) {
      str = '系统错误，请在设置中关闭“蓝牙”，然后在打开'
    } else if (code == 10009) {
      str = '手机系统版本过低，请升级手机版本'
    } else if (code == 10012) {
      str = '连接超时'
    } else {
      str = '' + code
    }
    return str
  },

  /**
  * 对json进行排序，并直接转成string
  */
  jsonSort: function (jsonObj) {
    let arr = [];
    for (var key in jsonObj) {
      arr.push(key)
    }
    arr.sort();
    let str = '';
    for (var i in arr) {
      str += jsonObj[arr[i]]
    }
    return str
  },

  jsonObjSort: function (jsonObj) {
    let arr = [];
    for (var key in jsonObj) {
      arr.push(key)
    }
    arr.sort();
    let str = '';
    var obj = {}
    for (var i in arr) {
      var value = jsonObj[arr[i]]
      var key = arr[i] + "";
      obj[key] = value
    }
    return obj
  },

  /**16进制转成10进制 */
  sixthToTen: function (str) {
    if (str == 'a' || str == 'A') {
      return 10
    } else if (str == 'b' || str == 'B') {
      return 11
    } else if (str == 'c' || str == 'C') {
      return 12
    } else if (str == 'd' || str == 'D') {
      return 13
    } else if (str == 'e' || str == 'E') {
      return 14
    } else if (str == 'f' || str == 'F') {
      return 15
    } else {
      return parseInt(str)
    }
  },

  globalData: {
    userInfo: null,
    SID:'17FF',
    appId: '589fcaa80cf2c7fd2b9c43d8',
    key: 'd145osltfwbih3p8j7gg',
    passwordUrl:'https://test.guogee.com',
  }
})