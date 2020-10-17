import { Ref, watch, onUnmounted, ref, getCurrentInstance, onBeforeUnmount } from 'vue-demi'

export interface LoadingTracking {
  queries: Ref<number>
  mutations: Ref<number>
  subscriptions: Ref<number>
}

export interface AppLoadingTracking extends LoadingTracking {
  components: Map<any, LoadingTracking>
}

export function getAppTracking () {
  const vm: any = getCurrentInstance()
  const root: any = vm.$root || vm.root
  let appTracking: AppLoadingTracking

  if (!root._apolloAppTracking) {
    // Add per Vue tracking
    appTracking = root._apolloAppTracking = {
      queries: ref(0),
      mutations: ref(0),
      subscriptions: ref(0),
      components: new Map(),
    }
  } else {
    appTracking = root._apolloAppTracking
  }

  return {
    appTracking,
  }
}

export function getCurrentTracking () {
  const vm = getCurrentInstance()
  if (!vm) {
    throw new Error('getCurrentTracking must be used during a component setup')
  }

  const { appTracking } = getAppTracking()

  let tracking: LoadingTracking

  if (!appTracking.components.has(vm)) {
    // Add per-component tracking
    appTracking.components.set(vm, tracking = {
      queries: ref(0),
      mutations: ref(0),
      subscriptions: ref(0),
    })
    // Cleanup
    onUnmounted(() => {
      appTracking.components.delete(vm)
    })
  } else {
    tracking = appTracking.components.get(vm)
  }

  return {
    appTracking,
    tracking,
  }
}

function track (loading: Ref<boolean>, type: keyof LoadingTracking) {
  const { appTracking, tracking } = getCurrentTracking()

  watch(loading, (value, oldValue) => {
    if (oldValue != null && value !== oldValue) {
      const mod = value ? 1 : -1
      tracking[type].value += mod
      appTracking[type].value += mod
    }
  }, {
    immediate: true,
  })

  onBeforeUnmount(() => {
    if (loading.value) {
      tracking[type].value--
      appTracking[type].value--
    }
  })
}

export function trackQuery (loading: Ref<boolean>) {
  track(loading, 'queries')
}

export function trackMutation (loading: Ref<boolean>) {
  track(loading, 'mutations')
}

export function trackSubscription (loading: Ref<boolean>) {
  track(loading, 'subscriptions')
}
