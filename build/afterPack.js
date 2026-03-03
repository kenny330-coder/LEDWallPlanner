const { execSync } = require('child_process');
exports.default = function (context) {
    console.log('Running xattr -cr on', context.appOutDir);
    try {
        execSync(`xattr -cr "${context.appOutDir}"`);
    } catch (e) {
        console.error('Failed to run xattr -cr', e);
    }
};
