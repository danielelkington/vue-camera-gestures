<template>
  <button @click="count ++">{{count}}</button>
</template>

<script>
export default {
  data() {
    return {
      count: 0
    };
  }
};
</script>
