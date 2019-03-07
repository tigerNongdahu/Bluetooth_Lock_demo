// pages/connectBluetooth/connectBluetooth.js
const app = getApp();
var zhmd5 = require('../../utils/zhmd5.js');
var date = require('../../utils/util.js');
var fateFormat = 'Y-M-D h:m:s';

var interval = null;
var currentTime = 10;

var UUID = '00000001-0000-1000-8000-'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    deviceMac: '',
    readStatu: "正在搜索设备...",
    registerStatu: "",
    openStatu: "",
    remoteStatu: "",
    btnEnable: true,
    isRead: true, //读取数据
    isRegister: false,
    isOpenLock: false,
    isRemoteLock: false,
    AdapterChange: false, //表示蓝牙是否被关闭或者重新打开
    isConnect: false,
    deviceId: "", //设备ID
    sendData: "", //广播数据
    ishaveDevice: false,
    isDiscovering: false,
    writeCharacteristicId:'',//写的特征
    readCharacteristicId:'',//写之后返回的特征
    readImeiCharacteristicId:'',//Imei读取的特征
    RSSI:0,
    deviceName:'',
    IMEI:'',
    IMSI:'',
    openEnd:false,
    keyData:'',// 开锁密钥
    userId:'',
    version:'',//设备版本号
    NB:'',//nb信号
    power:'',//设备电量
    isBtnClick: false,
    platform: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    var deviceMac = options.deviceMac
    wx.setNavigationBarTitle({
      title: deviceMac,
    })
    this.setData({
      deviceMac: deviceMac,
    })

    this.gg_openBluetoothAdapter()

  },

  /**开启蓝牙适配器 */
  gg_openBluetoothAdapter: function() {
    var that = this
    wx.openBluetoothAdapter({
      success: function(res) {
        that.setData({
          AdapterChange: false
        })
        //监听蓝牙是否变化（开启和关闭蓝牙）
        that.gg_onBluetoothAdapterStateChange()
        //获取本机适配  
        that.gg_getBluetoothAdapterState();
        // //监听发现到新设备
        that.gg_onBluetoothDeviceFound();
        //监听低功耗蓝牙设备的特征值变化（开锁的成功或者失败）。必须先启用notify接口才能接收到设备推送的notification。
        that.gg_onBLECharacteristicValueChange()
      },
      fail: function(res) {
        wx.showModal({
          title: '提示',
          content: '请检查手机蓝牙是否打开',
          showCancel: false,
          success: function(res) {}
        })

        that.setData({
          readStatu: "未开启蓝牙，请开启蓝牙"
        })
      }
    })
  },

  /**获取所有 所有连接和未连接的设备 */
  /**
   * 这个方法的作用是解决有些特殊情况下，退出当前页面的时候，不断开蓝牙连接，再次进来时先断开连接，这样才可以搜索到设备以及最新的广播数据包
   */
  gg_getBluetoothDevices: function(){
    var that = this
    wx.getBluetoothDevices({
      success: function (devices) {
        if (that.data.ishaveDevice == false){
         for(var i = 0; i < devices.devices.length; i ++){
           var device = devices.devices[i]
           if (device.advertisServiceUUIDs){
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
      fail:function(res){
        console.log("gg_getBluetoothDevices fail res:" + JSON.stringify(res))
      },
    })
  },

  /***
   * 监听蓝牙适配器状态
   */
  gg_onBluetoothAdapterStateChange: function() {
    var that = this;
    wx.onBluetoothAdapterStateChange(function(res) {
      //不可用
      if (!res.available) {
        wx.showModal({
          title: '提示',
          content: '请检查手机蓝牙是否打开',
        })

        wx.navigateBack({
          delta:1
        })

        that.setData({
          isConnect: false,
          AdapterChange: true,
          isDiscovering: false
        })
        
      } else {
        that.setData({
          isConnect: false,
        })
      }
    })
  },

  /**
   * 获取本机的适配
   */
  gg_getBluetoothAdapterState: function() {
    var that = this;
    wx.getBluetoothAdapterState({
      success: function(res) {
        if (res.available) {
          //开启搜索设备功能
          that.gg_startBluetoothDevicesDiscovery();
        } else {
          wx.showModal({
            title: '提示',
            content: '蓝色设备不可用，请检查手机蓝牙是否打开',
            showCancel: false
          })
        }
      },
      fail: function(res) {
        var str = app.getBluetoothErrorCode(res.errCode)
        wx.showModal({
          title: '提示',
          content: str,
        })
      }
    })
  },

  /**
   * 发现设备
   */
  gg_onBluetoothDeviceFound: function() {
    //监听发现新设备
    var that = this
    wx.onBluetoothDeviceFound(function(devices) {
      that.gg_haveDeviceRes(devices)
    })
  },

  /**已经查找到设备 */
  gg_haveDeviceRes: function (devices){
    var that = this
    var data16 = that.ab2hex(devices.devices[0].advertisData).toLocaleUpperCase()
    var dId = data16.substring(0, 4);
    var mac = data16.substr(4, 12);

    if (dId.indexOf(app.globalData.SID) != -1 && data16.indexOf(that.data.deviceMac.toLocaleUpperCase()) != -1) {
      var RSSI = devices.devices[0].RSSI
      var deviceName = devices.devices[0].localName
      var sendData = data16.substr(4, data16.length - 4)
      that.setData({
        deviceId: devices.devices[0].deviceId,
        sendData: sendData,
        RSSI: RSSI,
        deviceName: deviceName
      })

      if (that.data.ishaveDevice == false) {
        that.setData({
          ishaveDevice: true
        })

        that.gg_stopBluetoothDevicesDiscovery()

        setTimeout(function () {
          that.createConnect()
        }, 1000) //延迟时间 这里是1秒
      }
    }
  },

  /**
   * 搜索设备
   */
  gg_startBluetoothDevicesDiscovery: function() {
    var that = this

    that.gg_getBluetoothDevices()
    var serviceId = UUID + that.data.deviceMac

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      services: [serviceId],
      success: function(res) {
        that.setData({
          isDiscovering: true,
          readStatu: "正在搜索...",
          isRead: true,
        })

        currentTime = 10

        interval = setInterval(function() {
          currentTime--;
          console.log("currentTime:" + currentTime)
          if (currentTime <= 0 && that.data.isDiscovering == true) {
            clearInterval(interval)
            that.gg_stopBluetoothDevicesDiscovery()
            if (that.data.ishaveDevice == false){
              wx.showModal({
                title: '提示',
                content: '未搜索到设备，继续搜索？',
                confirmText: '继续',
                success: function (res) {
                  if (res.confirm) {
                    that.gg_startBluetoothDevicesDiscovery()
                  }
                }
              })
            }
          }
        }, 1000)
      },
      fail: function(res) {
        wx.hideLoading()
        var str = app.getBluetoothErrorCode(res.errCode)
        wx.showModal({
          title: '提示',
          content: '设备搜索失败，' + str,
          confirmText: '重试',
          success: function(res) {
            if (res.confirm) {
              that.gg_startBluetoothDevicesDiscovery()
            } 
          }
        })
      }
    })
  },

  /**
   * 停止搜索设备
   */
  gg_stopBluetoothDevicesDiscovery: function() {
    var that = this

    wx.stopBluetoothDevicesDiscovery({
      success: function(res) {
        console.log("停止蓝牙搜索======")
        console.log(res)
        that.setData({
          isDiscovering: false,
          ishaveDevice: false,
        })
        clearInterval(interval)
      },
      complete: function(res) {
        
       
      }
    })
  },

  /**
   * 监听特征值的变化
   */
  gg_onBLECharacteristicValueChange: function() {
    var that = this
    wx.onBLECharacteristicValueChange(function(characteristic) {

      if (characteristic.deviceId.toLocaleUpperCase() != that.data.deviceId.toLocaleUpperCase()){
        return false
        }

      let buffer = characteristic.value
      var data = that.ab2hex(buffer).toLocaleUpperCase()
      console.log("data:" + data)

      var imeif = that.sixToIn(data.substring(0, 1)) * 16;
      var imeiS = that.sixToIn(data.substring(1, 2))
      var imeilenght = imeif + imeiS
      var IMEI = data.substring(2, imeilenght * 2 + 2)

      var imsiStrLenght = data.substring(imeilenght * 2 + 2, imeilenght * 2 + 3);
      var imsif = that.sixToIn(imsiStrLenght) * 16;
      var imsis = that.sixToIn(data.substring(imeilenght * 2 + 3, imeilenght * 2 + 4));
      var imsiLenght = imsif + imsis

      var IMSI = data.substring(imeilenght * 2 + 4, imeilenght * 2 + 4 + imsiLenght * 2)

      //读取IMEI
      if (characteristic.characteristicId.toLocaleUpperCase() == that.data.readImeiCharacteristicId.toLocaleUpperCase()){   
        if (imeilenght == 0 || imsiLenght == 0){
          wx.showModal({
            title: '提示',
            content: '未连接上NB-IoT网络，请对门锁重新上电，等待3分钟后再操作设备',
            showCancel: false
          })
          that.setData({
            readStatu: '读取设备信息失败',
          })
          return false
        }

        that.setData({
          readStatu: '读取设备信息成功',
          isRegister: true,
          registerStatu: '正在注册设备...'
        })

        //注册设备
        that.gg_registerDevice(data)
      } else if (characteristic.characteristicId.toLocaleUpperCase() == that.data.readCharacteristicId.toLocaleUpperCase()){
        if (data == 'AA05020100') {
          that.setData({
            openStatu:'验证开锁成功',
            isRemoteLock: true,
            openEnd:true,
            remoteStatu:'正在下发远程开锁指令...'
          })

          //断开蓝牙连接
          that.gg_closeBLEConnection()

          // setTimeout(function () {
          //   //下发远程开锁指令
          //   that.gg_sendRemoteOpenLock()
          // }, 2000) //延迟时间 这里是2秒
          
        } else if (data == 'AA05020105') {
          console.log("门锁已打开")
        } else {
          if (that.data.openEnd == true) {
            if (data == 'AA05020001') {
              console.log("门锁已关闭")
            }
          } else {
            if (data == 'AA05020400') {
              wx.showToast({
                title: '远程开锁成功',
              })
            }else{
              that.setData({
                openStatu: '验证开锁失败，请重试',
                openEnd:true
              })
              that.gg_closeBLEConnection()
              wx.showModal({
                title: '提示',
                content: '验证开锁失败，请重试',
                confirmText: '重试',
                success: function (res) {
                  if (res.confirm) {
                    that.gg_startBluetoothDevicesDiscovery()
                  }else{
                    wx.navigateBack({
                      delta:1
                    })
                  }
                }
              })
            }
          }
        }
      }
    })
  },

  /**
   * 创建连接
   */
  createConnect: function() {
    var that = this

    that.gg_stopBluetoothDevicesDiscovery()

    //表示已经到了验证蓝牙开锁的步骤
    if (that.data.isRegister == true) {
      that.setData({
        openStatu: '正在连接蓝牙设备...'
      })
    } else {
      that.setData({
        readStatu: '正在连接蓝牙设备...'
      })
    }

    if (that.data.isConnect == false) {
      wx.createBLEConnection({
        deviceId: this.data.deviceId,
        success: function(res) {
          that.setData({
            isConnect: true
          })
          //获取服务
          that.gg_getBLEDeviceServices()

        },
        fail: function(res) {
          wx.hideLoading()

          if (res.errCode == -1) {
            that.setData({
              isConnect: true
            })
            //获取服务
            that.gg_getBLEDeviceServices()
          } else {

            var str = app.getBluetoothErrorCode(res.errCode)
            if (that.data.isRegister == true) {
              that.setData({
                openStatu: '连接蓝牙失败，' + str
              })
            } else {
              that.setData({
                readStatu: '连接蓝牙失败，' + str
              })
            }

            that.setData({
              isConnect: false,
            })
           
            wx.showModal({
              title: '提示',
              content: '连接蓝牙失败，' + str,
              confirmText: '重试',
              success: function(res) {
                if (res.confirm) {
                  that.createConnect()
                }
              }
            })
          }
        }
      })
    } else {
      //获取服务
      that.gg_getBLEDeviceServices()
    }

    //监听设备的连接状态
    that.gg_onBLEConnectionStateChange()
  },

  /**
  * 获取蓝牙设备所有 service
  */
  gg_getBLEDeviceServices: function () {
    var that = this
    if (that.data.isRegister == true) {
      that.setData({
        openStatu: '正在获取设备数据...'
      })
    } else {
      that.setData({
        readStatu: '正在获取设备数据...'
      })
    }

    wx.getBLEDeviceServices({
      deviceId: that.data.deviceId,
      success: function (res) {
        that.setData({
          serviceId: res.services[0].uuid
        })
        that.gg_getBLEDeviceCharacteristics(res.services[0].uuid)
      },
      fail: function (res) {
        
        var str = app.getBluetoothErrorCode(res.errCode)
        wx.showModal({
          title: '提示',
          content: '获取蓝牙数据失败，' + str,
          confirmText:'重试',
          success: function(e){
            if(e.confirm){
              if (res.errCode == 10006){
                that.setData({
                  isConnect: false,
                })
                that.createConnect()
              }else{
                that.gg_getBLEDeviceServices()
              }
            }
          }
        })

        if (that.data.isRegister == true) {
          that.setData({
            openStatu: '获取蓝牙数据失败，'+ str
          })
        } else {
          that.setData({
            readStatu: '获取蓝牙数据失败，' + str
          })
        }
      }
    })
  },

  /**
   * 获取特征id
   */
  gg_getBLEDeviceCharacteristics: function (serviceId) {
    var that = this

    if (that.data.isRegister == true) {
      that.setData({
        openStatu: '正在获取设备数据...'
      })
    } else {
      that.setData({
        readStatu: '正在获取设备数据...'
      })
    }
    wx.getBLEDeviceCharacteristics({
      deviceId: that.data.deviceId,
      serviceId: serviceId,
      success: function (res) {

        var chs = res.characteristics;
        var readCharacteristicId = ""
        var writeCharacteristicId = ""
        var readImeiCharacteristicId = ""
        for (var i in chs) {
          var ch = chs[i]
          //获取读的特征值ID
          if (ch.uuid.indexOf("FF02-") != -1) {
            readCharacteristicId = ch.uuid
          } else if (ch.uuid.indexOf("FF01-") != -1) { //获取写的特征值ID
            writeCharacteristicId = ch.uuid
          } else if (ch.uuid.indexOf("FF07-") != -1) { //获取读取imei特征值ID
            readImeiCharacteristicId = ch.uuid
          }
        }
        that.setData({
          writeCharacteristicId: writeCharacteristicId,
          readCharacteristicId: readCharacteristicId,
          readImeiCharacteristicId: readImeiCharacteristicId
        })

        //监听特征值的变化
        that.gg_notifyBLECharacteristicValueChange(serviceId, readCharacteristicId)

        //表示读取设备信息
        if (that.data.isRegister == false) {
          setTimeout(function () {
            that.readBluetoothDeviceData(serviceId, readImeiCharacteristicId)
          }, 500) //延迟时间 这里是0.5秒

        }else{//蓝牙开锁
          //跟服务器获取密钥
          that.gg_getLockPassword()
        }
      },
      fail: function (res) {
        var str = app.getBluetoothErrorCode(res.errCode)
        var msgStr = '获取蓝牙数据失败，' + str
        if (that.data.isRegister == true) {
          that.setData({
            openStatu: msgStr
          })
        } else {
          that.setData({
            readStatu: msgStr
          })
        }

        wx.showModal({
          title: '提示',
          content: msgStr,
          confirmText:'重试',
          success: function(e){
            if(e.confirm){
              if (res.errCode == 10006) {
                that.createConnect()
              } else {
                that.gg_getBLEDeviceCharacteristics(serviceId)
              }
            }
          }
        })
      }
    })
  },


  /**
  * 监听设备的连接
  */
  gg_onBLEConnectionStateChange: function () {
    var that = this
    wx.onBLEConnectionStateChange(function (res) {
      // 该方法回调中可以用于处理连接意外断开等异常情况
      if (!res.connected) {
        that.setData({
          isConnect: false
        })
      } else {
        that.setData({
          isConnect: true
        })
      }
    })
  },

  /**
 * 监听特征值的变化
 */
  gg_notifyBLECharacteristicValueChange: function (serviceId, readCharacteristicId) {
    var that = this
    //在设置监听蓝牙写入情况下时，deviceId最好是大写，不然有些时候会注册失败
    var deviceId = that.data.deviceId.toLocaleUpperCase()
    wx.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: readCharacteristicId,
      state: true,
      success: function (res) {
        console.log("注册通知成功....:" + JSON.stringify(res))

      },
      fail: function (res) {
        console.log("注册通知失败："+ JSON.stringify(res))
        var str = app.getBluetoothErrorCode(res.errCode)

      }
    })
  },

  /**
   * 读取设备的一些信息，比如IMEI和IMSI等
   */
  readBluetoothDeviceData: function (serviceId, readImeiCharacteristicId) {

    var that = this

    that.setData({
      readStatu: '正在读取设备信息...'
    })
    wx.readBLECharacteristicValue({
      deviceId: that.data.deviceId,
      serviceId: serviceId,
      characteristicId: readImeiCharacteristicId,
      success: function (res) {
        console.log("发送读取imei数据成功")
      },
      fail: function (res) {
        console.log("rs:"+JSON.stringify(res))
        var str = app.getBluetoothErrorCode(res.errCode)
        that.setData({
          readStatu: '读取设备信息失败,' + str
        })

        wx.showModal({
          title: '提示',
          content: '读取数据失败,' + str,
          confirmText: '重试',
          success: function (e) {
            if (e.confirm) {
              if (res.errCode == 10006) {
                that.createConnect()
              } else {
                that.readBluetoothDeviceData(serviceId, readImeiCharacteristicId)
              }
            } else {
              wx.navigateBack({
                delta:1
              })
            }
          }
        })
      },
      complete: function (res) {
        console.log("read complete:" + JSON.stringify(res))
      }
    })
  },

  /**注册设备 */
  gg_registerDevice: function (IMEIIMSI){

    var that = this
    var imeif = that.sixToIn(IMEIIMSI.substring(0, 1)) * 16;
    var imeiS = that.sixToIn(IMEIIMSI.substring(1, 2))
    var imeilenght = imeif + imeiS
    var IMEI = IMEIIMSI.substring(2, imeilenght * 2 + 2)
    var IMEIs = ""
    for (var i = 0; i < IMEI.length; i += 2) {
      var it = IMEI.substr(i, 2)
      var itt = parseInt(it) - 30
      IMEIs = IMEIs + itt
    }
   var IMEI = IMEIs

    var imsiStrLenght = IMEIIMSI.substring(imeilenght * 2 + 2, imeilenght * 2 + 3);
    var imsif = that.sixToIn(imsiStrLenght) * 16;
    var imsis = that.sixToIn(IMEIIMSI.substring(imeilenght * 2 + 3, imeilenght * 2 + 4));
    var imsiLenght = imsif + imsis

    var IMSI = IMEIIMSI.substring(imeilenght * 2 + 4, imeilenght * 2 + 4 + imsiLenght * 2)

    var IMSIs = ""
    for (var i = 0; i < IMSI.length; i += 2) {
      var it = IMSI.substr(i, 2)
      var itt = parseInt(it) - 30
      IMSIs = IMSIs + itt
    }

    var  IMSI = IMSIs

    that.setData({
      IMSI: IMSI,
      IMEI: IMEI
    })

    var t = imeilenght * 2 + imeilenght * 2 + 4 + 16
    var platform = IMEIIMSI.substr(t, 2);
    platform = parseInt(platform)

    var appId = app.globalData.appId
    var timestamp = Date.parse(new Date()) + '';
    var hotelName = 'Guogee_安装测试'
    var mac = that.data.deviceMac.toLocaleUpperCase()
    var signData = app.globalData.key

    var data = {
      appId: appId,
      mac: mac,
      reqMilTime: timestamp,
      deviceName: that.data.deviceName,
      hotelName: hotelName,
      imei: IMEI,
      imsi: IMSI,
      signData: signData,
      platform: platform
    }

    var jsonObj = app.jsonObjSort(data)
    var jsonStr = JSON.stringify(jsonObj)
    var sign = zhmd5.md5(jsonStr).toLocaleUpperCase()
    var data = {
      appId: appId,
      hotelName: hotelName,
      imei: IMEI,
      imsi: IMSI,
      deviceName: that.data.deviceName,
      mac: mac,
      reqMilTime: timestamp,
      signData: sign,
      platform: platform
    }

    var jsonObj = app.jsonObjSort(data)

    var url = app.globalData.passwordUrl + '/onenet/client/device';
    console.log("==========url:"+url)

    wx.request({
      url: url,
      method: 'POST',
      header: {
        'content-type': 'application/json' // 默认值
      },
      data: jsonObj,
      success: function(res){
        console.log("======:"+JSON.stringify(res))
        if (res.data.code == 1){//注册成功
          that.setData({
            registerStatu: '注册成功',
            isOpenLock: true,
            openStatu:'正在获取开锁密钥...'
          })
          setTimeout(function () {
            that.gg_getLockPassword()
          }, 500) //延迟时间 这里是1秒
        } else { //
          if (res.data.code == 0 && res.data.data.indexOf('device already exists') != -1) {//因为没有返回特定的错误码，只能使用错误信息来做判断
            //获取开锁密钥
            that.setData({
              registerStatu: '注册成功',
              isOpenLock:true,
              openStatu: '正在获取开锁密钥...'
            })
            that.gg_getLockPassword()
          } else if (res.data.code == -1 && res.data.data.indexOf('invalid parameter: imei exists') != -1){//因为没有返回特定的错误码，只能使用错误信息来做判断
 
            that.setData({
              registerStatu: '注册失败，该设备已经在其他平台注册'
            })
            wx.showModal({
              title: '提示',
              content: '注册失败，该设备已经在其他平台注册',
              showCancel:false,
              success: function (e) {
                
              },
            })

          }
        }
      },
      fail: function(res){
        that.setData({
          registerStatu: '注册失败，请重试'
        })
        console.log("fail res:" + JSON.stringify(res))
        wx.showModal({
          title: '提示',
          content: '注册设备失败，请检查网络连接情况',
          confirmText: '重试',
          success: function(e){
            if(e.confirm){
              that.gg_registerDevice(IMEIIMSI)
            }else{
              wx.navigateBack({
                delta:1
              })
            }
          },
        })
      }
    })
  },

  /**获取开锁密钥 */
  gg_getLockPassword: function(){
    var that = this
    var timestamp = Date.parse(new Date());

    var startTime = date.formatTimeTwo(timestamp, fateFormat) + '';
    var endTime = date.formatTimeTwo(timestamp + 5 * 60 * 1000, fateFormat) + '';

    var reqMilTime = timestamp + ''
    var data = {
      appId: app.globalData.appId,
      ownerId:'13112345678',
      blueBrdInfo: that.data.sendData,
      startTime: startTime,
      endTime: endTime,
      reqMilTime: reqMilTime,
      signData: app.globalData.key
    }
    //对模型进行排序
    var jsonObj = app.jsonObjSort(data)
    var jsonStr = JSON.stringify(jsonObj)
    //进行MD5加密
    var sign = zhmd5.md5(jsonStr).toLocaleUpperCase()

    var data = {
      appId: app.globalData.appId,
      blueBrdInfo: that.data.sendData,
      startTime: startTime,
      ownerId: '13112345678',
      endTime: endTime,
      reqMilTime: reqMilTime,
      signData: sign
    }

    var jsonObj = app.jsonObjSort(data)

    var url = app.globalData.passwordUrl + '/onenet/door/key/platform';

    wx.request({
      url: url,
      method: 'POST',
      header: {
        'content-type': 'application/json' // 默认值
      },
      data: jsonObj,
      success: function (res) {
        console.log("res:"+JSON.stringify(res))
        if (res.data.code == 'SUCCESS') {//获取密钥成功
          that.setData({
            openStatu: '正在开锁...',
            keyData: res.data.KEY
          })
          that.sendBluetoothData(res.data.KEY)
        } else { //
          that.setData({
            openStatu: '获取开锁密钥失败，请重试'
          })
          wx.showModal({
            title: '提示',
            content: '获取开锁密钥失败，请重试',
            confirmText:'重试',
            success: function(e){
              if(e.confirm){
                that.gg_getLockPassword()
              }else{
                wx.navigateBack({
                  delta:1
                })
              }
            } 
          })
        }
      },
      fail: function (res) {
        console.log("fail res:" + JSON.stringify(res))
        that.setData({
          openStatu: '获取开锁密钥失败，请重试'
        })
        wx.showModal({
          title: '提示',
          content: '获取开锁密钥失败，请检查网络连接情况',
          confirmText: '重试',
          success: function(res){
            if(res.confirm){
              that.gg_getLockPassword()
            }else{
              wx.navigateBack({
                delta:1
              })
            }
          }
        })
      }
    })
  },

  /**
   * 发送数据
   * 
   */
  sendBluetoothData: function (data) {
    var that = this
    var list = []
    for (var i = 0; i < data.length; i += 2) {
      var it = data.substr(i, 2)
      list.push(it)
    }

    var index = 0
    var total = list.length

    that.zhubaoData(0, total, list)
  },
  /**
   * 配置数据
   * index: 当前发送的第几个包
   * list: 按照2个字符存在的数据数组
   */
  zhubaoData: function (index, totle, list) {
    var that = this
    var maxIndex = parseInt(totle / 20)
    if (totle % 20 > 0) {
      maxIndex++
    }
    if (index < maxIndex - 1) {
      var subBuffer = new ArrayBuffer(20)
      var subDataView = new DataView(subBuffer)
      for (var i = 0; i < 20; i++) {
        var item = list[i + index * 20]
        var itemF = app.sixthToTen(item.substr(0, 1)) * 16
        var itemS = app.sixthToTen(item.substr(1, 1))
        var itemInt = itemF + itemS
        subDataView.setUint8(i, itemInt)
      }
      var dataStr = that.ab2hex(subBuffer)
      console.log("subBuffer:" + dataStr)
      //发送数据
      that.sendBlueData(subBuffer, false, index, totle, list)
    } else if (index == maxIndex - 1) {
      var count = totle - (parseInt(totle / 20)) * 20
      let subbBuffer = new ArrayBuffer(count)
      let subbDataView = new DataView(subbBuffer)
      for (var i = 0; i < count; i++) {
        var item = list[i + (parseInt(totle / 20)) * 20]
        var itemF = app.sixthToTen(item.substr(0, 1)) * 16
        var itemS = app.sixthToTen(item.substr(1, 1))
        var itemInt = itemF + itemS
        subbDataView.setUint8(i, itemInt)
      }
      var dataStr = that.ab2hex(subbBuffer)
      console.log("subBuffer++++:" + dataStr)
      //发送数据
      that.sendBlueData(subbBuffer, true, index, totle, list)
    }
  },
  /**最后发送的数据
   * buffer:发送的二进制数据
   * isLast：是否为最后一个包，不是则继续发送
   * index:表示当前的第几个包
   * totle:list 数组的长度
   * list：按照2个字符存在的数据数组
   */
  sendBlueData: function (buffer, isLast, index, totle, list) {
    var that = this
    wx.writeBLECharacteristicValue({
      deviceId: that.data.deviceId,
      serviceId: that.data.serviceId,
      characteristicId: that.data.writeCharacteristicId,
      value: buffer,
      success: function (res) {
        console.log(res)
        if (!isLast) {
          var sendCurrentIndex = index + 1
          that.setData({
            sendCurrentIndex: sendCurrentIndex
          })
          that.zhubaoData(that.data.sendCurrentIndex, totle, list)
        } else {
          setTimeout(function () {

            //如果发送数据成功，但是没有返回开锁成功，则弹出提示
            if(that.data.openEnd == false){
              that.setData({
                sendCurrentIndex: 0,
                remoteStatu: "开锁数据已发送，门锁未反应"
              })

              wx.showModal({
                title: '提示',
                content: '开锁数据发送成功，门锁未反应，请重试',
                confirmText: '重试',
                success: function(res){
                  if(res.confirm){
                    that.sendBluetoothData(that.data.keyData)
                  }else{
                    wx.navigateBack({
                      delta:1
                    })
                  }
                }
              })
            }
          }, 10000)
        }
      },
      fail: function (res) {
        wx.hideLoading()
        var str = app.getBluetoothErrorCode(res.errCode)
        console.log("发送失败:" + JSON.stringify(res))
        wx.showModal({
          title: '提示',
          content: '开锁数据发送失败,' + str,
          confirmText: '重试',
          success: function (e) {
            if (e.confirm) {
              if (res.errCode == 10006) {
                setTimeout(function () {
                  that.createConnect()
                }, 250)
              }else{
                that.sendBluetoothData(that.data.keyData)
              }
            } else {
              wx.navigateBack({
                delta: 1
              })
            }
          }
        })
        that.setData({
          sendCurrentIndex: 0,
          remoteStatu: "开锁数据发送失败，请重试"
        })
      }
    })
  },

  /**断开连接 */
  gg_closeBLEConnection: function(){
    var that = this
    wx.closeBLEConnection({
      deviceId: that.data.deviceId,
      complete: function (res) {
        console.log(res)
      }
    })
  },

  /**远程下发指令 */
  gg_sendRemoteOpenLock: function(){
    var that = this
    var timestamp = Date.parse(new Date());
    var reqMilTime = timestamp + ''
    var data = {
      appId: app.globalData.appId,
      userId: '987654321',
      mac: that.data.deviceMac,
      reqMilTime: reqMilTime,
      signData: app.globalData.key,
      status:1
    }

    var jsonObj = app.jsonObjSort(data)
    var jsonStr = JSON.stringify(jsonObj)
    var sign = zhmd5.md5(jsonStr).toLocaleUpperCase()

    var data = {
      appId: app.globalData.appId,
      userId: '987654321',
      mac: that.data.deviceMac,
      reqMilTime: reqMilTime,
      signData: sign,
      status: 1
    }

    var jsonObj = app.jsonObjSort(data)

    var url = app.globalData.passwordUrl + '/onenet/door/remote';

    wx.request({
      url: url,
      method: 'POST',
      header: {
        'content-type': 'application/json' // 默认值
      },
      data: jsonObj,
      success: function(res){
        console.log('远程指令下发成功:'+JSON.stringify(res))
        if(res.data.code == 1){
          that.setData({
            remoteStatu: '远程开锁指令下发成功，请触摸门锁进行开锁',
            btnEnable: false
          })
        }else{
          that.setData({
            remoteStatu: '远程开锁指令下发失败，请重试'
          })
          wx.showModal({
            title: '提示',
            content: '远程开锁指令下发失败，请重试',
            confirmText: '重试',
            success: function(res){
              if(res.confirm){
                that.gg_sendRemoteOpenLock()
              }else{
                wx.navigateBack({
                  delta:1
                })
              }
            }
          })
        }
      },
      fail: function(res){

        that.setData({
          remoteStatu: '远程开锁指令下发失败，请重试'
        })
        wx.showModal({
          title: '提示',
          content: '远程开锁指令下发失败，请重试',
          confirmText: '重试',
          success: function (res) {
            if (res.confirm) {
              that.gg_sendRemoteOpenLock()
            } else {
              wx.navigateBack({
                delta: 1
              })
            }
          }
        })
      }
    })
  },


  sixToIn: function (str) {
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



  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {
    var that = this
    that.gg_stopBluetoothDevicesDiscovery()
    that.gg_closeBLEConnection()
    clearInterval(interval)

    wx.closeBluetoothAdapter({
      success: function (res) {
        console.log(res)
      },
    })
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    var that = this
    that.gg_stopBluetoothDevicesDiscovery()
    that.gg_closeBLEConnection()
    clearInterval(interval)
    wx.closeBluetoothAdapter({
      success: function (res) {
        console.log(res)
      },
    })
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {

  },

  /**
   * 二进制转成16进制
   */
  ab2hex: function(buffer) {
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function(bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  },
})