import type Dict from './Dict.vue';

declare module 'vue' {
  export interface GlobalComponents {
    Dict: typeof Dict;
  }
}
