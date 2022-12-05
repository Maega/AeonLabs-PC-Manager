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
                    owner: 'Maega',
                    name: 'aeonlabs-pc-manager'
                },
                draft: false,
                prerelease: true
            }
        }
    ],
};
