/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: fle-roy <fle-roy@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2018/04/04 16:27:22 by fle-roy           #+#    #+#             */
/*   Updated: 2018/04/11 12:35:49 by bluff            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const net = require('net');
const fs = require('fs');
const sock_path = __dirname + "/taskmaster.sock";
const { spawn } = require('child_process');
const config_handle = require("./config.js");
var child_vector = [];
var config_obj;

config_obj = config_handle.read_config();
console.log(config_obj);
function find_in_child_vector(value)
{
	return (child_vector.find(function(element) {
		return (element.name === value);
	}));
}

function tm_log(message)
{
	let time = process.uptime();

	console.log('[' + time.toFixed(Math.floor((time / 10)) + 3) + '] [INFO] ' + message);
}

function tm_error(message)
{
	let time = process.uptime();

	console.log('[' + time.toFixed((time / 10) + 3) + '] [INFO] ' + message);
}

function load_child()
{
	config_obj.prgm_list.forEach((el) => {
		if (find_in_child_vector(el.name))
			return ;
		el.proc = undefined;
		el.restart_nbr = 0;
		el.start_time = 0;
		child_vector.push(el);
	});
}

function child_guard(child, code, signal)
{
	if (!signal)
		tm_log(child.name + " exited [" + code + "]");
	else
		tm_log(child.name + " :  [" + signal + "]");
}

function launch_child(child)
{
	tm_log("Starting " + child.name);
	let command_splitted = child.command.split(' ');
	let fd_stdout = null;
	let fd_stderr = null;
	if (child.stdout_logfile)
		fd_stdout = fs.openSync(child.stdout_logfile, 'w', 0o644);
	if (child.stderr_logfile)
		fd_stderr = fs.openSync(child.stderr_logfile, 'w', 0o644);
	let old_mask = process.umask(child.umask);
	child.proc = spawn(command_splitted.shift(), command_splitted, {
		cwd: child.cwd,
		env: child.env,
		detached: false,
		stdio: [null, fd_stdout, fd_stderr]
	});
	child.start_time = process.uptime();
	child.proc.on('exit', (code, signal) => {
		child_guard(child, code, signal);
	});
	process.umask(old_mask);
	if (fd_stdout != null)
		fs.closeSync(fd_stdout);
	if (fd_stderr != null)
		fs.closeSync(fd_stderr);
	tm_log("Started " + child.name);
}

function launch_child_startup()
{
	child_vector.forEach((el) => {
		if (!el.start_at_launch)
			return ;
		launch_child(el);
	});
}
load_child();
launch_child_startup();
var server = net.createServer((socket) => {
	socket.on("connect", () =>{tm_log("Socket connected to server")});
	socket.on("close", () =>{tm_log("Socket disconnected from server")});
	socket.on("error", (err) =>{tm_error("Socket error\n" + err)});
	socket.on("data", (data) =>
	{
		let line_array = data.toString().trim().split(/\s+/g);
	    switch (line_array[0]) {
	        case "":
	            break;
			case "list":
	        case "status":
	        case "start":
	        case "stop":
	        case "reload":
	        case "config":
	        case "help":
	            socket.write("GOTCHA");
	            break;
	        default:
	            socket.write("Command not found. Try help next time ;)");
	            break;
	    }
	});
});

function clean_up(closing)
{
	try {
		if (fs.existsSync(sock_path))
			fs.unlinkSync(sock_path);
	} catch (err)
	{
		tm_error("Can't deleting existing socket\n" + err);
		process.exit(1);
	}
	if (closing)
	{
		tm_log("Removed UNIX socket");
		tm_log("Closing server");
		server.close(() => {tm_log("Closed server");});
		process.removeAllListeners();
	}
}

clean_up(0);

server.listen(sock_path);
process.once("exit", () => {clean_up(1);});
process.once("SIGTERM", () => {clean_up(1);});
process.once("SIGINT", () => {clean_up(1);});
process.once("SIGUSR1", () => {clean_up(1);});
process.once("SIGUSR2", () => {clean_up(1);});
process.once("unhandledException", () => {clean_up(1);});
