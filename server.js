/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: fle-roy <fle-roy@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2018/04/04 16:27:22 by fle-roy           #+#    #+#             */
/*   Updated: 2018/04/12 18:57:23 by bluff            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const net = require('net');
const fs = require('fs');
const sock_path = __dirname + "/taskmaster.sock";
const {
    spawn
} = require('child_process');
const config_handle = require("./config.js");
var child_vector = [];
var config_obj;

config_obj = config_handle.read_config();
console.log(config_obj);

function find_in_child_vector(value) {
    return (child_vector.find(function(element) {
        return (element.name === value);
    }));
}

function tm_log(message) {
    let time = process.uptime();

    console.log('\r[' + time.toFixed(3) + '] [INFO] ' + message);
}

function tm_error(message) {
    let time = process.uptime();

    console.log('\r[' + time.toFixed(3) + '] [INFO] ' + message);
}

function load_child() {
    config_obj.prgm_list.forEach((el) => {
        if (find_in_child_vector(el.name))
            return;
        el.proc = [];
        el.restart_nbr = 0;
        el.start_time = 0;
        child_vector.push(el);
    });
}

function child_guard(child, id, code, signal) {
	let case_id = "[" + Math.random().toString(36).substring(7) + "] "
		+ child.name + "[" + id + "] ";
	let stop_time = Math.floor(Number(process.uptime() - child.start_time));

    if (!signal)
        tm_log(case_id + "exit'd (code : " + code + ")");
    else
        tm_log(case_id + "caught signal " + signal);
	if (code != child.normal_exit_code)
		tm_log(case_id + "exit'd with unexpected code : " +
			(code ? code : signal));
	if (stop_time < child.normal_run_time)
		tm_log(case_id + "exit'd (in " + Math.floor(stop_time) + "s) before normal run time");
	if (child.should_restart == "always")
		console.log("Should restart that child");
	else if (child.should_restart == "unexpected" &&
		(stop_time < child.normal_run_time || code != child.normal_exit_code))
		console.log("Should restard that child 2");
}

function kill_child(child) {
    let i;

    i = 0;
    child.proc.forEach((el) => {
		let ii = i;
        tm_log("Stopping " + child.name + "[" + i + "]");
        if (!el.ended) {
            el.removeAllListeners("exit");
            el.on("exit", (code, signal) => {
                el.ended = true;
				tm_log("Stopped " + child.name + "[" + ii + "]");
            });
            el.kill(child.stop_signal);
			setTimeout(() => {
				if (el.ended)
					return ;
				tm_error(child.stop_time + " seconds since first signal, force stopping "
				+ child.name + "[" + ii + "]");
				el.kill("SIGABRT");
			}, child.stop_time * 1000);
        } else
            tm_log("Stopped " + child.name + "[" + i + "]");
        i++;
    });

}

function launch_child(child) {
    tm_log("Starting " + child.name);
    let command_splitted = child.command.split(' ');
    let fd_stdout = null;
    let fd_stderr = null;
    if (child.stdout_logfile)
        fd_stdout = fs.openSync(child.stdout_logfile, 'w', 0o644);
    if (child.stderr_logfile)
        fd_stderr = fs.openSync(child.stderr_logfile, 'w', 0o644);
    let old_mask = process.umask(child.umask);
    for (let i = 0; i < child.proc_nbr; i++) {
        child.proc.unshift(spawn(command_splitted[0], command_splitted.slice(1), {
            cwd: child.cwd,
            env: (child.begin_with_clean_env ? child.env :
                Object.assign(Object.create(process.env), child.env)),
            detached: false,
            stdio: [null, fd_stdout, fd_stderr]
        }));
        child.start_time = process.uptime();
        child.proc[i].ended = false;
        child.proc[i].on('exit', (code, signal) => {
            child.proc[i].ended = true;
            child_guard(child, i, code, signal);
        });
        child.proc[i].on('error', (err) => {
            tm_error("Got error from : " + child.name + " [" + i + "]");
        });
    }
    process.umask(old_mask);
    if (fd_stdout != null)
        fs.closeSync(fd_stdout);
    if (fd_stderr != null)
        fs.closeSync(fd_stderr);
    tm_log("Started " + child.name);
}

function launch_child_startup() {
    child_vector.forEach((el) => {
        if (!el.start_at_launch)
            return;
        launch_child(el);
    });
}
load_child();
launch_child_startup();
var server = net.createServer((socket) => {
    socket.on("connect", () => {
        tm_log("Socket connected to server")
    });
    socket.on("close", () => {
        tm_log("Socket disconnected from server")
    });
    socket.on("error", (err) => {
        tm_error("Socket error\n" + err)
    });
    socket.on("data", (data) => {
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

function clean_up(closing) {
    try {
        if (fs.existsSync(sock_path))
            fs.unlinkSync(sock_path);
    } catch (err) {
        tm_error("Can't deleting existing socket\n" + err);
        process.exit(1);
    }
    if (closing) {
        tm_log("Removed UNIX socket");
        tm_log("Closing server");
        server.close(() => {
            tm_log("Closed server");
        });
		child_vector.forEach((el) => {
			kill_child(el);
		});
        //process.removeAllListeners();
    }
}

clean_up(0);

server.listen(sock_path);
process.once("exit", () => {
    clean_up(1);
});
process.once("SIGTERM", () => {
    clean_up(1);
});
process.once("SIGINT", () => {
    clean_up(1);
});
process.once("SIGUSR1", () => {
    clean_up(1);
});
process.once("SIGUSR2", () => {
    clean_up(1);
});
process.once("unhandledException", () => {
    clean_up(1);
});
