// Portfolio App JavaScript
console.log('Portfolio app loaded!');

function showCommands() {
    const commands = `
📱 App Factory Commands:

# List all apps
node app-cli.js list

# Deploy an app
node app-cli.js deploy my-app

# Create a new app
node app-cli.js create my-app html
    `;
    alert(commands);
}

function createNewApp() {
    const appName = prompt('Enter app name:');
    if (appName) {
        const template = prompt('Choose template (html or react):', 'html');
        alert(`To create your app, run:\n\nnode app-cli.js create ${appName} ${template}`);
    }
}

// Make functions globally available
window.showCommands = showCommands;
window.createNewApp = createNewApp;
