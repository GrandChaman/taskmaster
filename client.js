/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   client.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: fle-roy <fle-roy@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2018/04/04 17:42:52 by fle-roy           #+#    #+#             */
/*   Updated: 2018/04/04 17:50:25 by fle-roy          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const readline = require('readline');
const base_prompt = "$ TaskMaster_> " + "\x1b[0m";
const sock_path = __dirname + "/taskmaster.sock";
const net = require('net');

function completer(line) {
  const completions = 'list status start stop reload config help exit'.split(' ');
  const hits = completions.filter((c) => c.startsWith(line));
  return [hits.length ? hits : completions, line];
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer: completer,
    historySize: 100,
    removeHistoryDuplicates: true,
    prompt: "\x1b[1;32m" + base_prompt
});

var socket = net.Socket();
socket.connect(sock_path, () => {
	console.log("[INFO] Connected to socket");
	rl.prompt();
});
socket.on("error", (err) => {
	console.error("[ERROR] Error on socket\n" + err);
	process.exit(1);
});
socket.on("data", (data) => {
	console.log(data.toString("UTF-8"));
	rl.prompt();
});
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
	socket.write(line);
});
