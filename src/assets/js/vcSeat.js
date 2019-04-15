/*
  vcSeat选座库
  1.数据处理
  2.canvas绘制座位
  3.点击选座
  4.推荐选座
  5.‘选好了’按钮
  6.canvas滑动 手势捏放 点击放大
  FIXME:依赖alloyfinger，另外还有EventBus---要把注册的事件座位参数
  先import alloyfinger再import vcSeat.js
*/
;(function () {
  let VcSeat = function () {
    // 规整数据(包含过道,权重)
    this.data = null
    // 没有已售座位的数据
    this.noyishouData = null
    // 权重数据---将noyishouData按照权重进行排序
    this.weightSeats = null
    // 不包含过道的数据
    this.regArr = null
    // 记录行数---一共有多少行
    this.rows = null
    // 记录列数---一共有多少列
    this.cols = null
    // canvas标签元素的宽度
    this.canvasWidth = null
    // canvas标签元素的高度
    this.canvasHeight = null
    // 单个座位的宽度
    this.seatWidth = null
    // 存储已选座位的code
    this.chooseCodes = []
    // 遍历权重数据的索引
    this.initIndex = 0
    // 存储已选座位所在的行数---主要是为了在chooseOk中使用
    this.chooseRows = []
    // 普通座是否留空布尔值
    this.bool = false
    // 情侣座是否留空布尔值
    this.coupleBool = false
    // FIXME:画布宽度
    this.canvasWidth = null
    // 画布高度
    this.canvasHeight = null
    // 2d上下文---因为有一个ctx.scale(),不能在循环中使用ctx.scale(),因为在循环中可能会按照放大之后为基准值再次放大
    this.ctx = null
  }
  VcSeat.protoType = {
    // 1.处理数据---排序,设置权重,创建过道,深拷贝,权重排序---datas是要处理的数据，num是序号,如‘0000000000000001’
    handler (datas, num) {
      // 处理 datas  把属性data中的cinemaSeatpicDataList(对象)的属性data3---0000000000000001对应的数组中的对象  ---data4 15010
      let arr = JSON.parse(datas).data.cinemaSeatpicDataList[num]
      let ylist = []
      let xlist = []
      arr.forEach((item) => {
        ylist.push(Number(item.yCoord))
        xlist.push(Number(item.xCoord))
      })
      // 得到y的最大值 x的最大值
      let ymax = Math.max(...ylist)
      let xmax = Math.max(...xlist)
      this.rows = ymax
      this.cols = xmax
      // 定义总容器数组,根据ymax创建数组,并判断x
      let resultArr = []
      for (let i = 0; i < ymax; i++) {
        resultArr[i] = []
        // 遍历arr , 其中的 y 如果等于 i,直接把当前项push  arr是总的一维数组
        for (let j = 0; j < arr.length; j++) {
          // 为规则2做标记:已售9 普通可选0 情侣可选2  ---普通已选是1 情侣已选是3 过道是4
          if (arr[j].status !== 'available') {
            arr[j].flag = '9'
          } else if (arr[j].loveSeat) {
            arr[j].flag = '2'
          } else {
            arr[j].flag = '0'
          }
          if (Number(arr[j].yCoord) === (i + 1)) {
            resultArr[i].push(arr[j])
          }
        }
      }
      // 由于x顺序不规则,所以要将x重新按照从小到大的顺序进行排列---这一步完成之后就是规整的数据了
      resultArr.forEach((item) => {
        for (let n = 0; n < item.length; n++) {
          this.bubbleSort(item)
        }
      })
      // console.log('resultArr')
      // console.log(resultArr)
      // 增加x权重 ---设置rows是为了测试了下data4
      resultArr.forEach((item, index) => {
        this.setXWeight(item)
        if (item.length === 0) {
          index += '空位'
        }
        // this.rows.push(index)
      })
      // 增加y权重
      this.setYWeight(resultArr)
      // 计算权重和,并设置给每个对象的新属性totalWeight
      resultArr.forEach((item1, index1) => {
        item1.forEach((item2, index2) => {
          item2.totalWeight = item2.xnum + item2.ynum
        })
      })
      console.log('resultArr')
      console.log(resultArr)
      this.regArr = this.deepCopy(resultArr)
      // console.log('regArr')
      // console.log(this.regArr)
      // 注意这里,上面与下面,我是先设置的权重,然后再去插入过道信息 ,所以不用再考虑过道会有权重的问题
      // 排完顺序之后,判断每一项xCoord与其索引之间的差值是否大于1,如果大于1 ,插入一个对象 i是行 j是列  ----设置纵向过道走廊
      for (let i = 0; i < resultArr.length; i++) {
        for (let j = 0; j < resultArr[i].length; j++) {
          if (Number(resultArr[i][j].xCoord) - j !== 1) {
            // console.log(j)
            // 为了行数栏的显示,要传入rowNum
            let passObj = this.createPassWay(i, j, resultArr[i][j].rowNum)
            resultArr[i].splice(j, 0, passObj)
          }
        }
      }
      // 设置横向过道---如果有横向过道,因为我按照最大行数来创建数组,又判断索引与数据中的y值的是否相等.所以横向过道存在时就是一个空数组
      // FIXME:发现即使创建了横向过道,末尾的纵向过道也是不能满足的,而且还会影响推荐选座,所以直接判断384行的this.data[y][x],不存在就是undefined,直接return.
      // 得到最后要使用的数据
      this.data = resultArr
    },
    // 排序
    bubbleSort (arr) {
      let sign
      for (let i = 0; i < arr.length - 1; i++) {
        sign = false
        for (let j = 0; j < arr.length - i - 1; j++) {
          if (Number(arr[j].xCoord) > (Number(arr[j + 1].xCoord))) {
            let oldVal = arr[j]
            arr[j] = arr[j + 1]
            arr[j + 1] = oldVal
            sign = true
          }
        }
        if (!sign) break
      }
    },
    // 设置x权重函数
    setXWeight (arr) {
      for (let i = 0; i < arr.length; i++) {
        if (i <= (arr.length / 2)) {
          arr[i].xnum = i
        } else {
          arr[i].xnum = arr.length - 1 - i
        }
      }
      return arr
    },
    // 设置y权重函数
    setYWeight (arr) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
          if (i <= (arr.length / 2)) {
            arr[i][j].ynum = i
          } else {
            arr[i][j].ynum = arr.length - 1 - i
          }
        }
      }
      return arr
    },
    // 创建过道
    createPassWay (i, j, rowNum) {
      let passWay = {}
      passWay.status = 'passway'
      passWay.xCoord = j + 1
      passWay.yCoord = i + 1
      passWay.rowNum = rowNum
      passWay.code = '0001'
      passWay.flag = '4'
      return passWay
    },
    // 深拷贝
    deepCopy (obj) {
      let objClone = Array.isArray(obj) ? [] : {}
      if (obj && typeof obj === 'object') {
        for (let key in obj) {
          if (obj.hasOwnProperty(key)) {
            // 判断obj子元素是否为对象，如果是，递归复制
            if (obj[key] && typeof obj[key] === 'object') {
              objClone[key] = this.deepCopy(obj[key])
            } else {
              // 如果不是，简单复制
              objClone[key] = obj[key]
            }
          }
        }
      }
      return objClone
    },
    // 权重排序--arr指的是二维数组
    sortWeight (arr) {
      let resultArr = []
      for (let i = arr.length - 1; i >= 0; i--) {
        for (let j = arr[i].length - 1; j >= 0; j--) {
          resultArr.push(arr[i][j])
        }
      }
      resultArr.sort(function (a, b) {
        return b.totalWeight - a.totalWeight
      })
      return resultArr
    },
    // 2.确定画布大小---startX绘座起始点横坐标 startY绘座起始点纵坐标
    defineCanvas () {
      // canvas宽度===屏幕宽度->座位宽度   ---左右固定值各10
      this.canvasWidth = document.body.clientWidth
      this.seatWidth = (this.canvasWidth - 20) / this.cols
      // canvas 高度 ---座位高度固定值28
      this.canvasHeight = this.rows * 28 + 20
      // 这里不要使用style样式来设置width和height---原始的width和height用来设置绘图尺寸,css的width和height用来设置显示尺寸
      this.$refs['seats'].width = this.canvasWidth * 4
      this.$refs['seats'].style.width = this.canvasWidth + 'px'
      this.$refs['seats'].height = this.canvasHeight * 4
      this.$refs['seats'].style.height = this.canvasHeight + 'px'
    },
    // 渲染canvas
    makeCanvas () {
      let data = this.data
      // 通过data数据来创建
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          if (data[i][j].code === '0001') {
            continue
          }
          if (data[i][j].status === 'damage') {
            // 已售
            this.loadImg('http://img.vcdianying.com/nwx/images/green/yixuan_icon.png', i, j)
            continue
          }
          if (data[i][j].status === 'selected') {
            this.loadImg('http://img.vcdianying.com/nwx/images/yishou_icon.png', i, j)
            continue
          }
          if (data[i][j].loveSeat) {
            // 情侣
            this.loadImg('http://img.vcdianying.com/nwx/images/qinglv_icon.png', i, j)
            continue
          }
          // 可选
          this.loadImg('http://img.vcdianying.com/nwx/images/kexuan_icon.png', i, j)
        }
      }
      // 绘制线
      this.setLine()
    },
    // 设置一层来过滤ctx,为了保证永远是同一个ctx
    save () {
      let seats = document.querySelector('.seats')
      let ctx = seats.getContext('2d')
      ctx.scale(4, 4)
      this.ctx = ctx
    },
    // canvas 加载图片---i是行数 j是列数 scale是缩放因子,默认是1
    loadImg (src, i, j) {
      // 重新渲染图片
      let width = this.seatWidth
      // 清除之前的图片
      this.ctx.clearRect(10 + j * width, 15 + i * 28, width, 28)
      let img = new Image()
      img.src = src
      img.onload = () => {
        this.ctx.drawImage(img, 10 + j * width, 15 + i * 28, width, 28)
      }
    },
    setLine () {
      this.ctx.setLineDash([2])
      this.ctx.lineWidth = 2
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
      this.ctx.beginPath()
      // moveTo() x横坐标 y纵坐标  ---x画布的一半  y 从0 到 画布高度,
      this.ctx.moveTo(this.canvasWidth / 2, 12)
      this.ctx.lineTo(this.canvasWidth / 2, 300)
      this.ctx.stroke()
    },
    // 3.用户自选点击
    choose (e, EventBus) {
      // 点击座位,以点击点为中心,放大canvas---Math.floor(e.offsetX-10),Math.floor(e.offsetY-10)
      // this.zoom(1.5,Math.floor(e.offsetX-10),Math.floor(e.offsetY-10),e)
      // pageX pageY相对浏览器内窗口,也就是当前页面   screenX screenY相对的是整个电脑屏幕窗口   ---x,y正好是索引,
      // FIXME:不应该再使用e.pageX与e.pageY,应该利用canvas本身的宽度
      let x = Math.floor((e.offsetX - 10) / this.seatWidth)
      let y = Math.floor((e.offsetY - 10) / 28)
      console.log(e.offsetX)
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows || !this.data[y][x]) {
        return
      }
      // 遍历data,根据y和x判断status,'passway' 'damage' 'select' 'available'
      if (this.data[y][x].status === 'passway' || this.data[y][x].status === 'damage') {
        return
      }
      // 放大---点击时将组件放大
      // this.$refs['seats'].style.cssText = 'transform:translateZ('+0+') scale('+ 1.5 +','+ 1.5 +');' + 'transform-origin:' + e.offsetX+'px '+ e.offsetY+'px;'
      // this.$refs['seats'].style.transition = 'all 2s ease 0s'
      // 给座位号组件传递座位号---这里要传递过去rowNum以及columnNum,这俩不包含过道
      let seatNum = []
      seatNum.push(this.data[y][x].rowNum, this.data[y][x].columnNum)
      // 修改座位号的视图
      EventBus.$emit('changeView', {chooseOrNot: true})
      // 如果点击的是已选的,在chooseCodes中删除code,将status改为available,再次重新渲染canvas---将当前y从chooseRows中删除
      if (this.data[y][x].status === 'selected') {
        // this.loadImg('http://img.vcdianying.com/nwx/images/kexuan_icon.png',y,x)
        this.data[y][x].status = 'available'
        this.chooseCodes.splice(this.chooseCodes.findIndex(item => item === this.data[y][x].code), 1)
        this.chooseRows.splice(this.chooseRows.findIndex(item => item === y), 1)
        // this.data[y][x].loveSeat?(this.data[y][x].flag = '2'):(this.data[y][x].flag = '0')
        if (this.data[y][x].loveSeat) {
          this.data[y][x].flag = '2'
          this.loadImg('http://img.vcdianying.com/nwx/images/qinglv_icon.png', y, x)
        } else {
          this.data[y][x].flag = '0'
          this.loadImg('http://img.vcdianying.com/nwx/images/kexuan_icon.png', y, x)
        }
        EventBus.$emit('reduceSeatNum', {
          seatNum
        })
        if (this.chooseCodes.length === 0) {
          EventBus.$emit('changeView', {chooseOrNot: false})
        }
      } else {
        if (this.chooseCodes.length >= 4) {
          return console.log('最多选择4个座位')
        }
        // 如果点击的是可选的,改变status,添加code---将y添加进chooseRows中
        this.loadImg('http://img.vcdianying.com/nwx/images/yishou_icon.png', y, x)
        this.data[y][x].status = 'selected'
        this.chooseCodes.push(this.data[y][x].code)
        this.chooseRows.push(y)
        this.data[y][x].loveSeat ? (this.data[y][x].flag = '3') : (this.data[y][x].flag = '1')
        // this.makeCanvas()
        EventBus.$emit('getSeatNum', {
          seatNum
        })
      }
      console.log(this.chooseCodes)
    },
    // 4.推荐选座点击
    judge (weightSeats, initIndex, num) {
      let bestSeat = weightSeats[initIndex]
      // 确定最优座位的坐标---这里使用data来处理,根据code确定索引位置,第几行,该行的状态拼接为字符串,以num为限制,以当前最优座位为判断点判断周遭
      let data = this.data
      let bestX = null
      let bestY = null
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          if (data[i][j].code === bestSeat.code) {
            bestY = i
            bestX = j
            break
          }
        }
      }
      for (let i = 0; i < num; i++) {
        this.chooseRows.push(bestY)
      }
      // 4-1最优座位是普通座
      if (weightSeats[initIndex].flag === '0') {
        // 将最优普通座位的flag设为'1'
        this.data[bestY][bestX].flag = '1'
        // 将flag拼接---原先想使用regArr,后在data中设置了过道的flag为4,改用data
        let str = ''
        for (let i = 0; i < this.data[bestY].length; i++) {
          str += this.data[bestY][i].flag
        }
        console.log(str)
        // 分情况判断
        switch (num) {
          case 1:
            this.addStatus(bestY, bestX)
            break
          case 2:
            if ((/01/).test(str)) {
            /* 记录最优座位和其左边座位  ---将code保存在chooseCodes中,画图bestX-1,bestX
            FIXME:
            this.data[bestY][bestX].status = 'selected'
            this.data[bestY][bestX-1].status = 'selected'
            this.loadImg('http://img.vcdianying.com/nwx/images/yishou_icon.png',bestY,bestX)
            this.loadImg('http://img.vcdianying.com/nwx/images/yishou_icon.png',bestY,bestX-1)
            this.chooseCodes.push(this.data[bestY][bestX-1].code,this.data[bestY][bestX].code)
            创建一个二维数组,传递给seatnum.vue
            let seatNum = []
            let arr1 = []
            let arr2 = []
            arr1.push(bestY,bestX-1)
            arr2.push(bestY,bestX)
            seatNum.push(arr1,arr2)
            EventBus.$emit('getSeatNum',{seatNum})
            break */
              this.addStatus(bestY, bestX - 1, bestX)
              break
            }
            if ((/10/).test(str)) {
            // 记录最优座位和其左边座位
              this.addStatus(bestY, bestX, bestX + 1)
              break
            }
            // 如果到这里,说明当前最高权重座位不符合情况,去寻找第二权重高的座位
            this.initIndex++
            this.judge(this.weightSeats, this.initIndex, this.num)
            break
          case 3:
            if ((/010/).test(str)) {
              this.addStatus(bestY, bestX - 1, bestX, bestX + 1)
              break
            }
            if ((/001|221/).test(str)) {
              this.addStatus(bestY, bestX - 2, bestX - 1, bestX)
              break
            }
            if ((/100|122/).test(str)) {
              this.addStatus(bestY, bestX, bestX + 1, bestX + 2)
              break
            }
            this.initIndex++
            this.judge(this.weightSeats, this.initIndex, this.num)
            break
          case 4:
            if ((/0010|2210/).test(str)) {
              this.addStatus(bestY, bestX - 2, bestX - 1, bestX, bestX + 1)
              break
            }
            if ((/0100|0122/).test(str)) {
              this.addStatus(bestY, bestX - 1, bestX, bestX + 1, bestX + 2)
              break
            }
            if ((/1000|1022|1220/).test(str)) {
              this.addStatus(bestY, bestX, bestX + 1, bestX + 2, bestX + 3)
              break
            }
            if ((/0001|2201|0221/).test(str)) {
              this.addStatus(bestY, bestX - 3, bestX - 2, bestX - 1, bestX)
              break
            }
            this.initIndex++
            this.judge(this.weightSeats, this.initIndex, this.num)
            break
        }
      }
      // 4-2最优座位是情侣座
      if (weightSeats[initIndex].flag === '2') {
        this.data[bestY][bestX].flag = '3'
        let str = ''
        for (let i = 0; i < this.data[bestY].length; i++) {
          str += this.data[bestY][i].flag
        }
        switch (num) {
          case 1:
            // 情侣座位不允许只选一个,所以直接判断下一个权重的座位
            this.data[bestY][bestX].flag = '2'
            this.initIndex++
            this.judge(this.weightSeats, this.initIndex, this.num)
            break
          case 2:
            // FIXME:如果只有俩情侣座呢
            if ((/23/).test(str)) {
              if ((/2232/).test(str)) {
                this.addStatus(bestY, bestX, bestX + 1)
                break
              } else if ((/2322/).test(str)) {
                this.addStatus(bestY, bestX - 1, bestX)
                break
              }
            }
            if ((/32/).test(str)) {
              this.addStatus(bestY, bestX, bestX + 1)
              break
            }
            break
          case 3:
            if ((/320/).test(str)) {
              this.addStatus(bestY, bestX, bestX + 1, bestX + 2)
              break
            }
            if ((/032|230/).test(str)) {
              this.addStatus(bestY, bestX - 1, bestX, bestX + 1)
              break
            }
            if ((/023/).test(str)) {
              this.addStatus(bestY, bestX - 2, bestX - 1, bestX)
              break
            }
            this.initIndex++
            this.judge(this.weightSeats, this.initIndex, this.num)
            break
          case 4:
            if ((/0320|2322|2300/).test(str)) {
              this.addStatus(bestY, bestX - 1, bestX, bestX + 1, bestX + 2)
              break
            }
            if ((/0032|2232|0230/).test(str)) {
              this.addStatus(bestY, bestX - 2, bestX - 1, bestX, bestX + 1)
              break
            }
            if ((/3200|3222/).test(str)) {
              this.addStatus(bestY, bestX, bestX + 1, bestX + 2, bestX + 3)
              break
            }
            if ((/0023|2223/).test(str)) {
              this.addStatus(bestY, bestX - 3, bestX - 2, bestX - 1, bestX)
              break
            }
            this.initIndex++
            this.judge(this.weightSeats, this.initIndex, this.num)
            break
        }
      }
    },
    // 逻辑公共代码封装
    addStatus (EventBus, y, ...x) {
      let seatNum = []
      x.forEach((item) => {
        this.data[y][item].status = 'selected'
        this.loadImg('http://img.vcdianying.com/nwx/images/yishou_icon.png', y, item)
        this.chooseCodes.push(this.data[y][item].code)
        this.data[y][item].loveSeat ? (this.data[y][item].flag = '3') : (this.data[y][item].flag = '1')
        let arr = []
        arr.push(this.data[y][item].rowNum, this.data[y][item].columnNum)
        seatNum.push(arr)
      })
      EventBus.$emit('getSeatNum', {seatNum})
    },
    // 5.选好了---判断座位是否留空,将chooseCodes
    chooseOk () {
      // 每次点击之前都要把bool和coupleBool手动赋值为false
      this.bool = false
      this.coupleBool = false
      console.log('------------')
      console.log(this.chooseRows)
      if (this.chooseRows.length === 0) {
        return
      }
      let rows = [...new Set(this.chooseRows)]
      // 判断中间是否留空
      for (let i = 0; i < rows.length; i++) {
        let str = ''
        this.data[rows[i]].forEach((item) => {
          str += item.flag
        })
        console.log(str)
        if ((/10[1,2,3,4,9]|[1,2,3,4,9]01/).test(str)) {
          // 为了防止多次触发,设置一个bool值
          this.bool = true
        }
        // 判断情侣座是否单选
        if (((/3/).test(str) && !(/33/).test(str)) || (/32[0,1,3,9]|[0,1,3,9]23/).test(str)) {
          this.coupleBool = true
        }
        // 验证布尔值,先判断情侣再普通留空
        if (this.coupleBool) {
          return console.log('请不要单选情侣座')
        }
        if (this.bool) {
          return console.log('座位之间不能留空一个座位,不要在过道旁单留一个座位')
        }
        // TODO:到达这里说明用户选座符合规范,获取this.chooseCodes
        console.log(this.chooseCodes)
      }
    },
    // 6.canvas滑动 手势捏放 点击放大
    scrollZoom (el) {
      // 解决微信浏览器默认的下拉效果
      document.body.addEventListener('touchmove', function (e) {
        e.preventDefault()
      }, {passive: false})
      // 触摸起始y,起始x,结束x,结束y,距离x,距离y
      let startY, startX, endX, endY
      // 放大比例
      let scale = 1.5
      // 是否点击放大了,默认值为false,常规大小
      let flag = false
      // 放大之后保证transform具有scale
      let str = 'scale(' + scale + ')'
      // 控制比例(超出自身高度或者宽度的固定比值后回弹)
      let bili = 4
      // 通过canvas去获取行数栏
      let rowBar = el.parentNode.nextElementSibling.children[0]
      // TODO:双指还是单指
      let isFingers = false
      // FIXME:tap事件---tap事件需要手动封装优化 click事件在移动端具有300ms的延迟,其他库封装的tap事件的事件对象e中没有offsetX
      el.addEventListener('click', function (e) {
        if (flag) {
          return
        }
        let x = Math.floor(e.offsetX)
        let y = Math.floor(e.offsetY)
        this.style.transform = 'scale(' + scale + ')'
        this.style.transition = 'all ease 0.2s'
        rowBar.style.transform = 'scale(' + scale + ')'
        rowBar.style.transition = 'all ease 0.2s'
        this.style.transformOrigin = x + 'px ' + y + 'px'
        rowBar.style.transformOrigin = 5 + 'px ' + y + 'px'
        flag = true
      })
      // 触摸开始
      el.addEventListener('touchstart', (e) => {
        // 判断手势---是普通的滑动还是手势捏
        e.touches.length === 2 ? isFingers = true : isFingers = false
        startY = e.touches[0].pageY
        startX = e.touches[0].pageX
      })
      // 触摸移动
      el.addEventListener('touchmove', (e) => {
        if (isFingers) {
          return
        }
        endY = e.changedTouches[0].pageY - startY
        endX = e.changedTouches[0].pageX - startX
        if (!flag) {
          str = ''
          bili = 4
        } else {
          str = 'scale(' + scale + ')'
          bili = 1
        }
        // 拖拽超出一定距离的话,停止拖拽
        if (Math.abs(endY) > el.offsetHeight / bili || Math.abs(endX) > el.offsetWidth / bili) {
          return
        }
        el.style.transform = 'translate(' + endX + 'px,' + endY + 'px)' + str
        rowBar.style.transform = 'translateY(' + endY + 'px)' + str
      })
      // 触摸结束
      el.addEventListener('touchend', (e) => {
        if (isFingers) {
          return
        }
        endY = e.changedTouches[0].pageY - startY
        endX = e.changedTouches[0].pageX - startX
        console.log(endY)
        if (!flag) {
          str = ''
          bili = 4
        } else {
          str = 'scale(' + scale + ')'
          bili = 1
        }
        // 如果resultY和resultX的绝对值大于了1/4的高和宽,就回弹到初始位置
        if (Math.abs(endY) > el.offsetHeight / bili) {
          el.style.transform = 'translateY(' + 0 + 'px)' + str
          rowBar.style.transform = 'translateY(' + 0 + 'px)' + str
          el.style.transition = 'all ease 0.5s'
          rowBar.style.transition = 'all ease 0.5s'
          return
        }
        if (Math.abs(endX) > el.offsetWidth / bili) {
          el.style.transform = 'translateX(' + 0 + 'px)' + str
          rowBar.style.transform = 'translateY(' + 0 + 'px)' + str
          el.style.transition = 'all ease 0.5s'
          rowBar.style.transition = 'all ease 0.5s'
          return
        }
        if (endX === 0 || endY === 0) {
          return
        }
        el.style.transform = 'translate(' + endX + 'px,' + endY + 'px)' + str
        el.style.transition = 'all ease 0.5s'
        // rowBar.style.top = endY + 'px'
        rowBar.style.transition = 'all ease 0.5s'
      })
      /* eslint-disable no-new */
      new AlloyFinger(el, {
        pinch (e) {
          if (!isFingers) {
            return
          }
          if (e.zoom > 1) {
            el.style.transform = 'scale(' + 1.5 + ')'
            el.style.transition = 'all ease 0.2s'
            rowBar.style.transform = 'scale(' + 1.5 + ')'
            rowBar.style.transition = 'all ease 0.2s'
            // 放大之后，为了保证可以以放大状态滑动，将flag标识赋值为true
            flag = true
          } else if (e.zoom < 1) {
            el.style.transform = 'scale(' + 1 + ')'
            rowBar.style.transform = 'scale(' + 1 + ')'
            flag = false
          }
        }
      })
    }
  }
  if (typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = VcSeat
  } else {
    window.vcSeat = VcSeat
  }
})()
