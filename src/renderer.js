const ipc = require('electron').ipcRenderer;
const remote = require('@electron/remote');
const win = remote.getCurrentWindow();
const fs = require('fs-extra');
const $ = require('jquery');
const Swal = require('sweetalert2');
const softwareDict = require('./software.json');
const packageMeta = require('../package.json');
const os = require('os');

// Page Change Listener & Function
$(document).on('click', '[data-target]', async function() {

    // Get requested page ID to load
    const target = $(this).data('target');
    
    loadPage(target);
    
});

function loadPage(target) {

    // Deselect all sidebar entries & select targeted entry only
    $('#sidebar > .inner > div').removeClass('selected');
    $(`#sidebar > .inner > div[data-target="${target}"]`).addClass('selected');

    // Hide all pages
    $('#main > .content').removeClass('selected');

    // Show target page
    // Quick & dirty page fade in. Saves us from importing an animation library.
    $(`#main > .content[data-page="${target}"]`).fadeIn(500);
    $(`#main > .content[data-page="${target}"]`).addClass('selected');
    $(`#main > .content[data-page="${target}"]`).attr('style', '');

    // If requested page is 'sysinfo', call loadSysInfo to start fetching hardware info
    // ! System info is now loaded on launch
    //if (target === 'sysinfo') loadSysInfo();

    // If requested page is 'install', call loadInstallOpts to check already-installed or conflicting software
    if (target === 'install') loadInstallOpts();

}

// When clicking a checkbox option, toggle its 'selected' class
$(document).on('click', '.option.is-check', function() {
    $(this).toggleClass('selected');
});

// When clicking a checkbox option on the 'install' page, update the #installSummary elem
$(document).on('click', '[data-page="install"] .option.is-check', checkSelectedApps);

function checkSelectedApps() {
    const selectedLength = $('[data-page="install"] .option.is-check.selected').length;
    $('#installSummary > div > span').text(`Ready to install ${selectedLength} apps`);
    selectedLength ? $('#main').addClass('is-summary-visible') : $('#main').removeClass('is-summary-visible');
}

// 'sysinfo' page load function
async function loadSysInfo() {

    $('#sysInfoLoading').removeClass('is-hidden');
    $('#sysInfoContent').addClass('is-hidden');

    await sleep(750);

    const info = require('systeminformation');

    const sysInfo = {};

    $('#sysInfoProgress').text('Getting BIOS Information...');
    sysInfo.bios = await info.bios();
    
    $('#sysInfoProgress').text('Getting Motherboard Information...');
    sysInfo.mobo = await info.baseboard();
    $('#sysInfoContent [data-spec="mobo"]').text(`${sysInfo.mobo.model} (BIOS Dated ${sysInfo.bios.releaseDate})`);
    
    $('#sysInfoProgress').text('Getting CPU Information...');
    sysInfo.cpu = await info.cpu();
    $('#sysInfoContent [data-spec="cpu"]').text(`${sysInfo.cpu.brand} (${sysInfo.cpu.physicalCores}C/${sysInfo.cpu.cores}T @ ${sysInfo.cpu.speed}GHz)`);

    $('#sysInfoProgress').text('Getting RAM Information...');
    const memInfo = await info.mem();
    const memLayout = await info.memLayout();
    sysInfo.ram = {
        ...memInfo,
        layout: memLayout,
        dimms: memLayout.length,
        speed: memLayout[0].clockSpeed,
        manufacturer: memLayout[0].manufacturer,
        model: memLayout[0].partNum,
        totalGB: Math.ceil(memInfo.total / 1073741824), // RAM total in bytes / (1024 * 1024 * 1024), rounded up to nearest integer. Should give us total RAM in GB.)
        dimmSizeGB: Math.ceil(memLayout[0].size / 1073741824)
    }
    $('#sysInfoContent [data-spec="ram"]').text(`${sysInfo.ram.manufacturer} ${sysInfo.ram.model} ${sysInfo.ram.totalGB}GB (${sysInfo.ram.dimms}x${sysInfo.ram.dimmSizeGB}GB @ ${sysInfo.ram.speed}MHz)`);

    $('#sysInfoProgress').text('Getting GPU Information...');
    const graphics = await info.graphics();
    sysInfo.gpu = graphics.controllers[0];
    sysInfo.displays = graphics.displays;
    $('#sysInfoContent [data-spec="gpu"]').text(`${sysInfo.gpu.name} (Driver ${sysInfo.gpu.driverVersion})`);
    $('#sysInfoContent [data-spec="display"]').text(`${sysInfo.displays.length} display(s) connected`);

    $('#sysInfoProgress').text('Getting OS Information...');
    sysInfo.os = await info.osInfo();
    $('#sysInfoContent [data-spec="os"]').text(`${sysInfo.os.distro} (Build ${sysInfo.os.release})`);

    $('#sysInfoProgress').text('Getting Disk Information...');
    sysInfo.disks = await info.diskLayout();
    let diskString = '';
    sysInfo.disks.forEach(disk => {diskString += `${disk.name} (${disk.interfaceType} ${disk.type})<br>`})
    $('#sysInfoContent [data-spec="disk"]').html(diskString);

    $('#sysInfoLoading').addClass('is-hidden');
    $('#sysInfoContent').removeClass('is-hidden');
}

// 'install' page load function
async function loadInstallOpts() {

    $('[data-page="install"] .options').empty();
    softwareDict.forEach(app => {
        
        let alreadyInstalled = false;
        let hasConflict = false;

        // Check if app is already installed
        if (app.checkPaths) app.checkPaths.forEach(path => {
            path = path.replace('%%userdir%%', os.homedir());
            console.log(path)
            if (fs.pathExistsSync(path)) alreadyInstalled = true;
        });

        // Check if app has any conflicts
        if (app.conflictPaths) app.conflictPaths.forEach(path => {
            if (fs.pathExistsSync(path)) hasConflict = true;
        });

        const itemImg = app.glyph ? `<i class="${app.glyph}"></i>` : `<img src="${app.img}">`;

        $('[data-page="install"] .options').append(`
            <div class="option is-check ${alreadyInstalled ? 'is-installed' : ''} ${hasConflict ? 'is-conflict' : ''}" data-value="${app.id}">
                <div>
                    ${itemImg}
                    <span>
                        <div class="title">${app.name}</div>
                        <div class="subtitle">${hasConflict ? '<em>This app conflicts with ' + app.conflictsWith.join(', ') + ' which needs to be uninstalled first</em><br>' : ''}${app.subtitle}</div>
                    </span>
                </div>
            </div>
        `);

        /* if (alreadyInstalled) $(`[data-page="install"] .option.is-check[data-value="${app.id}"]`).addClass('is-installed');
        if (hasConflict) {
            $(`[data-page="install"] .option.is-check[data-value="${app.id}"]`).addClass('is-conflict');
            $(`[data-page="install"] .option.is-check[data-value="${app.id}"] .subtitle`).prepend(`<em>This app conflicts with ${app.conflictsWith.join(', ')} which needs to be uninstalled first</em><br>`);
        } */

    });

    // Recalculate selected apps
    checkSelectedApps();
}

// Start app installation
async function startInstall() {

    // Gather list of apps to install
    const installList = [];
    $('[data-page="install"] .option.is-check.selected').each((index, elem) => installList.push($(elem).data('value')));

    // Add the 'blur' class to main app window to disable pointer events & blur the window
    $('#container').addClass('blur');

    // Sleep for 250ms to prevent race condition and allow the DOM to update
    await sleep(250);

    // Send synchronous IPC event to main process to start installation. Returns array of errors encountered during install.
    const errors = ipc.sendSync('startInstall', installList);

    // Reload "Install Software" page
    loadPage('install');

    // Remove the 'blur' class from main app window
    $('#container').removeClass('blur');

    // If errors were encountered during installation, notify the user
    if (errors.length) Swal.fire({
        title: 'Some apps failed to install',
        html: errors.join('<br>'),
        icon: 'error'
    })

}

function aboutApp() {
    Swal.fire({
        //iconHtml: '<img src="icons/aeonlabs_brand.png">',
        title: '<img src="icons/aeonlabs_brand.png" width="128" style="margin:20px 0"><br>AeonLabs PC Manager v' + packageMeta.version,
        text: `PC Manager is a tool for AeonLabs branded PCs that allows you to quickly install popular software, book a service and view information about your machine.`
    })
}

// Asynchronous sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Start loading system info immediately on launch
loadSysInfo();