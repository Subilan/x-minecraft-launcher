import { exists, FileStateWatcher } from '@main/util/fs';
import { requireString } from '@universal/util/assert';
import { compareRelease, compareSnapshot, isReleaseVersion, isSnapshotPreview } from '@universal/util/version';
import { Frame, parse, stringify } from '@xmcl/gamesetting';
import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';
import Service, { MutationTrigger, Singleton } from './Service';

export interface EditGameSettingOptions extends Frame {
}

/**
 * The service for game setting
 */
export default class InstanceGameSettingService extends Service {
    private watcher = new FileStateWatcher(false, () => true);

    async dispose() {
        this.watcher.close();
    }

    @Singleton()
    async loadInstanceGameSettings(path: string) {
        requireString(path);

        if (!this.watcher.watch(path) && !this.watcher.getStateAndReset()) {
            return;
        }

        try {
            let optionsPath = join(path, 'options.txt');
            let result = await readFile(optionsPath, 'utf-8').then(parse);
            this.commit('instanceCache', { gamesettings: result });
        } catch (e) {
            if (!e.message.startsWith('ENOENT:')) {
                this.warn(`An error ocurrs during parse game options of ${path}.`);
                this.warn(e);
            }
            this.commit('instanceCache', { gamesettings: { resourcePacks: [] } });
        }
    }


    @MutationTrigger('instanceGameSettings')
    async saveInstanceGameSetting() {
        let optionsTxtPath = join(this.state.instance.path, 'options.txt');
        if (await exists(optionsTxtPath)) {
            let buf = await readFile(optionsTxtPath);
            let content = parse(buf.toString());
            for (let [key, value] of Object.entries(this.state.instance.settings)) {
                if (key in content) {
                    (content as any)[key] = value;
                }
            }
            await writeFile(optionsTxtPath, stringify(content));
        } else {
            await writeFile(optionsTxtPath, stringify(this.state.instance.settings));
        }

        this.log(`Saved instance gamesettings ${this.state.instance.path}`);
    }

    /**
     * Edit the game setting of current instance
     * @param gameSetting The game setting edit options
     */
    edit(gameSetting: EditGameSettingOptions) {
        let current = this.state.instance.settings;
        let result: Frame = {};
        for (let key of Object.keys(gameSetting)) {
            if (key === 'resourcePacks') continue;
            if (key in current && (current as any)[key] !== (gameSetting as any)[key]) {
                (result as any)[key] = (gameSetting as any)[key];
            }
        }
        if (gameSetting.resourcePacks) {
            let mcversion = this.getters.instance.runtime.minecraft;
            if ((isReleaseVersion(mcversion) && compareRelease(mcversion, '1.13.0') >= 0)
                || (isSnapshotPreview(mcversion) && compareSnapshot(mcversion, '17w43a') >= 0)) {
                result.resourcePacks = gameSetting.resourcePacks
                    .filter(r => r !== 'vanilla')
                    .map(r => (!r.startsWith('file/') ? `file/${r}` : r));
                result.resourcePacks.unshift('vanilla');
            } else {
                result.resourcePacks = gameSetting.resourcePacks.filter(r => r !== 'vanilla')
                    .map(r => (r.startsWith('file/') ? r.substring(5) : r));
            }
        }
        if (Object.keys(result).length > 0) {
            this.log(`Edit gamesetting: ${JSON.stringify(result, null, 4)}`);
            this.commit('instanceGameSettings', result);
        }
    }
}
