<template>
  <v-tooltip
    :close-delay="0"
    left
  >
    <template v-slot:activator="{ on }">
      <v-fab-transition>
        <v-btn
          v-if="visibled"
          style="position:absolute; z-index: 3; bottom: 20px; left: 200px;"
          :color="deleting ? 'red' : 'green'"
          fab
          large
          v-on="on"
          @dragover.prevent
          @mouseenter="enterEditBtn"
          @drop="$emit('drop', $event)"
          @click="$emit('click', $event)"
        >
          <v-icon
            v-if="deleting"
            :key="0"
          >delete</v-icon>
          <v-icon
            v-else
            :key="1"
          >compare_arrows</v-icon>
        </v-btn>
      </v-fab-transition>
    </template>
    {{ $t('user.account.switch') }}
  </v-tooltip>
</template>

<script lang=ts>
import { defineComponent, reactive, toRefs } from '@vue/composition-api';
import { useI18n } from '@/hooks';

interface Props {
  visibled: boolean;
  deleting: boolean;
}

export default defineComponent<Props>({
  props: {
    visibled: Boolean,
    deleting: Boolean,
  },
  setup() {
    const { $t } = useI18n();
    const data = reactive({
      fab: false,
      hoverTextOnEdit: '',
    });
    return {
      ...toRefs(data),
      enterEditBtn() {
        data.hoverTextOnEdit = $t('user.skinImportFile');
      },
      enterLinkBtn() {
        data.hoverTextOnEdit = $t('user.skinImportLink');
      },
      enterSaveBtn() {
        data.hoverTextOnEdit = $t('user.skinSave');
      },
    };
  },
});
</script>

<style>
</style>
