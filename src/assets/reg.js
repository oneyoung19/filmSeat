/* 这里是根据正则表达式进行判断检测的js函数,包括两种情况:最高权重座位是普通座位 或者 最高权重座位是情侣座位
  1.bestIsOrdinarySeat ---函数名
  str---传过来的字符串,在该文件内利用正则表达式判断该字符串
  y---最高权重座位在二维数组中的一维索引(即最高权重座位所在行)
  x---最高权重座位在二维数组中的二维索引(即最高权重座位所在列)
  ps:注意这里为保证seatNum.vue中的座位号是正向显示,所以getSeatNum中的参数是反向

  2.bestIsCoupleSeat 

  3.
*/
function bestIsOrdinarySeat (str,y,x) {
  let direction = this.regArr[y]
  let code1 = this.regArr[y][x].code
  this.addClass(code1)
  // 1.推荐一个座位
  if (str === '1') {
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code1)})
  }
  // 2.推荐两个座位
  if (str === '01') {
    // 记录最优座位和其左边座位  ---如果最优座位周围选择的是过道,直接去找下一个权重座位
    let code2 = this.regArr[y][x-1].code
    this.addClass(code2)
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code1,code2)})
  }
  if (str === '10') {
    let code2 = this.regArr[y][x+1].code
    this.addClass(code2)
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code2,code1)})
  }
  // 3.推荐三个座位
  if (str === '010') {
    let code2 = this.regArr[y][x-1].code
    let code3 = this.regArr[y][x+1].code
    this.addClass(code2,code3)
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code3,code1,code2)})
  }
  if (str === '001'||str === '221') {
    let code2 = this.regArr[y][x-1].code
    let code3 = this.regArr[y][x-2].code
    this.addClass(code2,code3)
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code1,code2,code3)})
  }
  if (str === '100'||str === '122') {
    let code2 = this.regArr[y][x+1].code
    let code3 = this.regArr[y][x+2].code
    this.addClass(code2,code3)
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code3,code2,code1)})
  }
  // 4.推荐四个座位
  if (str === '0010'||str === '2210') {
    let code2 = this.regArr[y][x-1].code
    let code3 = this.regArr[y][x-2].code
    let code4 = this.regArr[y][x+1].code
    this.addClass(code2,code3,code4)
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code4,code1,code2,code3)})
  }
  if (str === '0100'||str === '0122') {
    let code2 = this.regArr[y][x-1].code
    let code3 = this.regArr[y][x+1].code
    let code4 = this.regArr[y][x+2].code
    this.addClass(code2,code3,code4)
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code4,code3,code1,code2)})
  }
  if (str === '1000'||str === '1022'||str === '1220') {
    let code2 = this.regArr[y][x+1].code
    let code3 = this.regArr[y][x+2].code
    let code4 = this.regArr[y][x+3].code
    this.addClass(code2,code3,code4)
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code4,code3,code2,code1)})
  }
  if (str === '0001'||str === '2201'||str === '0221') {
    let code2 = this.regArr[y][x-1].code
    let code3 = this.regArr[y][x-2].code
    let code4 = this.regArr[y][x-3].code
    this.addClass(code2,code3,code4)
    EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(code1,code2,code3,code4)})
  }
}

function addClass (...args) {
  args.forEach((item) => {
    this.$refs[item][0].classList.add('yixuan')
    this.chooseCodes.push(item)
  })
}

// 注意这里args中的数要从小到大 args指的是二维索引    value指的是普通座位时是'1',情侣座位时是'8'
function addCoupleClass (direction,value,...args) {
  let arr = []
  args.forEach((item) => {
    let code = direction[item].code
    this.$refs[code][0].classList.add('yixuan')
    direction[item].flag = value
    this.chooseCodes.push(code)
    arr.unshift(code)
  })
  EventBus.$emit('getSeatNum',{seatNum: this.getSeatNum(...arr)})
}

