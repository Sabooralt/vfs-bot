var locateChrome = require("locate-chrome");


const func = async () => {
    const executablePath = await new Promise(resolve => locateChrome((arg) => resolve(arg))) || '/usr/bin/google-chrome';
retrun executablePath;
}
console.log(
    const func 

)