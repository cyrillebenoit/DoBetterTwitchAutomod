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
var createReport = require('./db-connector').createReport;
var whitelist = require('./default-list').whitelist;
var xregexp = require('xregexp');
var Client = require('tmi.js').Client;
function normalize(str) {
    return str.normalize("NFKD").replace(xregexp("\\p{M}", "g"), "");
}
var numbersToLetters = {
    '0': 'o',
    '1': 'l',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '$': 's',
    '+': 't',
    '7': 't'
};
function replaceNumbers(term) {
    var replaced = term;
    for (var _i = 0, _a = Object.keys(numbersToLetters); _i < _a.length; _i++) {
        var key = _a[_i];
        while (replaced.includes(key))
            replaced = replaced.replace(key, numbersToLetters[key]);
    }
    return replaced;
}
var DoBetterTwitchAutomod = /** @class */ (function () {
    function DoBetterTwitchAutomod(settings) {
        this.client = undefined;
        this.streamer = {
            id: settings.userId,
            name: settings.username
        };
        this.settings = {
            blockedTerms: settings.blockedTerms,
            mode: settings.mode,
            preferences: settings.preferences,
        };
    }
    DoBetterTwitchAutomod.prototype.takeAction = function (context, term) {
        createReport({
            userId: context['user-id'],
            username: context.username,
            message: context.message,
            timestamp: Date.now(),
            reporterId: this.streamer.id,
            reporterName: this.streamer.name,
            reporterTerm: term
        });
        if (this.settings.mode === 'ban') {
            this.client.ban(context.channel, context.username, 'Automod caught message: ' + context.message);
            return;
        }
        if (this.settings.mode === 'timeout') {
            this.client.timeout(context.channel, context.username, 60);
            return;
        }
        this.client.deletemessage(context.channel, context.id);
    };
    DoBetterTwitchAutomod.prototype.start = function () {
        var _this = this;
        this.client = new Client({
            options: { debug: false, messagesLogLevel: "info" },
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
        this.client.on('message', function (channel, context, message, self) {
            if (self)
                return;
            context.channel = channel;
            context.message = message;
            // normalize message
            var normalized = normalize(message);
            // todo check for combined terms
            // split by spaces
            for (var _i = 0, _a = normalized.split(' '); _i < _a.length; _i++) {
                var term = _a[_i];
                // check if term is blocked
                if (_this.isBlocked(term)) {
                    _this.takeAction(context, term);
                    return;
                }
            }
            if (_this.settings.preferences.spaces) {
                var block_1 = normalized.replace(/([ _\-*\/\\.,])/g, '');
                _this.settings.blockedTerms.forEach(function (term) {
                    if (block_1.includes(term)) {
                        _this.takeAction(context, term);
                        return;
                    }
                });
            }
        });
    };
    DoBetterTwitchAutomod.prototype.stop = function () {
        this.client.disconnect();
    };
    DoBetterTwitchAutomod.prototype.isBlocked = function (term) {
        term = term.toLowerCase();
        var includes = this.settings.preferences.include ?
            function (blockList, term) {
                if (whitelist.includes(term) && !blockList.includes(term)) {
                    return false;
                }
                for (var _i = 0, blockList_1 = blockList; _i < blockList_1.length; _i++) {
                    var t = blockList_1[_i];
                    if (term.includes(t)) {
                        return true;
                    }
                }
                return false;
            } : function (blockList, term) {
            return blockList.includes(term);
        };
        if (includes(this.settings.blockedTerms, term)) {
            return true;
        }
        return !!(this.settings.preferences.leet && includes(this.settings.blockedTerms, replaceNumbers(term)));
    };
    DoBetterTwitchAutomod.prototype.setMode = function (mode) {
        this.settings.mode = mode;
    };
    DoBetterTwitchAutomod.prototype.addTerm = function (term) {
        var normalized = normalize(term).toLowerCase();
        if (!this.settings.blockedTerms.includes(normalized)) {
            this.settings.blockedTerms.push(normalized);
            return normalized;
        }
        return undefined;
    };
    DoBetterTwitchAutomod.prototype.removeTerm = function (term) {
        var normalized = normalize(term).toLowerCase();
        if (this.settings.blockedTerms.includes(normalized)) {
            this.settings.blockedTerms = this.settings.blockedTerms.filter(function (el) { return el !== normalized; });
            return normalized;
        }
        return undefined;
    };
    DoBetterTwitchAutomod.prototype.setInclude = function (include) {
        this.settings.preferences.include = include;
    };
    DoBetterTwitchAutomod.prototype.setLeet = function (leet) {
        this.settings.preferences.leet = leet;
    };
    DoBetterTwitchAutomod.prototype.setSpaces = function (spaces) {
        this.settings.preferences.spaces = spaces;
    };
    DoBetterTwitchAutomod.prototype.setRepeat = function (repeat) {
        this.settings.preferences.repeat = repeat;
    };
    return DoBetterTwitchAutomod;
}());
module.exports = {
    run: function (user) { return __awaiter(_this, void 0, void 0, function () {
        var instance;
        return __generator(this, function (_a) {
            instance = new DoBetterTwitchAutomod(user);
            instance.start();
            return [2 /*return*/, instance];
        });
    }); }
};
//# sourceMappingURL=dbta.js.map