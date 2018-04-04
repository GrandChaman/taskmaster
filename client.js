const readline = require('readline');
const base_prompt = "$ TaskMaster_> " + "\x1b[0m";
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    //completer: completer,
    historySize: 100,
    removeHistoryDuplicates: true,

    prompt: "\x1b[1;32m" + base_prompt
});

rl.prompt();
rl.on("close", () => {
    console.log("exit");
    process.exit(0);
});
rl.on('SIGCONT', () => {
    rl.prompt();
    rl.write(null, {
        "name": "end"
    })
});

rl.on('line', (line) => {
    var line_array = line.trim().split(/\s+/g);
    switch (line_array[0]) {
        case "":
            break;
        case "status":
        case "start":
        case "stop":
        case "reload":
        case "config":
        case "help":
            console.log('world!');
            break;
        case "exit":
            rl.close();
            break;
        default:
            console.log("Command not found. Try help next time ;)");
            break;
    }
    rl.prompt();
});
