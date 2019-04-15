<template>
  <!--推荐选座组件 1人 2人 3人 4人 最多同时4人-->
  <div class="recommend">
    <p class="title">推荐选座</p>
    <ul class="lis clearfix">
      <li @click="getOneSeat">1人座位</li>
      <li @click="getTwoSeat">2人座位</li>
      <li @click="getThreeSeat">3人座位</li>
      <li @click="getFourSeat">4人座位</li>
    </ul>
  </div>
</template>

<script>
  import { EventBus } from '../eventbus.js'
  export default {
    name: "recommend",
    methods: {
      getOneSeat () {
        EventBus.$emit('getSeat',{num: 1})
        EventBus.$emit('changeView',{chooseOrNot: true})
      },
      getTwoSeat () {
        EventBus.$emit('getSeat',{num: 2})
        EventBus.$emit('changeView',{chooseOrNot: true})
      },
      getThreeSeat () {
        EventBus.$emit('getSeat',{num: 3})
        EventBus.$emit('changeView',{chooseOrNot: true})
      },
      getFourSeat () {
        EventBus.$emit('getSeat',{num: 4})
        EventBus.$emit('changeView',{chooseOrNot: true})
      },
    }
  }
</script>

<style scoped>
  .recommend {
    
    height: 80px;
  }
  .title {
    font-size: 16px;
  }
  
  .lis li {
    float: left;
    color: #007582;
    background-color: #eee;
    margin: 10px;
    border-radius: 3px;
    padding: 2px;

  }
</style>
