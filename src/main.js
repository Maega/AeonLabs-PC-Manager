// Modules to control application life and create native browser window
const {app, ipcMain} = require('electron');
const cmd = require('node-cmd');
const sudo = require('sudo-prompt');

if (require('electron-squirrel-startup')) app.quit();
require('update-electron-app')();

const {BrowserWindow} = require("electron-acrylic-window");
const remote = require('@electron/remote/main');
remote.initialize();

let mainWindow;

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1250,
    height: 800,
    minWidth: 800,
    minHeight: 400,
    titleBarStyle: 'hidden', // Hide titleBar since we'll use our own custom controls
    webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: false
    },
    frame: true,
    vibrancy: {
        theme: 'dark',
        effect: 'acrylic',
        useCustomWindowRefreshMethod: true,
        disableOnBlur: true,
        debug: false
    }
  })

  // Load app frontend
  mainWindow.loadFile('./src/index.html');

  // Open DevTools (debug)
  //mainWindow.webContents.openDevTools();

  // Enable remote module
  remote.enable(mainWindow.webContents);

  return mainWindow;

};

// When Electron finishes initialising, create the main app window and assign
// the BrowserWindow instance it returns to the app scoped mainWindow variable.
app.whenReady().then(() => mainWindow = createWindow());

// Quit when all windows are closed
app.on('window-all-closed', () => app.quit());

// IPC Events
ipcMain.on('startInstall', async (event, installList) => {

    console.log(installList);
    
    // Define the browser window.
    const installWindow = new BrowserWindow({
        width: 900,
        height: 600,
        minWidth: 900,
        minHeight: 600,
        parent: mainWindow,
        modal: true,
        titleBarStyle: 'hidden',
        alwaysOnTop: true,
        /* titleBarOverlay: {
          color: '#171717',
          symbolColor: '#fff'
        }, */
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false
        }
    });

    // Set install window position to position of mainWindow
    let mainWindowSize = mainWindow.getSize();
    let installWindowSize = installWindow.getSize();
    let mainWindowPos = mainWindow.getPosition();
    const newPosX = mainWindowPos[0] + ((mainWindowSize[0] / 2) - (installWindowSize[0] / 2));
    const newPosY = mainWindowPos[1] + ((mainWindowSize[1] / 2) - (installWindowSize[1] / 2));
    installWindow.setPosition(newPosX, newPosY);

    const softwareDict = require('./software.json');

    const doInstall = (installCmd, asAdmin = false) => {

        return new Promise((resolve, reject) => {

            function callback(err, data, stderr) {
                err || stderr ? reject(stderr) : resolve(data);
            }

            asAdmin
                ? sudo.exec(installCmd, {}, callback)
                : cmd.run(installCmd, callback);

        });

    }

    const errors = [];
    
    for (const [index, targetApp] of installList.entries()) {

        console.log('Current Index: ' + index);

        const target = softwareDict.find(thisApp => thisApp.id === targetApp);
        console.log('Current Target App: ' + target.name);

        // Load doinstall.html & pass the current target app's metadata as a query string.
        installWindow.loadFile('./src/doinstall.html', {query: {progress: index, total: installList.length, target: JSON.stringify(target)}});
        
        try {
            const installResult = await doInstall(target.installCmd, !!target.asAdmin);
            console.log(JSON.stringify(installResult));
        } catch (err) {
            console.error(`${target.name} failed to install: ${err}`);
            errors.push(`<b>${target.name}:</b> ${err || 'Unknown Error'}`);
        }
        
        console.log(target.name + ' INSTALL IS DONE!!');

    }

    installWindow.close();

    event.returnValue = errors;

});

// Run command via CMD
ipcMain.on('runCmd', async (event, command) => cmd.run(command));

// Enable Windows Feature via DISM
ipcMain.on('enableFeature', async (event, featureName) => {

    const result = await new Promise((resolve, reject) => sudo.exec(`dism /Online /Enable-Feature /NoRestart /FeatureName:"${featureName}" -All`, {}, (err, data, stderr) => {
        // Error code 3010 is actually successful and just indicates a reboot is required
        // If any other error code is returned, reject the promise
        if (err.code !== 3010) reject({
            success: false,
            rebootRequired: false,
            error: err
        });

        // Return the success state and if a reboot is required for changed to take effect
        resolve({
            success: true,
            rebootRequired: !!(err && err.code === 3010)
        });
    }));

    console.log(result);
    return result;

});

// Disable Windows Feature via DISM
ipcMain.on('disableFeature', async (event, featureName) => {

    const result = await new Promise((resolve, reject) => sudo.exec(`dism /Online /Disable-Feature /NoRestart /FeatureName:"${featureName}"`, {}, (err, data, stderr) => {
        // Error code 3010 is actually successful and just indicates a reboot is required
        // If any other error code is returned, reject the promise
        if (err.code !== 3010) reject({
            success: false,
            rebootRequired: false,
            error: err
        });

        // Return the success state and if a reboot is required for changed to take effect
        resolve({
            success: true,
            rebootRequired: !!(err && err.code === 3010)
        });
    }));

    console.log(result);
    return result;

});

// Check if Windows Feature is enabled
ipcMain.on('checkFeature', async (event, featureName) => {
    const isEnabled = await new Promise((resolve, reject) => sudo.exec(`dism /Online /Get-FeatureInfo /FeatureName:"${featureName}" | find "State : "`, {}, (err, data, stderr) => {
        if (err) reject(err);
        const isEnabled = !!(data.trim().split('State : ')[1] === 'Enabled');
        resolve(isEnabled);
    }));

    console.log(isEnabled);
    return isEnabled;
});