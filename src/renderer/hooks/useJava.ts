import { computed } from '@vue/composition-api';
import { useStore } from './useStore';
import { useService } from './useService';

export function useJava() {
    const { state, getters } = useStore();
    const { resolveJava, installDefaultJava: installJava, refreshLocalJava } = useService('JavaService');
    const { openInBrowser } = useService('BaseService');
    const all = computed(() => state.java.all);
    const defaultJava = computed(() => state.java.all.find(j => j.majorVersion === 8) ?? state.java.all[0]);
    const missing = computed(() => getters.missingJava);

    return {
        all,
        default: defaultJava,
        add: resolveJava,
        installDefault: installJava,
        refreshLocalJava,
        missing,
        openJavaSite: () => openInBrowser('https://www.java.com/download/'),
    };
}
