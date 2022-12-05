module.exports = {
    packagerConfig: {},
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {},
        },
        {
            name: '@electron-forge/maker-zip',
        },
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'AeonLabs',
                    name: 'aeonlabs-pc-manager'
                },
                prerelease: true
            }
        }
    ],
};
