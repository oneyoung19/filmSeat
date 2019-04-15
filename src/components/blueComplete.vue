<template>
  <div class="container">
    <p>这里将来显示价格</p>
    <div>
      <a href="javascript:;" @click="choose">选好了</a>
    </div>
  </div>
</template>

<script>
import { EventBus } from '../eventbus.js'
export default {
  name: "complete",
  methods: {
    choose () {
      // 点击触发,传递信息
      EventBus.$emit('chooseOk')
    }
  }
}
</script>

<style lang="less" scoped>
.container {
  display: flex;
  margin-top: 10px;
  >p {
    color: #717171;
    font-size: 14px;
    flex: 1;
    display: flex;
    align-items: center;
  }
  >div {
    width: 90px;
    height: 32px;
    line-height: 32px;
    margin-right: 20px;
    >a {
      width: 100%;
      height: 100%;
      background-color: #00bcd4;
      text-align: center;
      border-radius: 10px;
      display: block;
    }
  }
}
</style>
