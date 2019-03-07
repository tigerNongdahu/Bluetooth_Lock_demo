// pages/scan/scan.js
const app = getApp();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isClick:false
  },

  /**扫一扫 */
  showScan: function(){

    var that = this
    if (!app.getBluetoothDeviceAvailableBySysVersion()) {
      return false
    }

    //防止多少点击
    if (that.data.isClick == true) {
      return false
    }

    if (that.data.isClick == false) {
      that.setData({
        isClick: true
      })
    }

    //如果没有打开蓝牙，则没有必要进行扫码
    wx.openBluetoothAdapter({
      success: function(res) {
        that.showQRCodeScan()
      },fail:function(res){
        wx.showModal({
          title: '提示',
          content: '请打开手机蓝牙',
          showCancel:false
        })
      },complete: function(res){
        that.setData({
          isClick: false
        })
      }
    })
  },

  /**开启扫描 */
  showQRCodeScan:function(){
    var that = this
    wx.scanCode({
      success: function (res) {
        if (res.result.indexOf('NB_') != -1 && res.result.length == 15) {
          var items = res.result.split("_");
          if (items.length == 2 && items[0] == 'NB') {
            var mac = items[1].toLocaleUpperCase()
            wx.navigateTo({
              url: '../connectBluetooth/connectBluetooth?deviceMac=' + mac,
            })
          } else {
            wx.showModal({
              title: '提示',
              content: '无效二维码，请扫描正确格式的二维码',
              showCancel: false
            })
          }
        } else {
          wx.showModal({
            title: '提示',
            content: '无效二维码，请扫描正确格式的二维码',
            showCancel: false
          })
        }
      },
      complete: function (res) {
        that.setData({
          isClick: false
        })
      },
    })
  },

  searchBluetooth: function(){
    var that = this

    if (!app.getBluetoothDeviceAvailableBySysVersion()) {
      return false
    }

    //防止多少点击
    if (that.data.isClick == true) {
      return false
    }

    if (that.data.isClick == false) {
      that.setData({
        isClick: true
      })
    }

    wx.openBluetoothAdapter({
      success: function (res) {
        wx.navigateTo({
          url: '../searchBluetooth/searchBluetooth?',
          complete: function (res) {
            console.log(res)
            that.setData({
              isClick: false
            })
          }
        })
      }, fail: function (res) {
        wx.showModal({
          title: '提示',
          content: '请打开手机蓝牙',
          showCancel: false
        })
      }, complete: function (res) {
        that.setData({
          isClick: false
        })
      }
    })

    

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.setNavigationBarTitle({
      title: '扫一扫',
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

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

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

  }
})