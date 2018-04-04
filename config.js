/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   config.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: fle-roy <fle-roy@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2018/04/04 10:48:21 by fle-roy           #+#    #+#             */
/*   Updated: 2018/04/04 11:58:27 by fle-roy          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const fs = require('fs');

function read_config()
{
	var config_file;
	var config_obj;

	try {
		config_file = fs.readFileSync("config.json");
	} catch(err)
	{
		console.error("[ERROR] Can't read config file\n" + err);
		process.exit(1);
	}
	try {
		config_obj = JSON.parse(config_file);
	} catch(err)
	{
		console.error("[ERROR] Config file is badly formatted\n" + err);
		process.exit(1);
	}
	return (config_obj);
}

module.exports = {
	read_config
};
