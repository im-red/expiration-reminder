import { useState, useEffect } from 'react';
import getAppVersionInfo, { DEFAULT_VERSION_INFO, AppVersionInfo } from '../utils/getAppVersionInfo';

function useAppVersion(): AppVersionInfo {
    const [versionInfo, setVersionInfo] = useState<AppVersionInfo>(DEFAULT_VERSION_INFO);

    useEffect(() => {
        getAppVersionInfo().then(setVersionInfo);
    }, []);

    return versionInfo;
}

export default useAppVersion;
