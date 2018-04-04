/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: fle-roy <fle-roy@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2018/04/04 16:27:22 by fle-roy           #+#    #+#             */
/*   Updated: 2018/04/04 17:56:13 by fle-roy          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const net = require('net');
const fs = require('fs');
const sock_path = __dirname + "/taskmaster.sock";

var server = net.createServer((socket) => {
	socket.on("connect", () =>{console.log("[INFO] Socket connected to server")});
	socket.on("close", () =>{console.log("[INFO] Socket disconnected from server")});
	socket.on("error", (err) =>{console.error("[ERROR] Socket error\n" + err)});
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
		console.error("[ERROR] Can't deleting existing socket\n" + err);
		process.exit(1);
	}
	if (closing)
	{
		console.log("[INFO] Removed UNIX socket");
		console.log("[INFO] Closing server");
		server.close(() => {console.log("[INFO] Closed server");});
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
