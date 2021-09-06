const {createReport} = require('./db-connector');
const {whitelist} = require('./default-list');
const xregexp = require('xregexp');
const {Client} = require('tmi.js');

function normalize(str: string): string {
    return str.normalize("NFKD").replace(xregexp("\\p{M}", "g"), "");
}

const numbersToLetters = {
    '0': 'o',
    '1': 'l',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '$': 's',
    '+': 't',
    '7': 't'
};

function replaceNumbers(term: string): string {
    let replaced = term;
    for (const key of Object.keys(numbersToLetters)) {
        while (replaced.includes(key))
            replaced = replaced.replace(key, numbersToLetters[key]);
    }
    return replaced;
}

class DoBetterTwitchAutomod {
    client: typeof Client;
    streamer: {
        id: string
        name: string
    };
    settings: {
        blockedTerms: string[]
        mode: string
        preferences: {
            include: boolean
            leet: boolean
            repeat: boolean
            spaces: boolean
        }
    };

    constructor(settings: User) {
        this.client = undefined;
        this.streamer = {
            id: settings.userId,
            name: settings.username
        };
        this.settings = {
            blockedTerms: settings.blockedTerms,
            mode: settings.mode,
            preferences: settings.preferences,
        }
    }

    takeAction(context: { [index: string]: any }, term: string): void {
        createReport({
            userId: context['user-id'],
            username: context.username,
            message: context.message,
            timestamp: Date.now(),
            reporterId: this.streamer.id,
            reporterName: this.streamer.name,
            reporterTerm: term
        })
        if (this.settings.mode === 'ban') {
            this.client.ban(context.channel, context.username, 'Automod caught message: ' + context.message);
            return;
        }
        if (this.settings.mode === 'timeout') {
            this.client.timeout(context.channel, context.username, 60);
            return;
        }
        this.client.deletemessage(context.channel, context.id);
    }

    start() {
        this.client = new Client({
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

            // todo check for combined terms

            // split by spaces
            for (const term of normalized.split(' ')) {
                // check if term is blocked
                if (this.isBlocked(term)) {
                    this.takeAction(context, term);
                }
            }

            if (this.settings.preferences.spaces) {
                let block = normalized.replace(/([ _\-*\/\\.,])/g, '');

                this.settings.blockedTerms.forEach(term => {
                    if (block.includes(term)) {
                        this.takeAction(context, term);
                    }
                })
            }
        });
    }

    stop(): void {
        this.client.disconnect();
    }

    isBlocked(term: string): boolean {
        term = term.toLowerCase();
        let includes = this.settings.preferences.include ?
            (blockList: string[], term: string): boolean => {
                if (whitelist.includes(term) && !blockList.includes(term)) {
                    return false;
                }
                for (const t of blockList) {
                    if (term.includes(t)) {
                        return true;
                    }
                }
                return false;
            } : (blockList: string[], term: string): boolean => {
                return blockList.includes(term)
            };

        if (includes(this.settings.blockedTerms, term)) {
            return true;
        }
        return !!(this.settings.preferences.leet && includes(this.settings.blockedTerms, replaceNumbers(term)));
    }

    setMode(mode: string): void {
        this.settings.mode = mode;
    }

    addTerm(term: string): string {
        let normalized = normalize(term).toLowerCase();
        if (!this.settings.blockedTerms.includes(normalized)) {
            this.settings.blockedTerms.push(normalized);
            return normalized;
        }
        return undefined;
    }

    removeTerm(term: string): string {
        let normalized = normalize(term).toLowerCase();
        if (this.settings.blockedTerms.includes(normalized)) {
            this.settings.blockedTerms = this.settings.blockedTerms.filter(el => el !== normalized);
            return normalized;
        }
        return undefined;
    }

    setInclude(include: boolean): void {
        this.settings.preferences.include = include;
    }

    setLeet(leet: boolean): void {
        this.settings.preferences.leet = leet;
    }

    setSpaces(spaces: boolean): void {
        this.settings.preferences.spaces = spaces;
    }

    setRepeat(repeat: boolean): void {
        this.settings.preferences.repeat = repeat;
    }
}

module.exports = {
    run: async (user: User): Promise<DoBetterTwitchAutomod> => {
        let instance = new DoBetterTwitchAutomod(user);
        instance.start();
        return instance;
    }
}
