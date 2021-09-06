require('dotenv').config()
const tmi = require('tmi.js');
const dbta = require('./dbta');
const connector = require('./db-connector');
require('./interfaces/User');

// Login to Twitch as bot
const client = new tmi.Client({
    options: {debug: true, messagesLogLevel: "info"},
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: process.env.TWITCH_USER,
        password: process.env.TWITCH_PASS
    },
    channels: [process.env.TWITCH_USER]
});

let instances: { [index: string]: any } = {};

function getInstance(context: { [index: string]: string }): any {
    if (!context['user-id'] || !instances[context['user-id']]) {
        return null;
    }
    return instances[context['user-id']];
}

function addInstance(key: string, instance: any) {
    instances[key] = instance;
}

function initializeInstances(): any {
    connector.getUsers().then((users: User[]) => {
        for (const user of users) {
            if (user.watching) {
                dbta.run(user).then((i: any) => addInstance(user.userId, i))
            }
        }
    });

}

client.connect().catch(console.error);
connector.connect().then(initializeInstances).catch(console.error);

client.on('message', async (channel: string, context: { [index: string]: string }, message: string, self: boolean) => {
    const reply = function (channel: string, message: string) {
        if (context["message-type"] === 'whisper') {
            client.say('dobettertwitchautomod', message) //TODO replace by client.whisper(channel,msg) once the bot is verified
        } else {
            client.say(channel, message);
        }
    }

    if (self) return;

    // Ensure user exists in DB and get it
    const user = await connector.ensureUserExists(context['user-id'], context.username);

    const instance = getInstance(context);

    /** List of available commands
     *       !join          - Make DBTA join your chat
     *       !leave         - Make DBTA leave your chat
     *       !mode          - Set if you want to DELETE blocked messages, TIMEOUT the users or BAN them
     *       !add_term      - Add a blocked term for your channel
     *       !remove_term   - Remove a blocked term for your channel
     *       !leet          - Enable/Disable replacement of numbers into letters
     *       !include       - Enable/Disable checking for words containing blocked terms (plurals)
     *       !spaces        - Enable/Disable checking removing spaces and symbols
     *       !repeat        - Enable/Disable checking through repeated characters
     *  TODO !stats         - Displays how many messages have been blocked for your chat
     */
    const command = message.split(' ')[0].toLowerCase();

    if (command === '!join' && !user.watching) {
        reply(channel, `@${context.username} DBTA joined your chat`);
        user.watching = true;
        connector.updateUser(user);
        dbta.run(user).then((i: any) => addInstance(user.userId, i));
    }

    if (command === '!leave' && user.watching) {
        instance.stop();
        delete instances[user.userId];
        user.watching = false;
        connector.updateUser(user);
        reply(channel, `@${context.username} DBTA left your chat`)
    }

    if (command === '!mode') {
        if (!instance) {
            reply(channel, `@${context.username} DBTA has not joined your chat yet`)
            return;
        }
        if (message.split(' ').length === 1) {
            reply(channel, `@${context.username} Please choose between the DELETE, TIMEOUT or BAN mode`)
        } else if (message.split(' ')[1].toLowerCase() === 'delete') {
            instance.setMode('delete');
            user.mode = 'delete';
            connector.updateUser(user);
            reply(channel, `@${context.username} DBTA will now delete blocked messages`)
        } else if (message.split(' ')[1].toLowerCase() === 'ban') {
            instance.setMode('ban');
            user.mode = 'ban';
            connector.updateUser(user);
            reply(channel, `@${context.username} DBTA will now ban people who send blocked terms`)
        } else if (message.split(' ')[1].toLowerCase() === 'timeout') {
            instance.setMode('timeout');
            user.mode = 'timeout';
            connector.updateUser(user);
            reply(channel, `@${context.username} DBTA will now timeout people who send blocked terms`)
        } else {
            reply(channel, `@${context.username} Please choose between the DELETE, TIMEOUT or BAN mode`)
        }
    }

    if (command === '!add_term') {
        let term = message.split(' ')[1];
        if (!term) {
            return;
        }
        if (!instance) {
            reply(channel, `@${context.username} DBTA has not joined your chat yet`)
            return;
        }
        const newTerm = instance.addTerm(term);
        if (newTerm !== undefined) {
            user.blockedTerms.push(newTerm);
            connector.updateUser(user);
        }
        reply(channel, `@${context.username} added blocked term ${term[0].toUpperCase() + '*'.repeat(term.length - 2) + term[term.length - 1].toUpperCase()}`)
    }

    if (command === '!remove_term') {
        let term = message.split(' ')[1];
        if (!term) {
            return;
        }
        if (!instance) {
            reply(channel, `@${context.username} DBTA has not joined your chat yet`)
            return;
        }

        const removedTerm = instance.removeTerm(term);
        if (removedTerm !== undefined) {
            user.blockedTerms = user.blockedTerms.filter((el: string) => el !== removedTerm);
            connector.updateUser(user);
        }
        reply(channel, `@${context.username} removed blocked term ${term[0].toUpperCase() + '*'.repeat(term.length - 2) + term[term.length - 1].toUpperCase()}`)
    }

    if (command === '!leet') {
        if (!instance) {
            reply(channel, `@${context.username} DBTA has not joined your chat yet`)
            return;
        }

        user.preferences.leet = !user.preferences.leet;
        instance.setLeet(user.preferences.leet)
        connector.updateUser(user);
        reply(channel, `@${context.username} ${user.preferences.leet ?
            'Y0u ju$+ 3n4b13d 73rm d3+3c7i0n +hr0ugh 1337 m3554g3$' :
            'You just disabled term detection through leet messages'}`)
    }

    if (command === '!include') {
        if (!instance) {
            reply(channel, `@${context.username} DBTA has not joined your chat yet`)
            return;
        }

        user.preferences.include = !user.preferences.include;
        instance.setInclude(user.preferences.include)
        connector.updateUser(user);
        reply(channel, `@${context.username} ${user.preferences.include ?
            'You just _enabled_ xXincludeXx mode for termsssss' :
            'You just disabled include mode for terms'}`)
    }

    if (command === '!repeat') {
        if (!instance) {
            reply(channel, `@${context.username} DBTA has not joined your chat yet`)
            return;
        }

        user.preferences.repeat = !user.preferences.repeat;
        instance.setRepeat(user.preferences.repeat)
        connector.updateUser(user);
        reply(channel, `@${context.username} ${user.preferences.repeat ?
            'You just enabled tteerrm dddddetection throoooough reeppeeaattttted characters' :
            'You just disabled term detection through repeated characters'}`)
    }

    if (command === '!spaces') {
        if (!instance) {
            reply(channel, `@${context.username} DBTA has not joined your chat yet`)
            return;
        }

        user.preferences.spaces = !user.preferences.spaces;
        instance.setSpaces(user.preferences.spaces)
        connector.updateUser(user);
        reply(channel, `@${context.username} ${user.preferences.spaces ?
            'You just enabled t e r m detection through s p a c e d characters' :
            'You just disabled term detection through spaced characters'}`)
    }
});

