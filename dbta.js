const connector = require('./db-connector');
const xregexp = require('xregexp');
const tmi = require('tmi.js');

function normalize(str) {
    return str.normalize("NFKD").replace(xregexp("\\p{M}", "g"), "");
}

const numbersToLetters = {'0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't'};

function replaceNumbers(term) {
    let replaced = term;
    for (const key of Object.keys(numbersToLetters)) {
        while (replaced.includes(key))
            replaced = replaced.replace(key, numbersToLetters[key]);
    }
    return replaced;
}

class DBTA {
    constructor(settings) {
        this.client = undefined;
        this.streamer = {
            id: settings.userId,
            name: settings.username
        };
        this.settings = {
            blockedTerms: settings.blockedTerms,
            mode: settings.mode,
            replaceNumbersIntoLetters: settings["1337"],
            checkThroughSpacesAndSymbols: settings.spaces,
            ignoreTrailingCharacters: settings.trailing,
            ignoredCharactersAtStartAndEndOfWords: ['x', 's', '_', '-', '(', ')', '[', ']', '{', '}'],
        }
    }

    takeAction(context, term) {
        connector.createReport({
            userId: context['user-id'],
            username: context.username,
            message: context.message,
            timestamp: Date.now(),
            reporterId: this.streamer.id,
            reporterName: this.streamer.name,
            reporterTerm: term
        })
        if (this.mode === 'ban') {
            this.client.ban(context.channel, context.username, 'Automod caught message: ' + context.message);
            return;
        }
        if (this.mode === 'timeout') {
            this.client.timeout(context.channel, context.username, 60);
            return;
        }
        this.client.deletemessage(context.channel, context.id);
    }

    start() {
        this.client = new tmi.Client({
            options: {debug: false, messagesLogLevel: "info"},
            connection: {
                reconnect: true,
                secure: true
            },
            identity: {
                username: process.env.TWITCH_USER,
                password: process.env.TWITCH_PASS
            },
            channels: [this.streamer.name]
        });

        this.client.connect().catch(console.error);

        this.client.on('message', (channel, context, message, self) => {
            if (self) return;
            context.channel = channel;
            context.message = message;
            // normalize message
            const normalized = normalize(message);

            // split by spaces
            for (const term of normalized.split(' ')) {
                // check if term is blocked
                if (this.isBlocked(term)) {
                    this.takeAction(context, term);
                }
            }

            // if(this.settings.checkThroughSpacesAndSymbols) {
            //
            // }
        });
    }

    stop() {
        this.client.disconnect();
    }

    isBlocked(term) {
        term = term.toLowerCase();
        if (this.settings.blockedTerms.includes(term)) {
            return true;
        }
        if (this.settings.replaceNumbersIntoLetters && this.settings.blockedTerms.includes(replaceNumbers(term))) {
            return true;
        }
        if (this.settings.ignoreTrailingCharacters) {
            // Todo don't remove trailing characters for some blocked terms
            //  (if I want to block SIMP and the user enters SIMPS for instance)
            let replaced = term;
            while (this.settings.ignoredCharactersAtStartAndEndOfWords.includes(replaced.charAt(0))) {
                replaced = replaced.slice(1);
            }
            while (this.settings.ignoredCharactersAtStartAndEndOfWords.includes(replaced.charAt(replaced.length - 1))) {
                replaced = replaced.slice(0, replaced.length - 1);
            }
            if (this.settings.blockedTerms.includes(replaced)) {
                return true;
            }
            if (this.settings.replaceNumbersIntoLetters) {
                if (this.settings.blockedTerms.includes(replaceNumbers(replaced))) {
                    return true;
                }
            }
        }
        return false;
    }

    setMode(mode) {
        this.settings.mode = mode;
    }

    addTerm(term) {
        let normalized = normalize(term).toLowerCase();
        if (!this.settings.blockedTerms.includes(normalized)) {
            this.settings.blockedTerms.push(normalized);
            return normalized;
        }
        return undefined;
    }

    removeTerm(term) {
        let normalized = normalize(term).toLowerCase();
        if (this.settings.blockedTerms.includes(normalized)) {
            this.settings.blockedTerms = this.settings.blockedTerms.filter(el => el !== normalized);
            return normalized;
        }
        return undefined;
    }
}

module.exports = {
    run: async (user) => {
        let instance = new DBTA(user);
        instance.start();
        return instance;
    }
}
