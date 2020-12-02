import Command from "@command/Command";
import { Administration } from "~/Groups";
import CommandEvent from "@command/CommandEvent";
import { Guild } from "@models/Guild";
import { MessageEmbed } from "discord.js";
import { databaseCheck, displayData } from "@utils/CommandUtils";
import { splitArguments } from "@utils/Utils";

export default class Config extends Command {
    public constructor() {
        super({
            name: "Config",
            triggers: ["config", "cfg", "setup"],
            description: "Configures various settings for the guild",
            group: Administration,
            botPermissions: ["EMBED_LINKS", "MANAGE_ROLES"]
        });
    }

    protected async run(event: CommandEvent): Promise<void> {
        const client = event.client;
        const database = client.database;

        const guild = await client.getGuildFromDatabase(database!, event.guild.id);
        if (!guild) {
            return;
        }

        const [subcommand, option, args] = splitArguments(event.argument, 3);
        if (!subcommand) {
            await displayAllSettings(event, guild);
            return;
        }

        switch (subcommand.toLowerCase()) {
            case "prefix": {
                await prefixSettings(event, option, args, guild);
                break;
            }

            case "boosts":
            case "channel": {
                await boostChannelSettings(event, option, args, guild);
            }
        }
    }
}

async function prefixSettings(event: CommandEvent, option: string, args: string, guild: Guild) {
    const client = event.client;
    const database = client.database;

    if (!option) {
        await displayData(event, guild, "prefix", true);
        return;
    }

    switch (option.toLowerCase()) {
        case "set": {
            if (args.length > 5) {
                await event.send("The prefix can be up to 5 characters.");
                break;
            }

            if (args === guild.config.prefix) {
                await event.send(`"The prefix is already set to ${args}`);
                break;
            }

            await database?.guilds.updateOne({ id: guild?.id }, { "$set": { "config.prefix": args } });
            await event.send(`The prefix has been set to \`${args}\``);
            break;
        }

        case "reset": {
            if (!guild.config.prefix) {
                await event.send("The prefix is already set to the default one.");
                break;
            }

            await database?.guilds.updateOne({ id: guild?.id }, { "$unset": { "config.prefix": "" } });
            await event.send(`The prefix has been set to \`${client.config.prefix}\``);
            break;
        }
    }
}


async function boostChannelSettings(event: CommandEvent, option: string, args: string, guild: Guild) {
    const client = event.client;
    const database = client.database;
    await databaseCheck(database!, guild, "boosts");

    if (!option) {
        await displayData(event, guild, "channel", true);
        return;
    }

    switch (option.toLowerCase()) {
        case "set": {
            if (!args) {
                await event.send("You need to specify the channel");
                break;
            }

            const channel = event.guild.channels.cache.find(channel => channel.name === args || channel.id === args || `<#${channel.id}>` === args);
            if (!channel) {
                await event.send("Couldn't find the channel you're looking for.");
                break;
            }

            if (guild.config.boosts?.channel === channel.id) {
                await event.send("The booster list channel is already set to the same one.");
                break;
            }

            await database?.guilds.updateOne({ id: guild?.id }, { "$set": { "config.boosts.channel": channel.id } });
            await event.send(`The booster list channel has been set to <#${channel.id}>`);
            break;
        }

        case "remove": {
            if (!guild.config.boosts?.channel) {
                await event.send("The booster list channel has already been removed.");
                break;
            }

            await database?.guilds.updateOne({ id: guild?.id }, { "$unset": { "config.boosts.channel": "" } });
            await event.send("The booster list channel has been removed.");
            break;
        }
    }
}

async function displayAllSettings(event: CommandEvent, guild: Guild) {
    const embed = new MessageEmbed()
        .setTitle("The current settings for this server:")
        .addField("Prefix", await displayData(event, guild, "prefix"), true)
        .addField("Booster list", await displayData(event, guild, "channel"), true)
        .setColor("#61e096")
        .setFooter(`Requested by ${event.author.tag}`, event.author.displayAvatarURL());

    await event.send({ embed: embed });
}
