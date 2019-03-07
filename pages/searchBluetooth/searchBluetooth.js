// pages/searchBluetooth/searchBluetooth.js
const app = getApp();
var temp = []
var currentTime = 10;
var interval = null;
Page({

  /**
   * 页面的初始数据
   */
  data: {
    searchingstatus: false,
    deviceList: [],
    searchServer: [],
    winWidth: 0,
    list_height: 0,
    deviceMac: "", //设备mac
    name: "", //设备名称
    canUse: false,
    isClick: false,
    deviceId:'',
    serviceId:"",
    RSSI:'',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    wx.setNavigationBarTitle({
      title: '搜索周边设备',
    })

    this.initData(options)
    this.gg_startConnect()
  },

  gg_startConnect: function () {
    this.gg_openBluetoothAdapter();
  },

  /**
   * 获取本机的适配
   */
  gg_getBluetoothAdapterState: function () {
    var that = this;
    wx.getBluetoothAdapterState({
      success: function (res) {
        if (res.available) {
          that.setData({
            canUse: true
          })
          //开启搜索设备功能
          that.gg_startBluetoothDevicesDiscovery();
        } else {
          wx.showModal({
            title: '提示',
            content: '蓝色设备不可用，请检查手机蓝牙是否打开',
            showCancel: false
          })
        }
        that.setData({
          searchingstatus: res.discovering
        })
      },
      fail: function (res) {
        wx.showModal({
          title: '提示',
          content: '当前设备无法使用蓝牙' + JSON.stringify(res),
          showCancel: false,
        })
        that.setData({
          searchingstatus: false
        })
      }
    })
  },

  //初始化蓝牙适配器
  gg_openBluetoothAdapter: function () {
    var that = this
    wx.openBluetoothAdapter({
      success: function (res) {
        //监听适配器的状态
        that.gg_onBluetoothAdapterStateChange();
        //获取本机适配器的状态
        that.gg_getBluetoothAdapterState();
        //监听发现到新设备
        that.gg_onBluetoothDeviceFound();
        that.setData({
          canUse: true
        })
      },
      fail: function (res) {
        wx.showModal({
          title: '提示',
          content: '请检查手机蓝牙是否打开',
          showCancel: false,
          success: function (res) {
            that.setData({
              searchingstatus: false,
              canUse: false
            })
          }
        })
      }
    })
  },

  /***
   * 监听蓝牙适配器状态
   */
  gg_onBluetoothAdapterStateChange: function () {
    var that = this;
    wx.onBluetoothAdapterStateChange(function (res) {
      if (!res.available) {
        wx.showModal({
          title: '提示',
          content: '请检查手机蓝牙是否打开',
          showCancel: false,

        })
        that.setData({
          canUse: false
        })
      } else {
        that.setData({
          canUse: true
        })
      }

      that.setData({
        searchingstatus: res.discovering
      })
    })
  },

  /**获取所有 所有连接和未连接的设备 */
  /**
   * 这个方法的作用是解决有些特殊情况下，退出当前页面的时候，不断开蓝牙连接，再次进来时先断开连接，这样才可以搜索到设备以及最新的广播数据包
   */
  gg_getBluetoothDevices: function () {
    var that = this
    wx.getBluetoothDevices({
      success: function (devices) {
        console.log(devices)
        if (that.data.ishaveDevice == false) {
          for (var i = 0; i < devices.devices.length; i++) {
            var device = devices.devices[i]
            if (device.advertisServiceUUIDs) {
              if (device.advertisServiceUUIDs.length != 0) {
                var UUID = device.advertisServiceUUIDs[0]
                var UUIDs = UUID.split('-')
                if (UUIDs.length > 0) {
                  var deviceMac = UUIDs[UUIDs.length - 1]
                  if (deviceMac.toLocaleUpperCase() == that.data.deviceMac.toLocaleUpperCase()) {
                    that.setData({
                      deviceId: device.deviceId
                    })
                    console.log("关闭蓝牙连接...")
                    that.gg_closeBLEConnection()
                    break
                  }
                }
              }
            }
          }
        }
      },
      fail: function (res) {
        console.log("gg_getBluetoothDevices fail res:" + JSON.stringify(res))
      },
    })
  },


  /**
   * 搜索设备
   */
  gg_startBluetoothDevicesDiscovery: function () {
    var that = this
    if (that.data.canUse == false) {
      wx.showModal({
        title: '提示',
        content: '请检查手机蓝牙是否打开',
        showCancel: false
      })

      return false;
    }

    that.gg_getBluetoothDevices()

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      services: that.data.searchServer,
      success: function (res) {
        that.setData({
          searchingstatus: true
        })

        currentTime = 10

        interval = setInterval(function () {
          currentTime--;
          console.log("currentTime:" + currentTime)
          if (currentTime <= 0 && that.data.searchingstatus == true) {
            clearInterval(interval)
            that.gg_stopBluetoothDevicesDiscovery()
            wx.showModal({
              title: '提示',
              content: '未搜索到设备',
              confirmText: '继续搜索',
              success: function (e) {
                if (e.confirm) {
                  that.gg_startBluetoothDevicesDiscovery()
                } 
              }
            })
          }
        }, 1000)
      },
      fail: function (res) {
        that.setData({
          searchingstatus: false
        })
        wx.showModal({
          title: '提示',
          content: '搜索设备失败，' + JSON.stringify(res),
          showCancel: false,
        })
      }
    })
  },

  /**
   * 停止搜索
   */
  gg_stopBluetoothDevicesDiscovery: function () {
    var that = this
    wx.stopBluetoothDevicesDiscovery({
      success: function (res) {
        console.log("停止蓝牙搜索")
        console.log(res)
        that.setData({
          searchingstatus: false
        })
      },
      complete: function (res) {
        console.log("interval:" + interval)
        if (interval != null) {
          clearInterval(interval)
        }
      }
    })
  },

  /**
   * 点击按钮开始或者停止搜索设备
   */
  searchbluetooth: function () {
    temp = []
    var that = this
    if (!that.data.searchingstatus) {
      that.gg_startBluetoothDevicesDiscovery()
    } else {
      that.gg_stopBluetoothDevicesDiscovery()
    }
    
  },

  //发现新设备
  gg_onBluetoothDeviceFound: function () {
    //监听发现新设备
    var that = this
    wx.onBluetoothDeviceFound(function (devices) {
      /**把广播里面的数据转成16进制字符串 */
      var data16 = that.ab2hex(devices.devices[0].advertisData)
      /*小写转成大写*/
      if(data16.length > 0){
        data16 = data16.toLocaleUpperCase()
        //前面4个字符表示厂商id
        var dId = data16.substring(0, 4);
        if (dId.indexOf(app.globalData.SID) != -1) {
          that.addDeviceToList(devices, data16)
        }
      }
    })
  },

  /**
   * 把设备添加到数组中
   */
  addDeviceToList: function (devices, data16) {
    var that = this
    var isnotExist = true
    
    if (interval != null) {
      clearInterval(interval)
      interval = null
    }

    for (var i = 0; i < temp.length; i++) {
      if (devices.devices[0].deviceId == temp[i].deviceId) {
        isnotExist = false
      }
    }
    if (isnotExist == true) {
      var deviceId = devices.devices[0].deviceId
      var name = devices.devices[0].name
      var localName = devices.devices[0].localName
      var serviceId = devices.devices[0].advertisServiceUUIDs[0]
      var deviceMac = data16.substring(4, 16).toLocaleUpperCase();
      var RSSI = devices.devices[0].RSSI

      var newItem = {
        deviceId: deviceId,
        name: name,
        localName: localName,
        serviceId: serviceId,
        deviceMac: deviceMac,
        RSSI: RSSI
      }
      temp.push(newItem)
    }

    that.setData({
      deviceList: temp
    })
  },

  /**
   * 初始化数据
   */
  initData: function (options) {
    var width = app.getWindowWidth()
    var height = app.getWindowHeight() * (750 / width);
    height = height - 360;

    this.setData({
      list_height: height,
      winWidth: width,
    })

  },

  /**
   * 点击添加按钮，进入添加设备页面进行
   */
  gotoAddDevice: function (e) {

    var that = this;
    that.gg_stopBluetoothDevicesDiscovery()

    if (that.data.isClick == true){
      return false
    }

    if (that.data.isClick == false){
      that.setData({
        isClick: true
      })
    }

    var deviceMac = e.currentTarget.dataset.mac;

    wx.navigateTo({
      url: '../connectBluetooth/connectBluetooth?deviceMac=' + deviceMac,
      complete:function(res){
        console.log(res)
        that.setData({
          isClick: false
        })
      }
    })

  },

  
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    wx.openBluetoothAdapter({
      success: function(res) {
        console.log(res)
      },
    })
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    var that = this
    if (that.data.searchingstatus == true) {
      that.gg_stopBluetoothDevicesDiscovery()
    }

    clearInterval(interval)
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    var that = this
    that.gg_stopBluetoothDevicesDiscovery()
    temp = []
    that.setData({
      deviceList: []
    })
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },
  /**
   * 二进制转成16进制
   */
  ab2hex: function (buffer) {
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  },
})