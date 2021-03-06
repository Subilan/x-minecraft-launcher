import { EMPTY_GAME_PROFILE } from '@universal/store/modules/user';
import { UserProfile } from '@universal/store/modules/user.schema';
import { LoginException } from '@universal/util/exception';
import { computed, onMounted, reactive, Ref, toRefs, watch } from '@vue/composition-api';
import { GameProfile } from '@xmcl/user';
import { useI18n } from './useI18n';
import { useBusy } from './useSemaphore';
import { useServiceOnly } from './useService';
import { useStore } from './useStore';

export function useGameProfile(gameProfile: Ref<GameProfile>) {
    const name = computed(() => gameProfile.value.name);
    const id = computed(() => gameProfile.value.id);
    return { name, id };
}

export function useUserProfile(userProfile: Ref<UserProfile>) {
    const { state } = useStore();
    const profileService = computed(() => ({ ...state.user.profileServices[userProfile.value.profileService], name: userProfile.value.profileService }));
    const authService = computed(() => ({ ...state.user.authServices[userProfile.value.authService], name: userProfile.value.authService }));
    const accessToken = computed(() => userProfile.value.accessToken);
    const username = computed(() => userProfile.value.username);
    const profiles = computed(() => userProfile.value.profiles);
    const id = computed(() => userProfile.value.id);
    return {
        profileService,
        authService,
        accessToken,
        username,
        profiles,
        id,
    };
}

export function useUserProfileStatus(userProfile: Ref<UserProfile>) {
    const accessTokenValid = computed(() => userProfile.value.accessToken !== '');
    const offline = computed(() => userProfile.value.authService === 'offline');
    const isServiceCompatible = computed(() => userProfile.value.authService === userProfile.value.profileService);
    return {
        accessTokenValid,
        offline,
        isServiceCompatible,
        logined: accessTokenValid,
    };
}


const NO_USER_PROFILE: UserProfile = Object.freeze({
    selectedProfile: '',
    accessToken: '',
    authService: '',
    profileService: '',
    profiles: {},
    id: '',
    username: '',
});
const NO_GAME_PROFILE: GameProfile = Object.freeze({
    id: '',
    name: '',
});

export function useSelectedUser() {
    const { state } = useStore();
    const userId = computed(() => state.user.selectedUser.id);
    const profileId = computed(() => state.user.selectedUser.profile);
    return { userId, profileId };
}

export function useProfileId(userId: Ref<string>, profileId: Ref<string>) {
    const { state } = useStore();
    const userProfile = computed(() => state.user.users[userId.value] ?? NO_USER_PROFILE);
    const gameProfile = computed(() => userProfile.value.profiles[profileId.value] ?? NO_GAME_PROFILE);
    return { userProfile, gameProfile };
}

export function useCurrentUser() {
    const { state } = useStore();
    const { userId, profileId } = useSelectedUser();
    const userProfile: Ref<UserProfile> = computed(() => state.user.users[userId.value] ?? NO_USER_PROFILE);
    const gameProfile: Ref<GameProfile> = computed(() => userProfile.value.profiles[profileId.value] ?? NO_GAME_PROFILE);

    /**
     * selected profile id
     */
    return {
        userId,
        profileId,
        userProfile,
        gameProfile,
        ...useServiceOnly('UserService', 'refreshStatus', 'switchUserProfile', 'logout', 'refreshSkin'),
    };
}


export function useUserSkin(userId: Ref<string>, gameProfileId: Ref<string>) {
    const { state } = useStore();
    const { refreshSkin, uploadSkin, saveSkin } = useServiceOnly('UserService', 'refreshSkin', 'uploadSkin', 'saveSkin');
    const data = reactive({
        url: '',
        slim: false,
        loading: false,
    });
    const gameProfile = computed(() => state.user.users[userId.value]?.profiles[gameProfileId.value] || EMPTY_GAME_PROFILE);
    function reset() {
        data.url = gameProfile.value.textures.SKIN.url;
        data.slim = gameProfile.value.textures.SKIN.metadata ? gameProfile.value.textures.SKIN.metadata.model === 'slim' : false;
    }
    const modified = computed(() => data.url !== gameProfile.value.textures.SKIN.url
        || data.slim !== (gameProfile.value.textures.SKIN.metadata ? gameProfile.value.textures.SKIN.metadata.model === 'slim' : false));
    async function save() {
        data.loading = true;
        try {
            await uploadSkin({ url: data.url, slim: data.slim });
        } finally {
            data.loading = false;
        }
    }
    onMounted(() => {
        refreshSkin({ userId: userId.value, gameProfileId: gameProfileId.value }).then(() => reset());
        reset();
    });
    function refresh() {
        refreshSkin({ userId: userId.value, gameProfileId: gameProfileId.value, force: true });
    }
    watch([userId, gameProfileId], () => {
        if (userId.value && gameProfileId.value) {
            refreshSkin({ userId: userId.value, gameProfileId: gameProfileId.value }).then(() => reset());
        }
        reset();
    });
    return {
        ...toRefs(data),
        refreshing: useBusy('refreshSkin'),
        refresh,
        save,
        reset,
        modified,

        exportTo: saveSkin,
    };
}

export function useUserServices() {
    const { state } = useStore();
    const authServices = computed(() => ['offline', ...Object.keys(state.user.authServices)]);
    const profileServices = computed(() => Object.keys(state.user.profileServices));
    return {
        authServices,
        profileServices,
    };
}

export function useUsers() {
    const { state } = useStore();
    const users = computed(() => Object.values(state.user.users));
    return { users };
}

export function useSwitchUser() {
    const { userId, profileId } = useSelectedUser();

    const data = reactive({
        profileId: profileId.value,
        userId: userId.value,
    });
    const modified = computed(() => data.profileId !== profileId.value || data.userId !== userId.value);
    const { switchUserProfile, removeUserProfile } = useServiceOnly('UserService', 'switchUserProfile', 'removeUserProfile');
    function commit() {
        return switchUserProfile({ profileId: data.profileId, userId: data.userId });
    }
    function select(profileId: string, userId: string) {
        data.profileId = profileId;
        data.userId = userId;
    }
    function remove(userId: string) {
        removeUserProfile(userId);
    }
    watch([profileId, userId], () => {
        data.profileId = profileId.value;
        data.userId = userId.value;
    });
    return {
        selectedUserId: userId,
        selectedProfileId: profileId,
        select,
        remove,
        commit,
        modified,
        ...toRefs(data),
    };
}

export function useLogin() {
    const { state, commit } = useStore();
    const authServices = computed(() => ['offline', ...Object.keys(state.user.authServices)]);
    const profileServices = computed(() => Object.keys(state.user.profileServices));
    const { userId, profileId, userProfile } = useCurrentUser();
    const { username, authService, profileService } = useUserProfile(userProfile);
    const { logined } = useUserProfileStatus(userProfile);
    // const { authService, profileService, profileId, id } = useCurrentUser();
    const { login } = useServiceOnly('UserService', 'login', 'switchUserProfile');
    function remove(userId: string) {
        commit('userProfileRemove', userId);
    }
    const data = reactive({
        logining: false,
        username: '',
        password: '',
        authService: authService.value.name || 'mojang',
        profileService: profileService.value.name || 'mojang',
        selectProfile: true,
    });
    async function _login() {
        data.logining = true;
        await login(data).finally(() => { data.logining = false; });
    }
    function reset() {
        data.logining = false;
        data.username = username.value;
        data.password = '';
        data.authService = authService.value.name || 'mojang';
        data.profileService = profileService.value.name || 'mojang';
    }
    onMounted(() => {
        reset();
    });
    return {
        ...toRefs(data),
        logined,
        login: _login,
        reset,
        remove,

        selectedProfile: profileId,
        selectedUser: userId,

        authServices,
        profileServices,
    };
}

export function useLoginValidation(isOffline: Ref<boolean>) {
    const { $t } = useI18n();
    const nameRules = [(v: unknown) => !!v || $t('user.requireUsername')];
    const emailRules = [
        (v: unknown) => !!v || $t('user.requireEmail'),
        (v: string) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v)
            || $t('user.illegalEmail'),
    ];
    const passwordRules = [(v: unknown) => !!v || $t('user.requirePassword')];
    const usernameRules = computed(() => (isOffline.value
        ? nameRules
        : emailRules));
    const data = reactive({
        usernameErrors: [] as string[],
        passwordErrors: [] as string[],
    });
    function reset() {
        data.usernameErrors = [];
        data.passwordErrors = [];
    }
    function handleError(e: any) {
        const err = e as LoginException;
        if (err.type === 'loginInternetNotConnected') {
            // TODO: handle this case
        } else if (err.type === 'loginInvalidCredentials') {
            const msg = $t('user.invalidCredentials');
            data.usernameErrors = [msg];
            data.passwordErrors = [msg];
        } else {
            data.usernameErrors = [e.message ?? e.errorMessage];
            console.error(e);
        }
    }
    return {
        ...toRefs(data),
        usernameRules,
        passwordRules,
        reset,
        handleError,
    };
}

export function useUserSecurityStatus() {
    const { state } = useStore();
    const security = computed(() => (state.user.users[state.user.selectedUser.id]?.authService === 'mojang' ? state.user.mojangSecurity : true));

    return {
        security,
        refreshing: useBusy('checkLocation'),
    };
}

export function useUserSecurity() {
    interface MojangChallenge {
        readonly answer: {
            id: number;
            answer: string;
        };
        readonly question: {
            id: number;
            question: string;
        };
    }

    const { security, refreshing } = useUserSecurityStatus();
    const { getChallenges, checkLocation, submitChallenges } = useServiceOnly('UserService', 'getChallenges', 'checkLocation', 'submitChallenges');
    const data = reactive({
        loading: false,
        challenges: [] as MojangChallenge[],
        error: undefined as any,
    });
    async function check() {
        try {
            if (data.loading) return;
            if (data.challenges.length > 0) return;
            data.loading = true;
            let sec = await checkLocation();
            if (sec) return;
            try {
                let challenges = await getChallenges();
                data.challenges = challenges.map(c => ({ question: c.question, answer: { id: c.answer.id, answer: '' } }));
            } catch (e) {
                data.error = e;
            }
        } finally {
            data.loading = false;
        }
    }
    async function submit() {
        data.loading = true;
        try {
            await submitChallenges(data.challenges.map(c => c.answer));
        } catch (e) {
            data.error = e;
        } finally {
            data.loading = false;
        }
    }
    return {
        ...toRefs(data),
        refreshing,
        security,
        check,
        submit,
    };
}
