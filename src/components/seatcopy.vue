<template>
  <div class="seat">
    <div class="container">
      <div class="seats">
        <ul class="lis">
          <li v-for="(item1,index1) in data" :key="index1">
            <span  v-for="(item2,index2) in item1" :key="index2" :class="[(item2.status !== 'available')?(item2.status === 'passway'?'':yishouclass): (item2.loveSeat?qinglvclass:kexuanclass)]" @click="choose(item2.code)" :ref="item2.code" :data-seatnum="[item2.rowNum,item2.columnNum]"> 
            </span>
          </li>
        </ul>
      </div>
      <!--红色虚线-->
      <div class="mid_line"></div>
      <!--左侧提示行数-->
      <div class="get_rows">
        <ul>
          <li v-for="(num,index) in rows" :key="index">{{ typeof(num)==='number'?(num+1):'' }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
  import datas from '@/assets/data3.js'
  console.log(JSON.parse(datas).data)
  import { EventBus } from '../eventbus.js'
  import AlloyFinger from 'alloyfinger'
  // 导入iscroll-zoom.js
  import IScroll from '@/assets/iscroll-zoom.js'
  // console.log(AlloyFinger)
  export default {
    name: 'seat',
    data () {
      return {
        //存储优化后的数据 ---这个数据包含过道信息
        data: null,
        //存储没有已售座位的数据
        noyishouData: null,
        // 记录下行数---不再单独记录一个ymax,而是把二维数组的完整数据的一维索引保留
        rows: [],
        // 二维数组的二维索引
        cols: null,
        // 判定座位类
        yishouclass: 'yishou',
        qinglvclass: 'qinglv',
        kexuanclass: 'kexuan',
        yixuanclass: 'yixuan',
        // 限制最多4次点击
        countNum: 0,
        // 从大到小的权重数组-- 一维数组
        weightSeats: null,
        // 默认从0开始遍历,传入一个initIndex
        initIndex: 0,
        //将传过来的obj的属性值num也挂载在vue上, num指的是推荐座位按钮具体的数据(比如是1,2,3,4)
        num: null,
        // 存储找到的推荐座位---根据点击的推荐座位数量,数组长度不同----这个containArr好像没有用到过
        // containArr: [],
        // 存储选座座位时的所在行数   choose()保存 chooseOk使用 
        chooseRows: [],
        // 存储选座座位的code 为了chooseOk中直接使用
        chooseCodes: [],
        // 为了'不能留有空位'消息的多次触发,设置一个boolean值用于判断---为了判断是否单选情侣座,设置coupleBool
        bool: false,
        coupleBool: false,
        // 因为推荐座位是可以跨过道的,所以要在resultArr中添加对象前,对resultArr进行一个深拷贝,下面数组是为推荐算法中正则表达式判断准备的---不包含过道
        // 为什么推荐座位要舍弃过道? 假如推荐正则是0010,而如果使用data数组,匹配正则可能会是0undefined010导致匹配错误
        regArr: null
      }
    },
    created () {
      // 在进行handler之后,this.data中存储的会是所有规整的数据
      this.handler()
      //fixme:forEach没有返回值,暂时考虑使用深拷贝复制没有已售座位的数据
      //todo:深拷贝得到所有数据,再将已售的数据进行剔除---接下来就可以进行直接遍历找到最大权重的数据
      this.noyishouData = this.deepCopy(this.data)
      this.noyishouData.forEach((item1,index1) => {
        //找到数据中的属性status不等于'available'的数据,剔除它---另外这里也要删除过道数据
        item1.forEach((item2,index2) => {
          if (item2.status !== 'available' || item2.code === '0001') {
            item1.splice(index2,1)
          }
        })
      })
      console.log('noyishouData----')
      console.log(this.noyishouData)
      console.log('noyishouData----')
      // 清除掉已售数据后,将剩余的座位按照权重排序,存储在weightSeats中
      this.weightSeats = this.sortWeight(this.noyishouData)
      console.log('weightSeats----')
      console.log(this.weightSeats)
      console.log('weightSeats----')
    },
    mounted () {
      this.makeZoom()
      // 监听eventbus,根据名,来选择座位个数
      EventBus.$on('getSeat',(obj) =>{
        //将传过来的obj的属性值num也挂载在vue上
        this.num = obj.num
        console.log('检测getSeat----')
        console.log(this.num)
        console.log('检测getSeat----')
        //  选择一个最优座位  ---将原先这里的getBestSeat改为judge
        this.judge(this.weightSeats,this.initIndex,this.num)
      })
      // 监听'选好了'事件
      EventBus.$on('chooseOk',() => {
        this.chooseOk()
      })
      // FIXME:监听'清除已选状态'事件 ---seatnum.vue   ---初始化initIndex
      EventBus.$on('destroyYiXuan',(obj) => {
        // 获取code
        let code = obj.code
        this.$refs[code][0].classList.remove('yixuan')
        // 将this.countNum--
        this.countNum--
        // 初始化initIndex
        this.initIndex = 0
        // 调用自选与取消座位号之间的公共函数---cancelSeat
        this.cancelSeat(code)
      })
    },
    methods: {
      // 1.处理数据---排序,设置权重,创建过道,深拷贝,权重排序
      handler () {
        //  处理 datas  把属性data中的cinemaSeatpicDataList(对象)的属性data3---0000000000000001对应的数组中的对象  ---data4 15010
        let arr = JSON.parse(datas).data.cinemaSeatpicDataList['0000000000000001']
        console.log(arr)
        //  得到数组arr,应该遍历,根据y的最大值来创建数组容器个数,再遍历根据x相同时,扔进同一个数组 item.yCoord
        let ylist = []
        let xlist = []
        arr.forEach((item) => {
          ylist.push(Number(item.yCoord))
          xlist.push(Number(item.xCoord))
        })
        console.log(ylist,xlist)
        //  得到y的最大值 x的最大值
        let ymax = Math.max(...ylist)
        let xmax = Math.max(...xlist)
        console.log('xmax:'+ xmax)
        // this.rows = ymax
        // this.cols = xmax
        //  定义总容器数组,根据ymax创建数组,并判断x
        let resultArr = []
        for (let i = 0;i < ymax;i++) {
          resultArr[i] = []
          //  遍历arr , 其中的 y 如果等于 i,直接把当前项push  arr是总的一维数组
          for (let j = 0;j < arr.length;j++) {
            // 为规则2做标记:已售3 可选0 情侣2 ---后面已选是1
            if (arr[j].status !=='available') {
              arr[j].flag = '3'
            } else if (arr[j].loveSeat) {
              arr[j].flag = '2'
            } else {
              arr[j].flag = '0'
            }
            if (Number(arr[j].yCoord) === (i+1)) {
              resultArr[i].push(arr[j])
            }
          }
        }
        // 由于x顺序不规则,所以要将x重新按照从小到大的顺序进行排列---这一步完成之后就是规整的数据了
        resultArr.forEach((item) => {
          for (let n = 0;n < item.length; n++) {
            this.bubbleSort(item)
          }
        })
        console.log('resultArr')
        console.log(resultArr)
        //增加x权重 ---设置rows是为了测试了下data4
        resultArr.forEach((item,index) => {
          this.setXWeight(item)
          if (item.length===0) {
            index+='空位'
          }
          this.rows.push(index)
        })
        //增加y权重
        this.setYWeight(resultArr)
        //计算权重和,并设置给每个对象的新属性totalWeight
        resultArr.forEach((item1,index1) => {
          item1.forEach((item2,index2) => {
            item2.totalWeight = item2.xnum + item2.ynum
          })
        })
        this.regArr = this.deepCopy(resultArr)
        console.log('regArr')
        console.log(this.regArr)
        // 注意这里,上面与下面,我是先设置的权重,然后再去插入过道信息 ,所以不用再考虑过道会有权重的问题
        // 排完顺序之后,判断每一项xCoord与其索引之间的差值是否大于1,如果大于1 ,插入一个对象 i是行 j是列  ----设置纵向过道走廊
        for (let i = 0;i < resultArr.length;i++) {
          for (let j = 0;j < resultArr[i].length;j++) {
            if ( Number(resultArr[i][j].xCoord) - j !== 1) {
              // console.log(j)
              let passObj = this.createPassWay(i,j)
              resultArr[i].splice(j,0,passObj)
            }
          }
        }
        // 得到最后要使用的数据
        this.data = resultArr
        console.log(resultArr)
      },
      // 排序
      bubbleSort (arr) {
        let sign
        for (let i=0; i<arr.length-1; i++) {
          sign = false
          for (let j=0; j<arr.length-i-1; j++){
            if (Number(arr[j].xCoord) > (Number(arr[j+1].xCoord))) {
              let oldVal = arr[j]
              arr[j] = arr[j+1]
              arr[j+1] = oldVal
              sign = true
            }
          }
          if (!sign) break
        }
      },
      // 设置x权重函数
      setXWeight (arr) {
        for (let i = 0;i < arr.length;i++) {
          if (i <= (arr.length/2)) {
            arr[i].xnum = i
          }else {
            arr[i].xnum = arr.length-1-i
          }
        }
        return arr
      },
      // 设置y权重函数
      setYWeight (arr) {
        for (let i = 0; i < arr.length;i++) {
          for (let j = 0; j < arr[i].length;j++) {
            if (i <= (arr.length/2)) {
              arr[i][j].ynum = i
            }else {
              arr[i][j].ynum = arr.length-1-i
            }
          }
        }
        return arr
      },
      // 创建过道
      createPassWay (i,j) {
        let passWay = {}
        passWay.status = 'passway'
        passWay.xCoord = j + 1
        passWay.yCoord = i + 1
        passWay.code = '0001'
        return passWay
      },
      // 深拷贝
      deepCopy (obj) {
        let objClone = Array.isArray(obj)?[]:{};
        if(obj && typeof obj ==="object"){
          for(let key in obj){
            if(obj.hasOwnProperty(key)){
              //判断obj子元素是否为对象，如果是，递归复制
              if(obj[key]&&typeof obj[key] ==="object"){
                objClone[key] = this.deepCopy(obj[key]);
              }else{
                //如果不是，简单复制
                objClone[key] = obj[key];
              }
            }
          }
        }
        return objClone;
      },
      // 权重排序--arr指的是二维数组
      sortWeight (arr) {
        let resultArr = []
        for (let i = arr.length-1;i >= 0;i--) {
          for (let j = arr[i].length-1;j >=0;j--) {
            resultArr.push(arr[i][j])
          }
        }
        resultArr.sort(function (a,b) {
          return b.totalWeight - a.totalWeight
        })
        return resultArr
      },
      // 2.选择座位---用户自选
      choose (code) {
        // 判断code是否是过道的code,如果是'0001',直接return
        if (code === '0001') {
          return
        }
        // FIXME:修改处: 因为权重数组的initIndex不断增长,会导致,每次递归判断时的值不断增加,所以要在点击取消(还有下面的推荐按钮也要初始话seatnum.vue)推荐选中座位时,初始化initIndex
        this.initIndex = 0
        console.log(this.$refs[code])
        // 触发eventbus,修改 视图
        EventBus.$emit('changeView',{chooseOrNot: true})
        let target = this.$refs[code][0].classList
        //得到的seatnum是个字符串,将其转为数组 --- 为了方便seatnum.vue在向seat.vue传递信息时,方便seat.vue修改'yixuan'状态,将当前code也push进去
        let seatNum = this.$refs[code][0].dataset.seatnum.split(',')
        seatNum.push(code)
        // FIXME:定义一个空数组,将seatNum存入 --- 为了跟'推荐座位'保持一致,需要eventBus传递的是二维数组,因为推荐座位可能有多个
        // let seatNum = []
        // seatNum.push(seatArr)

        // 判断:如果已经有'yishou'的类名,则直接return
        if (target.contains('yishou')) {
          return
        }
        // 如果点击的不是已售的,并且点击的不是已选的,则判断当前是否大于等于4
        if (this.countNum >= 4 && !target.contains('yixuan')) {
          console.log('最多购买4个座位')
          return
        }
        if (target.contains('yixuan')) {
          target.remove('yixuan')
          EventBus.$emit('reduceSeatNum',{
            seatNum
          })
          this.countNum--
          // 取消已选状态时,判断countNum是否为0,如果等于0,则通知app.vue,更新视图
          if (this.countNum === 0) {
            EventBus.$emit('changeView',{chooseOrNot: false})
          }
          // 点击取消时,还应该把之前设置的flag='1',重新设置为'0',还要把bool设置为false
          this.cancelSeat(code)
          // 点击取消时,要把之前push进chooseCodes中的code再删除掉
          for (let i = 0;i < this.chooseCodes.length;i++) {
            if (this.chooseCodes[i] === code) {
              this.chooseCodes.splice(i,1)
            }
          }
          console.log(this.chooseCodes)
          // this.bool = false
        }else{
          // 在添加已选状态时,为了这个可以联动chooseOk,要根据code判断数组中具体的元素,给其添加flag='1',另外为了chooseOk中可以判断,在此也将用户选中的所在行数也保存起来 --- 此外,将当前code直接push进chooseCodes中
          this.regArr.forEach((item1,index1) => {
            item1.forEach((item2) => {
              if (item2.code === code) {
                // 取消的时候是根据是否情侣来设置flag是0或1,那么添加的时候自然也是要设置flag为1或者8
                this.$refs[code][0].classList.contains('qinglv')?(item2.flag = '9'):(item2.flag = '1')
                this.chooseRows.push(index1)
                console.log('push---')
                console.log(this.chooseRows)
                console.log('push---')
              }
            })
          })
          this.chooseCodes.push(code)
          console.log(this.chooseCodes)
          target.add('yixuan')
          // 选中时,通过data-seatnum 取出当前座位号
          // console.log(seatNum[0])
          // console.log(seatNum[1])
          // 将数组seatnum传递给eventbus
          EventBus.$emit('getSeatNum',{
            seatNum
          })
          this.countNum++
        }
      },
      // 3.取消选座---用户自选+系统推荐
      cancelSeat (code) {
        this.regArr.forEach((item1,index1) => {
            item1.forEach((item2) => {
              if (item2.code === code) {
                // FIXME:item2.flag = '0'  ---这里要注意,因为推荐选座也会走这个逻辑,不能直接再将flag设置为'0',因为可能点击的会是情侣座
                this.$refs[code][0].classList.contains('qinglv')?(item2.flag = '2'):(item2.flag = '0')
                // this.chooseRows.push(index1)
                // 当用户自选点击取消时,从chooseRows中,删除一个等于code的元素
                for (let i = 0;i < this.chooseRows.length;i++) {
                  if (this.chooseRows[i] === index1) {
                    this.chooseRows.splice(i,1)
                    break
                  }
                }
                console.log('pull')
                console.log(this.chooseRows)
              }
            })
          })
      },
      //fixme:移动端缩放
      makeZoom () {
        let myScroll = new IScroll('.seats',{
          zoom: true,
          zoomMax: 1.5,
          scrollX: true,
          scrollY: true,
          mouseWheel: true,
          wheelAction: 'zoom'
        })
      },
      // 选择最优座位
      /*getBestSeat () {
        遍历数组,筛选最大权重的座位  ---拿到最大权重的对象中的code属性,根据这个属性给页面中的对应元素设置背景图,排除掉已售,计算属性
        console.log('选择最优座位')
        fixme:如果用户自选之后,点击推荐  (实际上自选与推荐是不能同时发生的)
        得到从大到小的权重数组-- 一维数组 ---不应该在每次点击都去重新排序权重,而是在得到noyishouData之后就进行
        this.weightSeats = this.sortWeight(this.noyishouData)
        
        每次点击推荐时,都把containArr的元素来清除一下
        this.containArr = []
        默认从0开始遍历,传入一个initIndex
        console.log(this.weightSeats)
        this.judge(this.weightSeats,this.initIndex,this.num)
        
      },*/
      
      // 4.递归判断 是否最大权重的座位周围的个数满足推荐的座位数  参数是权重数组的第一项        判断this.data
      judge (weightSeats,index,num) {
        // 每次递归开始前,将chooseRows中的内容清空
        this.chooseRows = []
        // 将chooseCodes中的内容也清空
        this.chooseCodes = []
        // FIXME: 如果传过来的index的值,大于等于了weightSeats.length,则表示无可推荐座位,直接return ---整个推荐算法后续可以考虑优化
        if (index >= weightSeats.length) {
          return console.log('无可推荐座位')
        }
        let x = null
        let y = null
        // 找到best在this.regArr中的第二重数组中的位置  regArr是原始二维数组,包括已售座位,不包含过道,这里的x,y是索引
        for (let i = 0;i < this.regArr.length-1;i++) {
          for (let j = 0;j < this.regArr[i].length;j++) {
            if (this.regArr[i][j].code === weightSeats[index].code) {
              y = i
              x = j
              console.log(y + '---' + x + '---' + index)
            }
          }
        }
        // FIXME:找到最优座位时,为了'选好了'按钮,记录其所在行,将其保存在this.chooseRows中 ---根据num的值确定push进chooseRows的次数
        for (let i = 0;i <= num;i++) {
          this.chooseRows.push(y)
        }
        // 给当前最优座位best(不是情侣座)加上 flag:'1', 因为weightSeats是权重数组,而我们下面要操作是原始二维数组,所以不能直接给weightSeats[index]设置flag
        if (this.regArr[y][x].flag !== '2') {
          // TODO:下面这句代码不要删除,即使它在addClass里也给x添加了flag,因为下面的正则表达式的判断是依靠这句代码的
          this.regArr[y][x].flag = '1'
          // 获取最优座位所在行拼接的flag字符串--这串代码需要在给最优座位标记之后再执行
          let str = ''
          for (let i = 0;i < this.regArr[y].length;i++) {
            str += this.regArr[y][i].flag
          }
          console.log(str)
          /* 在这里时,可选 最高 情侣 已售 四种座位的flag已经全部添加完毕,而且知道当前最优座位的索引,所以要在最优座位的所在行中,从左至右将flag拼接
            利用正则表达式判断,
          */
          switch (num) {
            case 1:
            this.countNum = 1
            // 1.直接拿最优座位即可,无需正则表达式,拿到当前对应数据中的属性code,设置code,
            let code = this.regArr[y][x].code
            this.$refs[code][0].classList.add('yixuan')
            this.chooseCodes.push(code)
            console.log('触发---')
            console.log(this.getSeatNum(code))
            console.log('触发---')
            EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code)}) 
            break
            case 2:
            this.countNum = 2
            // 2.两种情况,10 或者 01, reg=/01/ /10/
            if ((/01/).test(str)) {
              // 记录最优座位和其左边座位  ---如果最优座位周围选择的是过道,直接去找下一个权重座位
              this.addClass(this.regArr[y],'1',x-1,x)
              break
            }
            if ((/10/).test(str)) {
              // 记录最优座位和其左边座位
              this.addClass(this.regArr[y],'1',x,x+1)
              break
            } 
            // 如果到这里,说明当前最高权重座位不符合情况,去寻找第二权重高的座位
            this.initIndex++
            this.judge(this.weightSeats,this.initIndex,this.num)
            break
            case 3:
            this.countNum = 3
            if ((/010/).test(str)) {
              this.addClass(this.regArr[y],'1',x-1,x,x+1)
              break
            }
            if ((/001|221/).test(str)) {
              this.addClass(this.regArr[y],'1',x-2,x-1,x)
              break
            }
            if ((/100|122/).test(str)) {
              this.addClass(this.regArr[y],'1',x,x+1,x+2)
              break
            }
            this.initIndex++
            this.judge(this.weightSeats,this.initIndex,this.num)
            break
            case 4:
            this.countNum = 4
            if ((/0010|2210/).test(str)) {
              this.addClass(this.regArr[y],'1',x-2,x-1,x,x+1)
              break
            }
            if ((/0100|0122/).test(str)) {
              this.addClass(this.regArr[y],'1',x-1,x,x+1,x+2)
              break
            }
            if ((/1000|1022|1220/).test(str)) {
              this.addClass(this.regArr[y],'1',x,x+1,x+2,x+3)
              break
            }
            if ((/0001|2201|0221/).test(str)) {
              this.addClass(this.regArr[y],'1',x-3,x-2,x-1,x)
              break
            }
            this.initIndex++
            this.judge(this.weightSeats,this.initIndex,this.num)
            break
          }
        }
        // 如果最优座位是情侣座的话,
        if (this.regArr[y][x].flag === '2') {
          console.log('最优座位----------是情侣座'+`${num}`)
          this.regArr[y][x].flag = '9'
          // 获取最优座位所在行拼接的flag字符串--这串代码需要在给最优座位标记之后再执行,-------后面这部分要考虑提取为公共的
          let str = ''
          for (let i = 0;i < this.regArr[y].length;i++) {
            str += this.regArr[y][i].flag
          }
          console.log(str)
          switch (num) {
            case 1:
            // 因为情侣座位不允许只选一个,所以直接去判断下一个权重的座位
            this.initIndex++
            this.regArr[y][x].flag = '2'
            this.judge(this.weightSeats,this.initIndex,this.num)
            break
            case 2:
            this.countNum = 2
            // 这种情况的话判断 92 29 不过要注意的是2922这种只能是29,不能92 ---先判断29,再判断2922与2292
            if ((/29/).test(str)) {
              if ((/2292/).test(str)) {
                this.addClass(this.regArr[y],'9',x,x+1)
                // 为了可以清除给当前code添加过的flag,将当前code保存在
                // this.regArr[y][x].flag = '2'
                break
              } else if ((/2822/).test(str)) {
                console.log('最优座位----------29')
                // 记录最优座位和其左边座位
                this.addClass(this.regArr[y],'9',x-1,x)
                // 正则判断结束后,将情侣座的状态改为 '2'
                // this.regArr[y][x].flag = '2'
                break
              }
            }
            if ((/92/).test(str)) {
              console.log('最优座位----------92')
              // 记录最优座位和其左边座位
              this.addClass(this.regArr[y],'9',x,x+1)
              // this.regArr[y][x].flag = '2'
              break
            }
            this.initIndex++
            this.judge(this.weightSeats,this.initIndex,this.num)
            break
            case 3:
            this.countNum = 3
            // fixme: 这里与之前的
            if ((/920/).test(str)) {
              this.addClass(this.regArr[y],'9',x,x+1,x+2)
              break
            }
            if ((/092|290/).test(str)) {
              this.addClass(this.regArr[y],'9',x-1,x,x+1)
              break
            }
            if ((/029/).test(str)) {
              this.addClass(this.regArr[y],'9',x-2,x-1,x)
              break
            }
            this.initIndex++
            this.judge(this.weightSeats,this.initIndex,this.num)
            break
            case 4:
            this.countNum = 4
            if ((/0920|2922|2900/).test(str)) {
              this.addClass(this.regArr[y],'9',x-1,x,x+1,x+2)
            break
            }
            if ((/0092|2292|0290/).test(str)) {
              this.addClass(this.regArr[y],'9',x-2,x-1,x,x+1)
              break
            }
            if ((/9200|9222/).test(str)) {
              this.addClass(this.regArr[y],'9',x,x+1,x+2,x+3)
            break
            }
            if ((/0029|2229/).test(str)) {
              this.addClass(this.regArr[y],'9',x-3,x-2,x-1,x)
              break
            }
            this.initIndex++
            this.judge(this.weightSeats,this.initIndex,this.num)
            break
          }
        }
      },
      // 推荐座位传递座位号 ---调用该方法,参数是code,每个座位的座位号都是个数组,然后将这些数组push进一个空数组中,得到二维数组
      getSeatNum (...args) {
        console.log(args)
        let seatArr = []
        args.forEach((item) => {
          const seatNum = this.$refs[item][0].dataset.seatnum.split(',')
          seatNum.push(item)
          seatArr.unshift(seatNum)
        })
        return seatArr
      },
      addClass (direction,value,...args) {
        let arr = []
        args.forEach((item) => {
          let code = direction[item].code
          this.$refs[code][0].classList.add('yixuan')
          direction[item].flag = value
          this.chooseCodes.push(code)
          arr.unshift(code)
        })
        EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(...arr)})
      },
      // 5.点击选好了之后,触发的chooseOk()
      chooseOk () {
        // 修改处:每次点击之前,只要把bool改为false即可---加上coupleBool
        this.bool = false
        this.coupleBool = false
        console.log('chooseCodes')
        console.log(this.chooseCodes)
        console.log(this.chooseRows)
        /* 用户可能选1,2,3,4次.也就是说页面上拥有状态1的会是1,2,3,4个座位 不过在此之前要给用户自选选座点击事件时添加已选状态,choose()
          用户自选座位所在行数被保存在了chooseRows,进行一个数组去重
        */
        if (this.chooseRows.length === 0) {
          return
        }
        let rows = [...new Set(this.chooseRows)]
        console.log(rows)
        // FIXME:其实下面这部分是可以优化的,只有'自选'情况需要判断,'推荐'因为不可能中间留空,是无需考虑的---不,即使是推荐,用户也可能取消选中某个
        for (let i = 0;i < rows.length;i++) {
          let str = ''
          this.regArr[rows[i]].forEach((item) => {
            str += item.flag
          })
          console.log(str)
          if ((/10[1,2,3,9]|[1,2,3,9]01/).test(str)) {
            // 为了防止多次触发,设置一个bool值
            this.bool = true
          }
          // 判断情侣座是否单选
          if ((/9/).test(str)&&!(/99/).test(str)||(/92[0,1,3,9]|[0,1,3,9]29/).test(str)) {
            this.coupleBool = true
          }
        }
        //情侣座不允许单选
        if (this.coupleBool) {
          return console.log('请不要单选情侣座')
        }
        if (this.bool) {
          return console.log('座位之间不能留空一个座位')
        }
        // TODO:到达这里说明,用户自选选座符合规则; 推荐座位也要走这里的逻辑,这里要做的就是把已选座位的code拿到---已被存储在chooseCodes中
      }
    },
  }
</script>

<style scoped>
 .seat {
   width: 100%;
   height: 700px;
   background-color: #ccc;
   display: flex;
   justify-content: center;
   align-items: center;
   overflow: hidden;
 }
 .container {
   position: relative;

 }
 .lis li {
   height: 30px;
 }
 
 .lis span {
   float: left;
   width: 30px;
   height: 30px;
 }
 .lis span img {
   width: 100%;
   height: 100%;
 }
 .mid_line {
   position: absolute;
   height: 100%;
   width: 0;
   top: -3px;
   left: 50%;
   border-right: 1px dashed rgb(226, 43, 43);
   z-index: 99;
 }
 .get_rows {
   position: absolute;
   top: -20px;
   left: -10px;
   background-color: rgba(0,0,0,0.5);
   border-radius: 10px;
 }
 .get_rows ul {
  margin-top: 20px;
  margin-bottom: 20px;
 }
 .get_rows li {
   width: 20px;
   height: 30px;
   color: #fff;
   font-size: 12px;
   text-align: center;
   line-height: 30px;
 }
 .kexuan {
   background-image: url('../assets/images/kexuan_icon.png');
   background-size: 30px 30px;
 }
 .qinglv {
   background-image: url('../assets/images/qinglv_icon.png');
   background-size: 30px 30px;
 }
 .yishou {
   background-image: url('../assets/images/yishou_icon.png');
   background-size: 30px 30px;
 }
 .yixuan {
   background-image: url('../assets/images/yixuan_icon.png');
   background-size: 30px 30px;
 }
  /* iscroll */
 .seats {
   /* -- Attention: This line is extremely important in chrome 55+! -- */
   touch-action: none;
 }
</style>
