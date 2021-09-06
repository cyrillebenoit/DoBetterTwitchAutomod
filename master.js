var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
require('dotenv').config();
var tmi = require('tmi.js');
var dbta = require('./dbta');
var connector = require('./db-connector');
require('./interfaces/User');
// Login to Twitch as bot
var client = new tmi.Client({
    options: { debug: true, messagesLogLevel: "info" },
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
var instances = {};
function getInstance(context) {
    if (!context['user-id'] || !instances[context['user-id']]) {
        return null;
    }
    return instances[context['user-id']];
}
function addInstance(key, instance) {
    instances[key] = instance;
}
function initializeInstances() {
    connector.getUsers().then(function (users) {
        var _loop_1 = function (user) {
            if (user.watching) {
                dbta.run(user).then(function (i) { return addInstance(user.userId, i); });
            }
        };
        for (var _i = 0, users_1 = users; _i < users_1.length; _i++) {
            var user = users_1[_i];
            _loop_1(user);
        }
    });
}
client.connect().catch(console.error);
connector.connect().then(initializeInstances).catch(console.error);
client.on('message', function (channel, context, message, self) { return __awaiter(_this, void 0, void 0, function () {
    var reply, user, instance, command, term, newTerm, term, removedTerm_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                reply = function (channel, message) {
                    if (context["message-type"] === 'whisper') {
                        client.say('dobettertwitchautomod', message); //TODO replace by client.whisper(channel,msg) once the bot is verified
                    }
                    else {
                        client.say(channel, message);
                    }
                };
                if (self)
                    return [2 /*return*/];
                if (message[0] !== 't') {
                    return [2 /*return*/];
                }
                message = message.slice(1);
                return [4 /*yield*/, connector.ensureUserExists(context['user-id'], context.username)];
            case 1:
                user = _a.sent();
                instance = getInstance(context);
                command = message.split(' ')[0].toLowerCase();
                if (command === '!join' && !user.watching) {
                    reply(channel, "@" + context.username + " DBTA joined your chat");
                    user.watching = true;
                    connector.updateUser(user);
                    dbta.run(user).then(function (i) { return addInstance(user.userId, i); });
                }
                if (command === '!leave' && user.watching) {
                    instance.stop();
                    delete instances[user.userId];
                    user.watching = false;
                    connector.updateUser(user);
                    reply(channel, "@" + context.username + " DBTA left your chat");
                }
                if (command === '!mode') {
                    if (!instance) {
                        reply(channel, "@" + context.username + " DBTA has not joined your chat yet");
                        return [2 /*return*/];
                    }
                    if (message.split(' ').length === 1) {
                        reply(channel, "@" + context.username + " Please choose between the DELETE, TIMEOUT or BAN mode");
                    }
                    else if (message.split(' ')[1].toLowerCase() === 'delete') {
                        instance.setMode('delete');
                        user.mode = 'delete';
                        connector.updateUser(user);
                        reply(channel, "@" + context.username + " DBTA will now delete blocked messages");
                    }
                    else if (message.split(' ')[1].toLowerCase() === 'ban') {
                        instance.setMode('ban');
                        user.mode = 'ban';
                        connector.updateUser(user);
                        reply(channel, "@" + context.username + " DBTA will now ban people who send blocked terms");
                    }
                    else if (message.split(' ')[1].toLowerCase() === 'timeout') {
                        instance.setMode('timeout');
                        user.mode = 'timeout';
                        connector.updateUser(user);
                        reply(channel, "@" + context.username + " DBTA will now timeout people who send blocked terms");
                    }
                    else {
                        reply(channel, "@" + context.username + " Please choose between the DELETE, TIMEOUT or BAN mode");
                    }
                }
                if (command === '!add_term') {
                    term = message.split(' ')[1];
                    if (!term) {
                        return [2 /*return*/];
                    }
                    if (!instance) {
                        reply(channel, "@" + context.username + " DBTA has not joined your chat yet");
                        return [2 /*return*/];
                    }
                    newTerm = instance.addTerm(term);
                    if (newTerm !== undefined) {
                        user.blockedTerms.push(newTerm);
                        connector.updateUser(user);
                    }
                    reply(channel, "@" + context.username + " added blocked term " + (term[0].toUpperCase() + '*'.repeat(term.length - 2) + term[term.length - 1].toUpperCase()));
                }
                if (command === '!remove_term') {
                    term = message.split(' ')[1];
                    if (!term) {
                        return [2 /*return*/];
                    }
                    if (!instance) {
                        reply(channel, "@" + context.username + " DBTA has not joined your chat yet");
                        return [2 /*return*/];
                    }
                    removedTerm_1 = instance.removeTerm(term);
                    if (removedTerm_1 !== undefined) {
                        user.blockedTerms = user.blockedTerms.filter(function (el) { return el !== removedTerm_1; });
                        connector.updateUser(user);
                    }
                    reply(channel, "@" + context.username + " removed blocked term " + (term[0].toUpperCase() + '*'.repeat(term.length - 2) + term[term.length - 1].toUpperCase()));
                }
                if (command === '!leet') {
                    if (!instance) {
                        reply(channel, "@" + context.username + " DBTA has not joined your chat yet");
                        return [2 /*return*/];
                    }
                    user.preferences.leet = !user.preferences.leet;
                    instance.setLeet(user.preferences.leet);
                    connector.updateUser(user);
                    reply(channel, "@" + context.username + " " + (user.preferences.leet ?
                        'Y0u ju$+ 3n4b13d 73rm d3+3c7i0n +hr0ugh 1337 m3554g3$' :
                        'You just disabled term detection through leet messages'));
                }
                if (command === '!include') {
                    if (!instance) {
                        reply(channel, "@" + context.username + " DBTA has not joined your chat yet");
                        return [2 /*return*/];
                    }
                    user.preferences.include = !user.preferences.include;
                    instance.setInclude(user.preferences.include);
                    connector.updateUser(user);
                    reply(channel, "@" + context.username + " " + (user.preferences.include ?
                        'You just _enabled_ xXincludeXx mode for termsssss' :
                        'You just disabled include mode for terms'));
                }
                if (command === '!repeat') {
                    if (!instance) {
                        reply(channel, "@" + context.username + " DBTA has not joined your chat yet");
                        return [2 /*return*/];
                    }
                    user.preferences.repeat = !user.preferences.repeat;
                    instance.setRepeat(user.preferences.repeat);
                    connector.updateUser(user);
                    reply(channel, "@" + context.username + " " + (user.preferences.repeat ?
                        'You just enabled tteerrm dddddetection throoooough reeppeeaattttted characters' :
                        'You just disabled term detection through repeated characters'));
                }
                if (command === '!spaces') {
                    if (!instance) {
                        reply(channel, "@" + context.username + " DBTA has not joined your chat yet");
                        return [2 /*return*/];
                    }
                    user.preferences.spaces = !user.preferences.spaces;
                    instance.setSpaces(user.preferences.spaces);
                    connector.updateUser(user);
                    reply(channel, "@" + context.username + " " + (user.preferences.spaces ?
                        'You just enabled t e r m detection through s p a c e d characters' :
                        'You just disabled term detection through spaced characters'));
                }
                return [2 /*return*/];
        }
    });
}); });
//# sourceMappingURL=master.js.map