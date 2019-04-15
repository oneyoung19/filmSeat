<template>
  <div id="app">
    <div class="header"></div>
    <my-seat></my-seat>
    <my-seatnum v-show="chooseOrNot"></my-seatnum>
    <blue-complete v-show="chooseOrNot"></blue-complete>
    <my-recommend v-show="!chooseOrNot"></my-recommend>
    <grey-complete v-show="!chooseOrNot"></grey-complete>
  </div>
</template>

<script>
import { EventBus } from './eventbus.js'
export default {
  name: 'App',
  data () {
    return {
      chooseOrNot: false
    }
  },
  mounted () {
    // 监听,
    EventBus.$on('changeView',(obj) => {
      this.chooseOrNot = obj.chooseOrNot
    })
  }
}
</script>

<style scoped>
/* 移动端 */
  #app {
    /* width: 100%; */
    height: 100%;
    /* min-width: 474px; */
  }
  .header {
    height: 150px;
    /* background-color: ; */
  }
</style>
