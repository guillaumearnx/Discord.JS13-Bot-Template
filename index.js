//Dépendences
const {Client, Collection} = require('discord.js');
const {SlashCommandBuilder} = require('@discordjs/builders');
const {run} = require('npm-check-updates');
const fs = require('fs');
const path = require('path')
const recursiveRead = require('recursive-readdir');
const {BOT_TOKEN, DISCORD_MAIN_GUILD_ID} = require('./config.json');
require('colors');

//Verification config
(() => {
    if (!fs.existsSync('./config.json')) {
        console.log("Please create a config.json");
        process.exit(-1)
    }
    const empty = [["", " "], [null, undefined]]
    if (empty[0].indexOf(BOT_TOKEN) > -1 || empty[1].indexOf(BOT_TOKEN) > -1) {
        console.log("Please set a bot token !");
        process.exit(0);
    }
    if (empty[0].indexOf(DISCORD_MAIN_GUILD_ID) > -1 || empty[1] === DISCORD_MAIN_GUILD_ID) {
        console.log("Please set your main guild id !");
        process.exit(0);
    }
})()

//Variables d'environnement
let nbCommandes = 0;
let nbEvents = 0;
let nbInteractions = 0;

//Variable Client
const bot = new Client({
    intents: 32767
});

bot.commands = new Collection();
bot.aliases = new Collection();
bot.interactions = new Collection();

console.log(("Lancement du bot ...").brightRed);

//Packages
(async () => {
    const r = await run({
        packageFile: 'package.json'
    });
    if (Object.keys(r).length > 0) {
        console.log('Des mises à jour sont disponibles pour vos packages'.yellow)
        for (const [key, value] of Object.entries(r)) {
            console.log(`${key} -> ${value}`.magenta)
        }
    } else console.log('Tous vos packages sont à jour.'.magenta)
})();

//Évenements et commandes
fs.readdir('./events/', (err, files) => {
    if (err) return console.error(err)
    console.log(`\nÉvènements : ` + `(${files.length})`.yellow);
    files.forEach(file => {
        if (!file.endsWith('.js') || file.substring(file.indexOf(path.sep) + 1).startsWith('-')) return;
        nbEvents++
        const event = require(`./events/${file}`);
        let eventName = file.split('.')[0];
        bot.on(eventName, event.bind(null, bot))
        console.log(`\tChargement de l'évènement : ` + `${eventName}`.blue);
    })
    if (nbEvents === 0) console.log("Aucun event actif".yellow)
});

// noinspection JSIgnoredPromiseFromCall
(async () => {
    await recursiveRead('./commands/', (err, files) => {
        if (err) return console.error(err);
        console.log(`\nCommandes : ` + `(${files.length})`.yellow);
        files.forEach((file) => {
            if (!file.endsWith('.js') || file.substring(file.indexOf(path.sep) + 1).startsWith('-')) return
            let props = require(`./${file}`);
            let commandName = props.config.name.toLowerCase();
            bot.commands.set(commandName, props);
            props.config.aliases.forEach(alias => {
                bot.aliases.set(alias.toLowerCase(), commandName);
            });
            let aliases = props.config.aliases.map(e => e.toString()).join(", ");
            console.log(`\tChargement de la commande : ` + `${commandName}`.brightRed);
            console.log(`\t\tRaccourcis : ` + `${aliases}`.cyan);
            nbCommandes++;

        })
        if (nbCommandes === 0) console.log("Aucune commande active".yellow)
    });
})();

(async () => {
    await recursiveRead('./interactions/', (err, files) => {
        if (err) return console.error(err);
        console.log(`\nInteractions : ` + `(${files.length})`.yellow);
        files.forEach((file) => {
            if (!file.endsWith('.js') || file.substring(file.indexOf(path.sep) + 1).startsWith('-')) return
            const interaction = require(`./${file}`);
            const name = interaction.config.name;
            const commandBuilder = new SlashCommandBuilder().setName(name).setDescription(interaction.config.description)
            console.log(`\tChargement de l'interaction : ` + `/${name}`.brightRed);
            interaction.options.map(op => {
                const {type} = op;
                switch (type) {
                    case 1:
                        commandBuilder.addUserOption(option => option.setName(op.name.toLowerCase()).setDescription(op.description).setRequired(op.required ? op.required : false));
                        break;
                    case 2:
                        commandBuilder.addRoleOption(option => option.setName(op.name.toLowerCase()).setDescription(op.description).setRequired(op.required ? op.required : false));
                        break;
                    case 3:
                        commandBuilder.addChannelOption(option => option.setName(op.name.toLowerCase()).setDescription(op.description).setRequired(op.required).setRequired(op.required ? op.required : false));
                        break;
                    case 4:
                        commandBuilder.addStringOption(option => option.setName(op.name.toLowerCase()).setDescription(op.description).setRequired(op.required).setRequired(op.required ? op.required : false));
                        break;
                    case 5:
                        commandBuilder.addIntegerOption(option => option.setName(op.name.toLowerCase()).setDescription(op.description).setRequired(op.required ? op.required : false).addChoices(op.choices ? op.choices : []));
                        break;
                    case 6:
                        commandBuilder.addBooleanOption(option => option.setName(op.name.toLowerCase()).setDescription(op.description).setRequired(op.required ? op.required : false));
                        break;
                    case 7:
                        commandBuilder.addMentionableOption(option => option.setName(op.name.toLowerCase()).setDescription(op.description).setRequired(op.required ? op.required : false))
                        break;
                }
            })
            bot.interactions.set(name, commandBuilder);
            nbInteractions++;
        })
        if (nbInteractions === 0) console.log("Aucune interraction active".yellow)
    });
})();

//Script
bot.login(BOT_TOKEN).catch(() => {
    console.log("Can't connect ...");
    process.exit(0);
});

//Debug
bot.on("warn", (e) => console.warn(e));
process.on('unhandledRejection', async (error) => {
    console.error(error)
    process.exit(-1)
}).on('uncaughtException', async (error) => {
    console.error(error)
    process.exit(-1)
})

//Export
module.exports = {
    bot
}
