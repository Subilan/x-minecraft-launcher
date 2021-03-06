<template>
  <v-menu
    v-model="opened"
    bottom
    dark
    full-width
    max-height="300"
    :close-on-content-click="false"
    :disabled="disabled"
  >
    <template v-slot:activator="{ on }">
      <slot :on="on" />
    </template>
    <v-text-field
      v-model="filterText"
      color="green"
      append-icon="filter_list"
      :label="$t('filter')"
      solo
      dark
      hide-details
    >
      <template v-slot:prepend>
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-chip
              :color="showAlpha ? 'green': ''"
              icon
              dark
              label
              style="margin: 0px; height: 48px; border-radius: 0;"
              @click="showAlpha = !showAlpha"
            >
              <v-icon v-on="on">bug_report</v-icon>
            </v-chip>
          </template>
          {{ $t('version.showSnapshot') }}
        </v-tooltip>
      </template>
    </v-text-field>
    <minecraft-version-list
      style="max-height: 180px; background-color: #424242"
      value
      :show-time="false"
      :statuses="{}"
      :versions="versions"
      :select="selectVersion"
    />
  </v-menu>
</template>

<script lang=ts>
import { defineComponent, reactive, toRefs, computed } from '@vue/composition-api';
import { Version as MinecraftVersion } from '@xmcl/installer/minecraft';
import { useMinecraftVersions } from '@/hooks';

export default defineComponent({
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    acceptRange: {
      type: String,
      default: '[*]',
    },
  },
  setup(props, context) {
    const data = reactive({
      opened: false,
      showAlpha: false,
      filterText: '',
    });
    const { versions, statuses, refreshing } = useMinecraftVersions();
    function filterMinecraft(v: MinecraftVersion) {
      if (!data.showAlpha && v.type !== 'release') return false;
      return v.id.indexOf(data.filterText) !== -1;
    }
    function selectVersion(item: { id: string }) {
      context.emit('input', item.id);
      data.opened = false;
    }
    return {
      ...toRefs(data),
      versions: computed(() => versions.value.filter(filterMinecraft)),
      selectVersion,
    };
  },
});
</script>

<style>
.v-input__prepend-outer {
  margin-top: 0px !important;
  margin-right: 0px !important;
}
.v-input__slot {
  border-radius: 0 !important;
}
</style>
