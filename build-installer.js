const electronInstaller = require('electron-winstaller');
const path = require('path');

async function buildInstaller() {
    console.log('Building Installer... This might take a minute...');
    
    try {
        await electronInstaller.createWindowsInstaller({
            appDirectory: path.join(__dirname, 'dist', 'Videowaves Timer-win32-x64'),
            outputDirectory: path.join(__dirname, 'dist', 'installer'),
            authors: 'Akash Misal',
            exe: 'Videowaves Timer.exe',
            title: 'Videowaves Timer',
            description: 'Professional Broadcast Timer',
            setupExe: 'Videowaves_Setup.exe',
            noMsi: true
        });
        
        console.log('✅ Installer created successfully at dist/installer/Videowaves_Setup.exe');
    } catch (e) {
        console.log(`❌ No dice: ${e.message}`);
    }
}

buildInstaller();
