import { App } from '@capacitor/app';

interface AppVersionInfo {
    versionName: string;
    versionCode: string;
    fullString: string;
}

const DEFAULT_VERSION_NAME = '99.99.99';
const DEFAULT_VERSION_CODE = '99';
const DEFAULT_VERSION_INFO: AppVersionInfo = {
    versionName: DEFAULT_VERSION_NAME,
    versionCode: DEFAULT_VERSION_CODE,
    fullString: `v${DEFAULT_VERSION_NAME}-b${DEFAULT_VERSION_CODE}`,
};

async function getAppVersionInfo(): Promise<AppVersionInfo> {
    try {
        const info = await App.getInfo();
        const versionName = info.version || DEFAULT_VERSION_NAME;
        const versionCode = info.build || DEFAULT_VERSION_CODE;
        return {
            versionName,
            versionCode,
            fullString: `v${versionName}-b${versionCode}`,
        };
    } catch {
        return DEFAULT_VERSION_INFO;
    }
}

export default getAppVersionInfo;
export { DEFAULT_VERSION_INFO };
export type { AppVersionInfo };
