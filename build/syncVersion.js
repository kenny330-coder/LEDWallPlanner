const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '../package.json');
const versionJsonPath = path.join(__dirname, '../version.json');

try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    if (fs.existsSync(versionJsonPath)) {
        const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
        if (versionJson.version !== pkg.version) {
            console.log(`[Version Sync] Updating version.json from v${versionJson.version} -> v${pkg.version}`);
            versionJson.version = pkg.version;
            fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2), 'utf8');
            console.log(`[Version Sync] Success.`);
        } else {
            console.log(`[Version Sync] version.json is already up to date (v${pkg.version}).`);
        }
    } else {
        fs.writeFileSync(versionJsonPath, JSON.stringify({ version: pkg.version, link: "" }, null, 2), 'utf8');
        console.log(`[Version Sync] Created version.json at v${pkg.version}`);
    }
} catch (e) {
    console.error('[Version Sync] Failed to sync version.json', e);
}
